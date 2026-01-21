import Anthropic from '@anthropic-ai/sdk';
import { BrowserWindow } from 'electron';

import { FileSystemTools, ReadFileSchema, WriteFileSchema, ListDirSchema, RunCommandSchema } from './tools/FileSystemTools.js';
import { SkillManager } from './skills/SkillManager.js';
import { MCPClientService } from './mcp/MCPClientService.js';
import { permissionManager } from './security/PermissionManager.js';
import { configStore } from '../config/ConfigStore.js';
import { notificationService } from '../services/NotificationService.js';
import { promptInjectionDefense } from '../security/PromptInjectionDefense.js';
import { dlp } from '../data-loss-prevention/DataLossPrevention.js';
import { CommandRegistry, SlashCommandParser, ShortcutManager } from './commands/index.js';
import os from 'os';


export type AgentMessage = {
    role: 'user' | 'assistant';
    content: string | Anthropic.ContentBlock[];
    id?: string;
};

export class AgentRuntime {
    private anthropic: Anthropic;
    private history: Anthropic.MessageParam[] = [];
    private windows: BrowserWindow[] = [];
    private fsTools: FileSystemTools;
    private skillManager: SkillManager;
    private mcpService: MCPClientService;
    private abortController: AbortController | null = null;
    private isProcessing = false;
    private pendingConfirmations: Map<string, { resolve: (approved: boolean) => void }> = new Map();
    private artifacts: { path: string; name: string; type: string }[] = [];

    private model: string;

    // 命令系统
    public commandRegistry: CommandRegistry;
    public slashParser: SlashCommandParser;
    public shortcutManager: ShortcutManager;

    constructor(apiKey: string, window: BrowserWindow, model: string = 'claude-3-5-sonnet-20241022', apiUrl: string = 'https://api.anthropic.com') {
        this.anthropic = new Anthropic({ apiKey, baseURL: apiUrl });
        this.model = model;
        this.windows = [window];
        this.fsTools = new FileSystemTools();
        this.skillManager = new SkillManager();
        this.mcpService = new MCPClientService();

        // 初始化命令系统
        this.commandRegistry = new CommandRegistry(this);
        this.slashParser = new SlashCommandParser(this.commandRegistry);
        this.shortcutManager = new ShortcutManager(window, this.commandRegistry);

        // Note: IPC handlers are now registered in main.ts, not here
    }

    // Add a window to receive updates (for floating ball)
    public addWindow(win: BrowserWindow) {
        if (!this.windows.includes(win)) {
            this.windows.push(win);
        }
    }

    public async initialize() {
        console.log('Initializing AgentRuntime...');
        try {
            await this.skillManager.loadSkills();
            await this.mcpService.loadClients();

            // 初始化命令系统
            await this.initializeCommands();

            console.log('AgentRuntime initialized (Skills & MCP & Commands loaded)');
        } catch (error) {
            console.error('Failed to initialize AgentRuntime:', error);
        }
    }

    /**
     * 初始化命令系统
     */
    private async initializeCommands() {
        console.log('[CommandSystem] Initializing commands...');

        // 1. 从技能注册命令
        const tools = this.skillManager.getTools();
        // 将 Anthropic.Tool 格式转换为技能定义格式
        const skillDefinitions = Array.isArray(tools) ? tools : [];

        this.commandRegistry.registerFromSkills(skillDefinitions as any);

        // 2. 从MCP工具注册命令
        const mcpTools = await this.mcpService.getTools();
        this.commandRegistry.registerFromMCPTools(mcpTools);

        // 3. 注册系统命令
        this.commandRegistry.registerSystemCommands();

        // 4. 注册快捷键
        // 命令面板快捷键
        this.shortcutManager.register({
            id: 'command-palette',
            accelerator: 'Ctrl+Shift+P',
            action: () => {
                console.log('[CommandSystem] Opening command palette');
                this.broadcast('command-palette:toggle');
            },
            description: '打开命令面板'
        });

        // 从命令注册表加载所有快捷键
        const commands = this.commandRegistry.getAll();
        this.shortcutManager.registerFromCommands(commands);

        console.log(`[CommandSystem] Initialized ${this.commandRegistry.getAll().length} commands`);
        console.log(`[CommandSystem] Registered ${this.shortcutManager.getAllBindings().length} shortcuts`);
    }

    public removeWindow(win: BrowserWindow) {
        this.windows = this.windows.filter(w => w !== win);
    }

    // Handle confirmation response
    public handleConfirmResponse(id: string, approved: boolean) {
        const pending = this.pendingConfirmations.get(id);
        if (pending) {
            pending.resolve(approved);
            this.pendingConfirmations.delete(id);
        }
    }

    // Clear history for new session
    public clearHistory() {
        this.history = [];
        this.artifacts = [];
        this.notifyUpdate();
    }

    // Load history from saved session
    public loadHistory(messages: Anthropic.MessageParam[]) {
        this.history = messages;
        this.artifacts = [];
        this.notifyUpdate();
    }

    public async processUserMessage(input: string | { content: string, images: string[] }) {
        if (this.isProcessing) {
            throw new Error('Agent is already processing a message');
        }

        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            await this.skillManager.loadSkills();
            await this.mcpService.loadClients();

            let userContent: string | Anthropic.ContentBlockParam[] = '';

            if (typeof input === 'string') {
                // 🔒 安全检查：提示词注入检测
                const detection = promptInjectionDefense.detectInjection(input);

                if (detection.isInjection) {
                    // 广播安全警告到所有窗口
                    this.broadcast('agent:security-warning', {
                        confidence: detection.confidence,
                        reasons: detection.reasons,
                        matchedPatterns: detection.matchedPatterns
                    });

                    // 如果置信度超过 0.8，拒绝处理
                    if (detection.confidence > 0.8) {
                        const warning = promptInjectionDefense.generateWarning(detection);
                        this.broadcast('agent:error', '⚠️ 检测到高危安全威胁，已拒绝处理该请求');
                        console.error('[Security] Prompt injection blocked:', detection);
                        throw new Error(warning);
                    }

                    // 中低危攻击：清理后继续处理
                    console.warn('[Security] Prompt injection detected and sanitized:', detection);
                    userContent = promptInjectionDefense.sanitize(input);
                } else {
                    userContent = input;
                }
            } else {
                const blocks: Anthropic.ContentBlockParam[] = [];
                // Process images
                if (input.images && input.images.length > 0) {
                    for (const img of input.images) {
                        // format: data:image/png;base64,......
                        const match = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
                        if (match) {
                            blocks.push({
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                                    data: match[2]
                                }
                            });
                        }
                    }
                }
                // Add text with security check
                if (input.content && input.content.trim()) {
                    // 🔒 安全检查：提示词注入检测
                    const detection = promptInjectionDefense.detectInjection(input.content);

                    if (detection.isInjection) {
                        // 广播安全警告到所有窗口
                        this.broadcast('agent:security-warning', {
                            confidence: detection.confidence,
                            reasons: detection.reasons,
                            matchedPatterns: detection.matchedPatterns
                        });

                        // 如果置信度超过 0.8，拒绝处理
                        if (detection.confidence > 0.8) {
                            const warning = promptInjectionDefense.generateWarning(detection);
                            this.broadcast('agent:error', '⚠️ 检测到高危安全威胁，已拒绝处理该请求');
                            console.error('[Security] Prompt injection blocked:', detection);
                            throw new Error(warning);
                        }

                        // 中低危攻击：清理后继续处理
                        console.warn('[Security] Prompt injection detected and sanitized:', detection);
                        blocks.push({ type: 'text', text: promptInjectionDefense.sanitize(input.content) });
                    } else {
                        blocks.push({ type: 'text', text: input.content });
                    }
                } else if (blocks.some(b => b.type === 'image')) {
                    // [Fix] If only images are present, add a default prompt to satisfy API requirements
                    blocks.push({ type: 'text', text: "Please analyze this image." });
                }
                userContent = blocks;
            }

            // Add user message to history
            this.history.push({ role: 'user', content: userContent });

            // 添加意图检测日志
            if (typeof userContent === 'string') {
                console.log('[IntentDetection] User input:', userContent);
                console.log('[IntentDetection] Detected skills:', this.detectRelevantSkills(userContent));
            }

            this.notifyUpdate();

            // Start the agent loop
            await this.runLoop();

        } catch (error: unknown) {
            const err = error as { status?: number; message?: string };
            console.error('Agent Loop Error:', error);

            // [Fix] Handle MiniMax/provider sensitive content errors gracefully
            if (err.status === 500 && (err.message?.includes('sensitive') || JSON.stringify(error).includes('1027'))) {
                this.broadcast('agent:error', 'AI Provider Error: The generated content was flagged as sensitive and blocked by the provider.');
            } else {
                const errorMessage = err.message || 'An unknown error occurred';
                this.broadcast('agent:error', errorMessage);
                notificationService.sendErrorNotification(errorMessage);
            }
        } finally {
            this.isProcessing = false;
            this.abortController = null;
            this.notifyUpdate();

            // Notify frontend that processing is complete
            this.broadcast('agent:complete', this.history);

            // Send work complete notification
            if (this.history.length > 0) {
                const lastUserMessage = this.history.find(msg => msg.role === 'user');
                if (lastUserMessage) {
                    let taskType = '任务';
                    const content = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : '';
                    
                    // Determine task type based on content
                    if (content.includes('标题')) {
                        taskType = '标题生成';
                    } else if (content.includes('写作') || content.includes('写')) {
                        taskType = '文章写作';
                    } else if (content.includes('排版')) {
                        taskType = '文章排版';
                    } else if (content.includes('选题')) {
                        taskType = '热门选题';
                    } else if (content.includes('数据')) {
                        taskType = '数据分析';
                    }
                    
                    notificationService.sendWorkCompleteNotification(taskType);
                }
            }
        }
    }

    private async runLoop() {
        let keepGoing = true;
        let iterationCount = 0;
        const MAX_ITERATIONS = 30;

        while (keepGoing && iterationCount < MAX_ITERATIONS) {
            iterationCount++;
            console.log(`[AgentRuntime] Loop iteration: ${iterationCount}`);
            if (this.abortController?.signal.aborted) break;

            const tools: Anthropic.Tool[] = [
                ReadFileSchema,
                WriteFileSchema,
                ListDirSchema,
                RunCommandSchema,
                ...(this.skillManager.getTools() as Anthropic.Tool[]),
                ...(await this.mcpService.getTools() as Anthropic.Tool[])
            ];

            // 添加调试日志：显示可用工具列表
            console.log('[AgentRuntime] Available tools:', tools.map(t => ({
                name: t.name,
                description: t.description?.substring(0, 60) + '...'
            })));

            // Build working directory context
            const authorizedFolders = permissionManager.getAuthorizedFolders();
            const workingDirContext = authorizedFolders.length > 0
                ? `\n\nWORKING DIRECTORY:\n- Primary: ${authorizedFolders[0]}\n- All authorized: ${authorizedFolders.join(', ')}\n\nYou should primarily work within these directories. Always use absolute paths.`
                : '\n\nNote: No working directory has been selected yet. Ask the user to select a folder first.';

            const skillsDir = os.homedir() + '/.aiagent/skills';
            const systemPrompt = `You are AI Agent Desktop, a versatile AI assistant designed to help users accomplish a wide variety of tasks through tool usage and skill execution.

## YOUR IDENTITY
You are a helpful AI assistant with access to:
- File system operations (read, write, list directories)
- Command execution (shell commands, scripts)
- Custom skills (user-defined capabilities)
- MCP (Model Context Protocol) servers for external tools

Your goal is to help users be productive by automating tasks, analyzing data, creating content, and solving problems efficiently.

## YOUR CAPABILITIES
- **File Operations**: Read, write, create, and organize files
- **Command Execution**: Run shell commands, Python scripts, and other executables
- **Content Creation**: Writing assistance, document generation, code snippets
- **Data Analysis**: Parse and analyze data files, generate insights
- **Web Access**: Through MCP servers, fetch web pages, search, and access APIs
- **Custom Skills**: Execute user-defined skills for specialized tasks

## WORKFLOW APPROACH
1. **Understand** the user's goal
2. **Plan** your approach (use <plan> block for complex tasks)
3. **Execute** step-by-step using available tools and skills
4. **Verify** results before completing
5. **Report** outcomes clearly

## TOOL USAGE BEST PRACTICES
- Use existing skills when available (check loaded skills first)
- For file operations: use 'read_file', 'write_file', 'list_dir'
- For commands: use 'run_command' with proper working directory
- Always use absolute paths for file operations
- Confirm before destructive operations (deletions, overwrites)
- Provide progress updates for long-running operations

## SKILLS SYSTEM
- Skills are loaded from: ${skillsDir}
- Skills contain pre-built implementations - prefer skills over writing new code
- When a skill is invoked, follow its instructions precisely
- You can combine multiple skills to accomplish complex tasks

## MCP INTEGRATION
- MCP servers provide external tools and capabilities
- MCP tools are prefixed with server name (e.g., 'filesystem:read_file')
- Available MCP tools are loaded dynamically based on user configuration

## PLANNING FOR COMPLEX TASKS
For multi-step tasks, ALWAYS start with a plan:

<plan>
  <task>Analyze requirements</task>
  <task>Design approach</task>
  <task>Implement solution</task>
  <task>Test and verify</task>
</plan>

Update the plan as you progress: mark completed tasks with [x], pending with [ ]

## RESPONSE GUIDELINES
- Be clear and concise
- Show progress for long operations
- Explain what you're doing and why
- Provide file paths when creating/modifying files
- Highlight important results or findings
- Ask for clarification when requirements are unclear

${workingDirContext}

## IMPORTANT REMINDERS
- Skills have pre-built implementations - use them!
- When using skills, execute existing scripts with absolute paths
- Do not create new Python scripts in the working directory unless explicitly asked
- Provide specific, actionable responses
- Always consider the user's authorized directory limitations

You are a capable and helpful AI assistant. Help users accomplish their goals efficiently and safely.`;

            console.log('Sending request to API...');
            console.log('Model:', this.model);
            console.log('Base URL:', this.anthropic.baseURL);

            try {
                const stream = await this.anthropic.messages.create({
                    model: this.model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: this.history,
                    stream: true,
                    tools: tools
                });

                const finalContent: Anthropic.ContentBlock[] = [];
                let currentToolUse: { id: string; name: string; input: string } | null = null;
                let textBuffer = "";

                for await (const chunk of stream) {
                    if (this.abortController?.signal.aborted) {
                        stream.controller.abort();
                        break;
                    }

                    switch (chunk.type) {
                        case 'content_block_start':
                            if (chunk.content_block.type === 'tool_use') {
                                if (textBuffer) {
                                    finalContent.push({ type: 'text', text: textBuffer, citations: null });
                                    textBuffer = "";
                                }
                                currentToolUse = { ...chunk.content_block, input: "" };
                            }
                            break;
                        case 'content_block_delta':
                            if (chunk.delta.type === 'text_delta') {
                                // 🔒 安全检查：DLP 数据泄露防护
                                const { filtered, hasSensitiveData } = dlp.filterAIOutput(chunk.delta.text)

                                if (hasSensitiveData) {
                                    // 广播隐私警告
                                    this.broadcast('agent:privacy-warning', {
                                        message: 'AI 输出中包含敏感信息，已自动过滤以保护隐私',
                                        timestamp: Date.now()
                                    })
                                }

                                textBuffer += filtered;
                                // Broadcast streaming token to ALL windows
                                this.broadcast('agent:stream-token', filtered);
                            } else if (chunk.delta.type === 'input_json_delta' && currentToolUse) {
                                currentToolUse.input += chunk.delta.partial_json;
                            }
                            break;
                        case 'content_block_stop':
                            if (currentToolUse) {
                                try {
                                    const parsedInput = JSON.parse(currentToolUse.input);
                                    finalContent.push({
                                        type: 'tool_use',
                                        id: currentToolUse.id,
                                        name: currentToolUse.name,
                                        input: parsedInput
                                    });
                                } catch (e) {
                                    console.error("Failed to parse tool input", e);
                                    // Treat as a failed tool use so the model knows it messed up
                                    finalContent.push({
                                        type: 'tool_use',
                                        id: currentToolUse.id,
                                        name: currentToolUse.name,
                                        input: { error: "Invalid JSON input", raw: currentToolUse.input }
                                    });
                                }
                                currentToolUse = null;
                            }
                            break;
                        case 'message_stop':
                            if (textBuffer) {
                                finalContent.push({ type: 'text', text: textBuffer, citations: null });
                            }
                            break;
                    }
                }

                if (this.abortController?.signal.aborted) return;

                if (finalContent.length > 0) {
                    const assistantMsg: Anthropic.MessageParam = { role: 'assistant', content: finalContent };
                    this.history.push(assistantMsg);
                    this.notifyUpdate();

                    const toolUses = finalContent.filter(c => c.type === 'tool_use');
                    if (toolUses.length > 0) {
                        const toolResults: Anthropic.ToolResultBlockParam[] = [];
                        for (const toolUse of toolUses) {
                            if (toolUse.type !== 'tool_use') continue;

                            console.log(`Executing tool: ${toolUse.name}`);
                            let result = "Tool execution failed or unknown tool.";

                            try {
                                if (toolUse.name === 'read_file') {
                                    const args = toolUse.input as { path: string };
                                    if (!permissionManager.isPathAuthorized(args.path)) {
                                        result = `Error: Path ${args.path} is not in an authorized folder.`;
                                    } else {
                                        result = await this.fsTools.readFile(args);
                                    }
                                } else if (toolUse.name === 'write_file') {
                                    const args = toolUse.input as { path: string, content: string };
                                    if (!permissionManager.isPathAuthorized(args.path)) {
                                        result = `Error: Path ${args.path} is not in an authorized folder.`;
                                    } else {
                                        const approved = await this.requestConfirmation(toolUse.name, `Write to file: ${args.path}`, args);
                                        if (approved) {
                                            result = await this.fsTools.writeFile(args);
                                            const fileName = args.path.split(/[\\/]/).pop() || 'file';
                                            this.artifacts.push({ path: args.path, name: fileName, type: 'file' });
                                            this.broadcast('agent:artifact-created', { path: args.path, name: fileName, type: 'file' });
                                        } else {
                                            result = 'User denied the write operation.';
                                        }
                                    }
                                } else if (toolUse.name === 'list_dir') {
                                    const args = toolUse.input as { path: string };
                                    if (!permissionManager.isPathAuthorized(args.path)) {
                                        result = `Error: Path ${args.path} is not in an authorized folder.`;
                                    } else {
                                        result = await this.fsTools.listDir(args);
                                    }
                                } else if (toolUse.name === 'run_command') {
                                    const args = toolUse.input as { command: string, cwd?: string };
                                    const defaultCwd = authorizedFolders[0] || process.cwd();

                                    // Require confirmation for command execution
                                    const approved = await this.requestConfirmation(toolUse.name, `Execute command: ${args.command}`, args);
                                    if (approved) {
                                        result = await this.fsTools.runCommand(args, defaultCwd);
                                    } else {
                                        result = 'User denied the command execution.';
                                    }
                                } else {
                                    const skillInfo = await this.skillManager.getSkillInfo(toolUse.name);
                                    console.log(`[Runtime] Skill ${toolUse.name} info found? ${!!skillInfo} (len: ${skillInfo?.instructions?.length})`);
                                    if (skillInfo) {
                                        // Return skill content following official Claude Code Skills pattern
                                        // The model should directly execute existing scripts using absolute paths
                                        result = `[SKILL LOADED: ${toolUse.name}]

SKILL DIRECTORY: ${skillInfo.skillDir}

Follow these instructions to complete the user's request. Use absolute paths when executing scripts:

run_command: python "${skillInfo.skillDir}/scripts/script_name.py" [args]

IMPORTANT: Do not create new Python scripts in the working directory. Always use the existing scripts in the skill directory.

---
${skillInfo.instructions}
---`;
                                    } else if (toolUse.name.includes('__')) {
                                        result = await this.mcpService.callTool(toolUse.name, toolUse.input as Record<string, unknown>);
                                    }
                                }
                                // Check if input has parse error
                                const inputObj = toolUse.input as Record<string, unknown>;
                                if (inputObj && inputObj.error === "Invalid JSON input") {
                                    result = `Error: The tool input was not valid JSON. Please fix the JSON format and retry. Raw input: ${inputObj.raw}`;
                                }
                            } catch (toolErr: unknown) {
                                result = `Error executing tool: ${(toolErr as Error).message}`;
                            }

                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: toolUse.id,
                                content: result
                            });
                        }

                        this.history.push({ role: 'user', content: toolResults });
                        this.notifyUpdate();
                    } else {
                        keepGoing = false;
                    }
                } else {
                    keepGoing = false;
                }

            } catch (loopError: unknown) {
                const loopErr = loopError as { status?: number; message?: string };
                console.error("Agent Loop detailed error:", loopError);

                // Handle Sensitive Content Error (1027)
                if (loopErr.status === 500 && (loopErr.message?.includes('sensitive') || JSON.stringify(loopError).includes('1027'))) {
                    console.log("Caught sensitive content error, asking Agent to retry...");

                    // Add a system-like user message to prompt the agent to fix its output
                    this.history.push({
                        role: 'user',
                        content: `[SYSTEM ERROR] Your previous response was blocked by the safety filter (Error Code 1027: output new_sensitive). \n\nThis usually means the generated content contained sensitive, restricted, or unsafe material.\n\nPlease generate a NEW response that:\n1. Addresses the user's request safely.\n2. Avoids the sensitive topic or phrasing that triggered the block.\n3. Acknowledges the issue briefly if necessary.`
                    });
                    this.notifyUpdate();

                    // Allow the loop to continue to the next iteration
                    continue;
                } else {
                    // Re-throw other errors to be caught effectively by the outer handler
                    throw loopError;
                }
            }
        }
    }

    // Broadcast to all windows
    private broadcast(channel: string, data: unknown) {
        for (const win of this.windows) {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, data);
            }
        }
    }

    private notifyUpdate() {
        this.broadcast('agent:history-update', this.history);
    }

    private async requestConfirmation(tool: string, description: string, args: Record<string, unknown>): Promise<boolean> {
        // Extract path from args if available
        const path = (args?.path || args?.cwd) as string | undefined;

        // Check if permission is already granted
        if (configStore.hasPermission(tool, path)) {
            console.log(`[AgentRuntime] Auto-approved ${tool} (saved permission)`);
            return true;
        }

        // Send notification about permission request
        notificationService.sendInfoNotification(
            '牛马需要权限',
            `需要您确认${this.getPermissionDescription(tool)}权限才能继续工作`
        );

        const id = `confirm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        return new Promise((resolve) => {
            this.pendingConfirmations.set(id, { resolve });
            this.broadcast('agent:confirm-request', { id, tool, description, args });
        });
    }

    // Helper method to get permission description
    private getPermissionDescription(tool: string): string {
        const descriptions: Record<string, string> = {
            'write_file': '写入文件',
            'run_command': '执行命令',
            'read_file': '读取文件',
            'list_dir': '查看目录'
        };
        return descriptions[tool] || tool;
    }

    // Helper method to detect relevant skills based on user input
    private detectRelevantSkills(input: string): string[] {
        const relevant: string[] = [];
        const lowerInput = input.toLowerCase();

        // 简单关键词匹配
        if (lowerInput.includes('图') || lowerInput.includes('画') || lowerInput.includes('配图') ||
            lowerInput.includes('生图') || lowerInput.includes('插图') || lowerInput.includes('封面')) {
            relevant.push('image-generation', 'article-illustrator');
        }
        if (lowerInput.includes('标题') || lowerInput.includes('title')) {
            relevant.push('title-generator');
        }
        if (lowerInput.includes('文章') && (lowerInput.includes('配图') || lowerInput.includes('插图'))) {
            relevant.push('article-illustrator');
        }

        return relevant;
    }

    public handleConfirmResponseWithRemember(id: string, approved: boolean, remember: boolean): void {
        const pending = this.pendingConfirmations.get(id);
        if (pending) {
            if (approved && remember) {
                // Extract tool and path from the confirmation request
                // The tool name is in the id or we need to pass it
                // For now we'll extract from the most recent confirm request
            }
            pending.resolve(approved);
            this.pendingConfirmations.delete(id);
        }
    }

    public abort() {
        this.abortController?.abort();
    }
}
