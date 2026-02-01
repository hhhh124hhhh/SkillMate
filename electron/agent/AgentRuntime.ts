import Anthropic from '@anthropic-ai/sdk';
import { app, BrowserWindow } from 'electron';
import log from 'electron-log';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { FileSystemTools, ReadFileSchema, WriteFileSchema, ListDirSchema, RunCommandSchema, setAgentRuntime } from './tools/FileSystemTools.js';
import { SkillManager } from './skills/SkillManager.js';
import { MCPClientService } from './mcp/MCPClientService.js';
import { permissionManager } from './security/PermissionManager.js';
import { configStore } from '../config/ConfigStore.js';
import { notificationService } from '../services/NotificationService.js';
import { ImageCompressionService } from '../services/ImageCompressionService.js';
import { promptInjectionDefense } from '../security/PromptInjectionDefense.js';
import { dlp } from '../data-loss-prevention/DataLossPrevention.js';
import { CommandRegistry, SlashCommandParser, ShortcutManager, MCPToolEnhanced } from './commands/index.js';
import { ParsedCommand, CommandType, CommandDefinition } from './commands/types.js';
import { pythonErrorTranslator } from './PythonErrorTranslator.js';


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
    private artifacts: { path: string; name: string; type: string }[] = [];
    private hasShownImageTip = false;  // 图片配置提示标志
    private imageCompressionService: ImageCompressionService;  // 图片压缩服务
    private lastDoubaoAnalysis?: string;  // 豆包分析结果（注入到系统提示）

    private model: string;

    // Slash Command 处理状态
    private modifiedInput: string | undefined = undefined;

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
        this.imageCompressionService = new ImageCompressionService();  // 初始化图片压缩服务

        // 初始化命令系统
        this.commandRegistry = new CommandRegistry(this);
        this.slashParser = new SlashCommandParser(this.commandRegistry);
        this.shortcutManager = new ShortcutManager(window, this.commandRegistry);

        // 设置 AgentRuntime 实例到 FileSystemTools（用于删除确认）
        setAgentRuntime(this);

        // Note: IPC handlers are now registered in main.ts, not here
    }

    // Add a window to receive updates (for floating ball)
    public addWindow(win: BrowserWindow) {
        if (!this.windows.includes(win)) {
            this.windows.push(win);
        }
    }

    // Public getter for skillManager
    public getSkillManager(): SkillManager {
        return this.skillManager;
    }

    // Public getter for mcpService
    public getMCPService(): MCPClientService {
        return this.mcpService;
    }

    public async initialize() {
        log.log('[AgentRuntime] =======================================');
        log.log('[AgentRuntime] Starting AgentRuntime initialization...');
        log.log('[AgentRuntime] =======================================');
        const startTime = Date.now();
        try {
            // 1. 加载技能
            log.log('[AgentRuntime] Step 1/3: Loading skills...');
            await this.skillManager.loadSkills();
            const skillCount = this.skillManager.getTools().length;
            log.log(`[AgentRuntime] ✓ Loaded ${skillCount} skills`);

            // 2. 加载 MCP 客户端
            log.log('[AgentRuntime] Step 2/3: Loading MCP clients...');
            await this.mcpService.loadClients();
            const mcpTools = await this.mcpService.getTools();
            log.log(`[AgentRuntime] ✓ Loaded ${mcpTools.length} MCP tools`);

            // 3. 初始化命令系统
            log.log('[AgentRuntime] Step 3/3: Initializing command system...');
            try {
                await this.initializeCommands();
                const commandCount = this.commandRegistry.getAll().length;
                log.log(`[AgentRuntime] ✓ Command system ready with ${commandCount} commands`);
            } catch (cmdError) {
                log.error('[AgentRuntime] ✗ Failed to initialize command system:', cmdError);
                log.error('[AgentRuntime] Error stack:', (cmdError as Error).stack);
                // 继续运行，命令系统是可选的
            }

            const elapsed = Date.now() - startTime;
            log.log(`[AgentRuntime] =======================================`);
            log.log(`[AgentRuntime] ✓ Initialization completed in ${elapsed}ms`);
            log.log(`[AgentRuntime] - Skills: ${skillCount}`);
            log.log(`[AgentRuntime] - MCP Tools: ${mcpTools.length}`);
            log.log(`[AgentRuntime] - Total Commands: ${this.commandRegistry.getAll().length}`);
            log.log(`[AgentRuntime] =======================================`);
        } catch (error) {
            log.error('[AgentRuntime] ✗ Failed to initialize AgentRuntime:', error);
        }
    }

    /**
     * 初始化命令系统
     */
    private async initializeCommands() {
        log.log('[CommandSystem] =======================================');
        log.log('[CommandSystem] Initializing command system...');

        // 1. 从技能注册命令
        log.log('[CommandSystem] Registering skill commands...');
        const tools = this.skillManager.getTools();
        // 将 Anthropic.Tool 格式转换为技能定义格式
        const skillDefinitions = Array.isArray(tools) ? tools : [];
        this.commandRegistry.registerFromSkills(skillDefinitions as any);
        log.log(`[CommandSystem] ✓ Registered ${skillDefinitions.length} skill commands`);

        // 2. 从MCP工具注册命令
        log.log('[CommandSystem] Registering MCP tool commands...');
        const mcpTools = await this.mcpService.getTools();
        const mcpToolsWithServer = mcpTools
          .filter(tool => tool.description !== undefined)
          .map(tool => ({
            ...tool,
            serverName: 'mcp'
          })) as MCPToolEnhanced[];
        this.commandRegistry.registerFromMCPTools(mcpToolsWithServer);
        log.log(`[CommandSystem] ✓ Registered ${mcpToolsWithServer.length} MCP tool commands`);

        // 3. 注册系统命令
        log.log('[CommandSystem] Registering system commands...');
        this.commandRegistry.registerSystemCommands();
        log.log('[CommandSystem] ✓ Registered system commands');

        // 4. 注册快捷键
        log.log('[CommandSystem] Registering shortcuts...');
        // 命令面板快捷键
        this.shortcutManager.register({
            id: 'command-palette',
            accelerator: 'Ctrl+Shift+P',
            action: () => {
                log.log('[CommandSystem] Opening command palette');
                this.broadcast('command-palette:toggle', {});
            },
            description: '打开命令面板'
        });

        // 从命令注册表加载所有快捷键
        const commands = this.commandRegistry.getAll();
        this.shortcutManager.registerFromCommands(commands);

        const totalCommands = this.commandRegistry.getAll().length;
        const totalShortcuts = this.shortcutManager.getAllBindings().length;
        log.log(`[CommandSystem] ✓ Registered ${totalShortcuts} shortcuts`);
        log.log(`[CommandSystem] =======================================`);
        log.log(`[CommandSystem] ✓ Total commands: ${totalCommands}`);
        log.log(`[CommandSystem]   - Skills: ${skillDefinitions.length}`);
        log.log(`[CommandSystem]   - MCP Tools: ${mcpToolsWithServer.length}`);
        log.log(`[CommandSystem]   - System: 2`);
        log.log(`[CommandSystem] =======================================`);
    }

    public removeWindow(win: BrowserWindow) {
        this.windows = this.windows.filter(w => w !== win);
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
            // ========== Slash Command 检测 ==========
            log.log('[AgentRuntime] processUserMessage called, input type:', typeof input);
            log.log('[AgentRuntime] Input value:', typeof input === 'string' ? JSON.stringify(input) : '[object]');

            let processedInput = input;

            if (typeof input === 'string') {
                log.log('[AgentRuntime] Calling slashParser.parse...');
                const parsed = this.slashParser.parse(input);
                log.log('[AgentRuntime] Parse result:', parsed ? 'SUCCESS' : 'NULL');

                if (parsed) {
                    log.log('[SlashCommand] Detected:', parsed.command.id);

                    // 处理命令
                    const shouldContinue = await this.handleSlashCommand(parsed);

                    if (!shouldContinue) {
                        // 命令已完全处理，不需要 AI
                        this.isProcessing = false;
                        return;
                    }

                    // 如果命令修改了输入（如技能命令），使用修改后的输入
                    if (this.modifiedInput) {
                        processedInput = this.modifiedInput;
                        this.modifiedInput = undefined;
                    }
                }
            }
            // ========== Slash Command 检测结束 ==========

            await this.skillManager.loadSkills();
            await this.mcpService.loadClients();

            let userContent: string | Anthropic.ContentBlockParam[] = '';

            if (typeof processedInput === 'string') {
                // 🔒 安全检查：提示词注入检测
                const detection = promptInjectionDefense.detectInjection(processedInput);

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
                        log.error('[Security] Prompt injection blocked:', detection);
                        throw new Error(warning);
                    }

                    // 中低危攻击：清理后继续处理
                    log.warn('[Security] Prompt injection detected and sanitized:', detection);
                    userContent = promptInjectionDefense.sanitize(processedInput);
                } else {
                    userContent = processedInput;
                }
            } else {
                const blocks: Anthropic.ContentBlockParam[] = [];
                // Process images with intelligent integration
                if (processedInput.images && processedInput.images.length > 0) {
                    const config = configStore.getAll();

                    // 检查是否配置了豆包 API Key
                    if (config.doubaoApiKey) {
                        // ✅ 配置了豆包 API Key，使用豆包视觉识别增强
                        log.log('[AgentRuntime] Using Doubao vision for image analysis');

                        try {
                            // ✅ 关键改进 1：先添加原始图片（确保前端显示）
                            log.log('[AgentRuntime] Adding original image blocks for display');
                            this.addOriginalImageBlocks(blocks, processedInput.images);

                            // 直接执行 Python 脚本
                            // 获取技能脚本路径
                            let scriptPath: string;
                            if (app.isPackaged) {
                                scriptPath = path.join(process.resourcesPath, 'resources', 'skills', 'image-understanding', 'scripts', 'image_understanding.py');
                            } else {
                                scriptPath = path.join(process.cwd(), 'resources', 'skills', 'image-understanding', 'scripts', 'image_understanding.py');
                            }

                            // ✅ 关键改进 2：调用豆包视觉识别获取分析
                            log.log('[AgentRuntime] Calling Doubao vision script for analysis');
                            const result = await this.executeDoubaoVisionScript(scriptPath, processedInput.images[0], 'describe');

                            if (result && result.success) {
                                // ✅ 关键改进 3：将豆包分析存储到属性（不显示给用户）
                                log.log('[AgentRuntime] Doubao vision analysis completed, storing for system prompt');
                                this.lastDoubaoAnalysis = result.result;

                                // 添加用户消息（不包含豆包分析）
                                blocks.push({
                                    type: 'text',
                                    text: processedInput.content || '请分析这张图片'
                                });
                            } else {
                                // 脚本执行失败，只使用图片和用户消息
                                log.warn('[AgentRuntime] Doubao vision analysis failed, using original image only');
                                this.lastDoubaoAnalysis = undefined;
                                blocks.push({
                                    type: 'text',
                                    text: processedInput.content || '请分析这张图片'
                                });
                            }
                        } catch (error) {
                            log.error('[AgentRuntime] Error in Doubao vision processing:', error);
                            // 降级：只使用图片
                            this.lastDoubaoAnalysis = undefined;
                            blocks.push({
                                type: 'text',
                                text: processedInput.content || '请分析这张图片'
                            });
                        }
                    } else {
                        // ⚠️ 未配置豆包 API Key
                        log.warn('[AgentRuntime] Doubao API Key not configured');
                        this.addOriginalImageBlocks(blocks, processedInput.images);
                        this.lastDoubaoAnalysis = undefined;

                        // 添加用户消息
                        blocks.push({
                            type: 'text',
                            text: processedInput.content || '请分析这张图片'
                        });
                    }
                }
                // Add text with security check
                if (processedInput.content && processedInput.content.trim()) {
                    // 🔒 安全检查：提示词注入检测
                    const detection = promptInjectionDefense.detectInjection(processedInput.content);

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
                            log.error('[Security] Prompt injection blocked:', detection);
                            throw new Error(warning);
                        }

                        // 中低危攻击：清理后继续处理
                        log.warn('[Security] Prompt injection detected and sanitized:', detection);
                        blocks.push({ type: 'text', text: promptInjectionDefense.sanitize(processedInput.content) });
                    } else {
                        blocks.push({ type: 'text', text: processedInput.content });
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
                log.log('[IntentDetection] User input:', userContent);
                log.log('[IntentDetection] Detected skills:', this.detectRelevantSkills(userContent));
            }

            this.notifyUpdate();

            // Start the agent loop
            await this.runLoop();

        } catch (error: unknown) {
            const err = error as { status?: number; message?: string };
            log.error('Agent Loop Error:', error);

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
            log.log(`[AgentRuntime] Loop iteration: ${iterationCount}`);
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
            log.log('[AgentRuntime] Available tools:', tools.map(t => ({
                name: t.name,
                description: t.description?.substring(0, 60) + '...'
            })));

            // Build working directory context
            const authorizedFolders = permissionManager.getAuthorizedFolders();
            const workingDirContext = authorizedFolders.length > 0
                ? `\n\nWORKING DIRECTORY:\n- Primary: ${authorizedFolders[0]}\n- All authorized: ${authorizedFolders.join(', ')}\n\nYou should primarily work within these directories. Always use absolute paths.`
                : '\n\nNote: No working directory has been selected yet. Ask the user to select a folder first.';

            const builtinSkillsDir = app.isPackaged
                ? path.join(process.resourcesPath, 'resources', 'skills')
                : path.join(process.cwd(), 'resources', 'skills');
            const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
            const systemPrompt = `You are SkillMate, an AI skill ecosystem platform that helps users create, share, sell, and learn AI skills. You assist users through tool usage and skill execution.

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
- Built-in skills are loaded from: ${builtinSkillsDir}
- User skills are loaded from: ${userSkillsDir}
- Skills contain pre-built implementations - prefer skills over writing new code
- When a skill is invoked, follow its instructions precisely
- You can combine multiple skills to accomplish complex tasks

## HOW TO CALL SKILLS
When a user asks to use a skill (e.g., "use the wechat-writing skill" or "帮我写文章"):
1. **Call the skill tool directly** by name (e.g., use the wechat-writing tool)
2. **Read the returned skill instructions** carefully
3. **Follow the instructions precisely** to complete the task
4. **Use run_command** to execute any scripts mentioned in the skill

Available skills will be shown in your tools list.
**Important**: Always call the skill tool first, do not try to write your own code unless the skill instructs you to.

## SCRIPT EXECUTION
When executing Python scripts from skills:
- Use the exact path provided in the skill instructions
- Format: python D:\\path\\to\\script.py [args] (no quotes around the path)
- Example: python D:\\skills\\wechat-writing\\main.py --topic AI
- Use absolute paths only
- Do NOT create new Python scripts unless explicitly requested by the user or skill instructions

## MCP INTEGRATION
- MCP servers provide external tools and capabilities
- MCP tools are prefixed with server name (e.g., 'filesystem:read_file', 'fetch__fetch')
- Available MCP tools are loaded dynamically based on user configuration

## 🌐 WEB ACCESS CAPABILITIES
You have access to the following MCP tools for web access:
- **fetch**: Fetch web pages and get real-time content
  - Use when: User asks for web content, news, articles, or specific URLs
  - Example: "Use fetch to get the latest news about AI"
  - Example: "Fetch the content of https://example.com"
- **baidu-search**: Baidu Qianfan AI search (if configured with API Key)
  - Use when: User asks to search for information or current events
  - Example: "Search for the latest developments in electric vehicles"
  - Example: "Use baidu-search to find 2026 AI trends"

When users need real-time information or web content, proactively use these tools.

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

            // ✅ 注入豆包分析结果到系统提示
            let finalSystemPrompt = systemPrompt;
            if (this.lastDoubaoAnalysis) {
                finalSystemPrompt += `\n\n---\n**图片分析参考**（豆包视觉识别）：\n${this.lastDoubaoAnalysis}\n---\n`;
                log.log('[AgentRuntime] Injected Doubao analysis into system prompt');
            }

            log.log('Sending request to API...');
            log.log('Model:', this.model);
            log.log('Base URL:', this.anthropic.baseURL);

            try {
                const stream = await this.anthropic.messages.create({
                    model: this.model,
                    max_tokens: 4096,
                    system: finalSystemPrompt,
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
                                    log.error("Failed to parse tool input", e);
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

                            log.log(`Executing tool: ${toolUse.name}`);
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
                                        result = await this.fsTools.writeFile(args);
                                        const fileName = args.path.split(/[\\/]/).pop() || 'file';
                                        this.artifacts.push({ path: args.path, name: fileName, type: 'file' });
                                        this.broadcast('agent:artifact-created', { path: args.path, name: fileName, type: 'file' });
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
                                    result = await this.fsTools.runCommand(args, defaultCwd);
                                } else {
                                    const skillInfo = await this.skillManager.getSkillInfo(toolUse.name);
                                    log.log(`[Runtime] Skill ${toolUse.name} info found? ${!!skillInfo} (len: ${skillInfo?.instructions?.length})`);
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
                                const errorMessage = (toolErr as Error).message;

                                // 使用错误翻译器将技术错误转换为友好提示
                                const friendlyError = pythonErrorTranslator.translate(errorMessage, null);

                                // 如果是依赖缺失错误，发送特殊事件到前端
                                if (friendlyError.errorType === 'dependency' && friendlyError.canAutoFix) {
                                    this.broadcast('slash-command:error', {
                                        error: `${friendlyError.title}\n\n${friendlyError.message}\n\n${friendlyError.solution}`,
                                        isDependencyError: true,
                                        packageName: this.extractPackageName(errorMessage)
                                    });
                                }

                                // 返回友好的错误消息给AI
                                result = `Error: ${friendlyError.message}`;
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
                log.error("Agent Loop detailed error:", loopError);

                // Handle Sensitive Content Error (1027)
                if (loopErr.status === 500 && (loopErr.message?.includes('sensitive') || JSON.stringify(loopError).includes('1027'))) {
                    log.log("Caught sensitive content error, asking Agent to retry...");

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

    /**
     * 从错误消息中提取 Python 包名
     */
    private extractPackageName(errorMessage: string): string {
        const match = errorMessage.match(/No module named ['"]([^'"]+)['"]/i);
        return match ? match[1] : 'unknown';
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

        // ✅ 新增：检测技能名模式
        // 匹配 "use the X skill" 或 "X skill" 模式
        const skillNameMatch = lowerInput.match(/(?:use\s+the\s+)?(\w+)\s+skill/i);
        if (skillNameMatch) {
            const skillName = skillNameMatch[1];
            // 检查是否是已注册的技能
            if (this.skillManager.hasSkill(skillName)) {
                if (!relevant.includes(skillName)) {
                    relevant.push(skillName);
                }
            }
        }

        // ✅ 新增：直接检测已知技能名
        const knownSkills = [
            'wechat-writing', 'ai-writer', 'brainstorming', 'style-learner', 'natural-writer',
            'cover-generator', 'image-cropper', 'image-generation', 'article-illustrator',
            'title-generator', 'data-analyzer', 'algorithmic-art', 'canvas-design',
            'docx-editor', 'pdf-processor', 'pptx-processor', 'get_current_time'
        ];
        for (const skill of knownSkills) {
            if (lowerInput.includes(skill)) {
                if (!relevant.includes(skill)) {
                    relevant.push(skill);
                }
            }
        }

        return relevant;
    }

    /**
     * 处理 Slash Command
     * @returns false 表示命令已完全处理，不需要继续 AI 流程
     *          true 表示需要继续 AI 流程
     */
    private async handleSlashCommand(parsed: ParsedCommand): Promise<boolean> {
        const { command, params, remainingInput } = parsed;

        log.log(`[SlashCommand] Executing: ${command.id}`);

        // 1. 系统命令：直接执行
        if (command.type === CommandType.SYSTEM) {
            try {
                await command.execute(params);
                this.broadcast('slash-command:success', {
                    commandId: command.id,
                    commandName: command.name
                });
                return false; // 不需要 AI 处理
            } catch (error) {
                this.broadcast('slash-command:error', {
                    commandId: command.id,
                    error: (error as Error).message
                });
                return false;
            }
        }

        // 2. MCP 工具：直接执行
        if (command.type === CommandType.MCP) {
            try {
                const result = await command.execute(params);
                this.broadcast('slash-command:result', {
                    commandId: command.id,
                    result
                });
                return false;
            } catch (error) {
                this.broadcast('slash-command:error', {
                    commandId: command.id,
                    error: (error as Error).message
                });
                return false;
            }
        }

        // 3. 技能命令：转换为 AI 消息
        if (command.type === CommandType.SKILL) {
            // 构造增强的提示词，引导 AI 使用该技能
            const skillPrompt = this.constructSkillPrompt(command, remainingInput);

            // 修改输入，让 AI 处理
            this.modifiedInput = skillPrompt;

            // 通知前端正在执行技能
            this.broadcast('slash-command:executing', {
                commandId: command.id,
                commandName: command.name
            });

            return true; // 需要 AI 处理
        }

        return true;
    }

    /**
     * 为技能命令构造 AI 提示词
     */
    private constructSkillPrompt(command: CommandDefinition, userInput: string): string {
        const skillName = command.id;
        const skillDescription = command.description;

        // 如果用户有输入，组合技能和用户输入
        if (userInput.trim()) {
            return `Please use the ${skillName} tool to help me with this request: ${userInput}

Instructions:
1. Call the ${skillName} tool directly
2. Read the returned skill instructions carefully
3. Follow the instructions precisely
4. Use run_command to execute any scripts mentioned in the skill

Important: Always call the skill tool first, do not try to write your own code unless the skill instructs you to.`;
        } else {
            // 只有技能名，没有参数
            return `Please load the ${skillName} skill (${skillDescription}) and ask me what I would like to do with it.

Instructions:
1. Call the ${skillName} tool directly
2. Read the returned skill instructions
3. Ask the user what they would like to do with this skill`;
        }
    }

    /**
     * 执行豆包视觉识别脚本
     * @param scriptPath Python 脚本路径
     * @param imageData Base64 编码的图片数据
     * @param action 操作类型（describe/analyze/ocr/question）
     * @returns Promise<{success: boolean, result?: string, error?: string}>
     */
    private async executeDoubaoVisionScript(
        scriptPath: string,
        imageData: string,
        action: string = 'describe'
    ): Promise<{ success: boolean; result?: string; error?: string }> {
        let tempFilePath: string | null = null;

        try {
            // ✅ 添加诊断日志
            log.log('[AgentRuntime] 🖼️ Executing Doubao vision script');
            log.log('[AgentRuntime] 📁 Script path:', scriptPath);
            log.log('[AgentRuntime] 🔑 API Key configured:', !!configStore.getAll().doubaoApiKey);
            log.log('[AgentRuntime] 📝 Action:', action);

            // ✨ 新增：压缩图片
            const compressionResult = await this.imageCompressionService.compressImage(imageData);

            if (compressionResult.success) {
                if (compressionResult.compressionRatio && compressionResult.compressionRatio < 1) {
                    log.log('[AgentRuntime] 📉 Image compressed:',
                        (compressionResult.originalSize! / 1024).toFixed(2), 'KB →',
                        (compressionResult.compressedSize! / 1024).toFixed(2), 'KB',
                        `(${(compressionResult.compressionRatio * 100).toFixed(1)}%)`);
                }
                imageData = compressionResult.compressedData!;
            } else {
                log.warn('[AgentRuntime] ⚠️ Image compression failed:', compressionResult.error);
                log.warn('[AgentRuntime] 🔄 Using original image');
                // 继续使用原图，不中断流程
            }

            // 创建临时文件保存图片数据（避免命令行参数过长）
            const tempDir = os.tmpdir();
            const tempFileName = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.txt`;
            tempFilePath = path.join(tempDir, tempFileName);

            // 写入 base64 图片数据到临时文件
            fs.writeFileSync(tempFilePath, imageData);
            const stats = fs.statSync(tempFilePath);
            log.log('[AgentRuntime] 📄 Temp file created:', tempFilePath);
            log.log('[AgentRuntime] 📏 Temp file size:', stats.size, 'bytes');

            // 构建命令
            const args = [scriptPath, action, tempFilePath, '--language', 'zh-CN'];
            const env = {
                ...process.env,
                DOUBAO_API_KEY: configStore.getAll().doubaoApiKey,
                PYTHONIOENCODING: 'utf-8'  // ✅ 强制 Python 使用 UTF-8 编码 I/O（解决 Windows 乱码问题）
            };

            log.log('[AgentRuntime] 🔑 DOUBAO_API_KEY env var:', env.DOUBAO_API_KEY ? `***${env.DOUBAO_API_KEY.slice(-4)}` : 'NOT SET');
            log.log('[AgentRuntime] 🔠 PYTHONIOENCODING:', env.PYTHONIOENCODING);

            // ✅ 使用 exec 执行命令
            const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${action}" "${tempFilePath}" --language zh-CN`, {
                env,
                timeout: 90000,  // 90秒超时（与 Python 脚本超时匹配）
                maxBuffer: 1024 * 1024 * 10,  // 10MB buffer
                encoding: 'utf8'  // ✅ 显式指定 UTF-8 编码
            });

            // 清理临时文件
            try {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                    log.log('[AgentRuntime] 🗑️ Temp file cleaned up');
                }
            } catch (e) {
                log.warn('[AgentRuntime] Failed to cleanup temp file:', e);
            }

            // 解析输出
            if (stdout) {
                log.log('[AgentRuntime] ✅ Script succeeded, parsing output...');
                try {
                    const result = JSON.parse(stdout);
                    if (result.success) {
                        log.log('[AgentRuntime] ✅ Image analysis result:', result.result?.substring(0, 100) + '...');
                        return { success: true, result: result.result };
                    } else {
                        log.error('[AgentRuntime] ❌ Script returned error:', result.error);
                        return { success: false, error: result.error || '未知错误' };
                    }
                } catch (e) {
                    log.error('[AgentRuntime] ❌ Failed to parse script output:', stdout);
                    log.error('[AgentRuntime] ❌ Parse error:', e);
                    return { success: false, error: `解析脚本输出失败: ${e}` };
                }
            } else {
                log.error('[AgentRuntime] ❌ Script produced no output');
                return { success: false, error: '脚本没有输出' };
            }

        } catch (error: any) {
            // 清理临时文件
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    log.log('[AgentRuntime] 🗑️ Temp file cleaned up after error');
                } catch (e) {
                    log.warn('[AgentRuntime] Failed to cleanup temp file:', e);
                }
            }

            // 处理超时错误
            if (error.signal === 'SIGTERM') {
                log.error('[AgentRuntime] ⏰ Script timeout after 90s');
                return { success: false, error: '脚本执行超时（90秒）。图片太大或网络问题，建议使用更小的图片或检查网络连接。' };
            }

            // 处理其他错误
            log.error('[AgentRuntime] 💥 Script execution failed:', error);
            return { success: false, error: `脚本执行失败: ${error.message}` };
        }
    }

    /**
     * 添加原始图片块到消息中
     * 用于降级处理：当豆包视觉识别失败或未配置时，直接发送图片
     */
    private addOriginalImageBlocks(blocks: Anthropic.ContentBlockParam[], images: string[]): void {
        for (const img of images) {
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

    // ========== 权限确认机制 ==========

    /**
     * 待处理的权限确认请求
     */
    private pendingPermissionConfirmations = new Map<string, {
        resolve: (approved: boolean) => void;
        timeout: NodeJS.Timeout;
    }>();

    /**
     * 请求权限确认（通用方法）
     * @param permission 权限请求信息
     * @returns 用户是否批准（30秒超时后默认拒绝）
     */
    public async requestPermission(permission: {
        type: 'delete_command' | 'dangerous_operation';
        command: string;
        workingDir?: string;
    }): Promise<boolean> {
        const id = `permission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        log.log(`[AgentRuntime] Requesting permission for ${permission.type}: ${permission.command}`);

        // 1. 创建超时 Promise（30 秒）
        const timeoutPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
                this.pendingPermissionConfirmations.delete(id);
                log.warn(`[AgentRuntime] Permission confirmation timeout for ${permission.command}`);
                resolve(false); // 超时默认拒绝
            }, 30000); // 30秒超时

            this.pendingPermissionConfirmations.set(id, { resolve, timeout });
        });

        // 2. 发送权限确认请求到 UI
        this.broadcast('agent:permission-confirm-request', {
            id,
            permission: {
                type: permission.type,
                command: permission.command,
                workingDir: permission.workingDir,
                timestamp: Date.now()
            }
        });

        // 3. 等待用户响应或超时
        return Promise.race([
            new Promise<boolean>(resolve => {
                const existing = this.pendingPermissionConfirmations.get(id);
                if (existing) {
                    // 替换超时的 resolve
                    clearTimeout(existing.timeout);
                    this.pendingPermissionConfirmations.set(id, {
                        resolve,
                        timeout: existing.timeout
                    });
                }
            }),
            timeoutPromise
        ]);
    }

    /**
     * 处理权限确认响应
     * @param id 确认请求 ID
     * @param approved 用户是否批准
     */
    public handlePermissionConfirmation(id: string, approved: boolean): void {
        const confirmation = this.pendingPermissionConfirmations.get(id);
        if (confirmation) {
            clearTimeout(confirmation.timeout);
            confirmation.resolve(approved);
            this.pendingPermissionConfirmations.delete(id);

            log.log(`[AgentRuntime] Permission confirmation ${approved ? 'approved' : 'rejected'} for ${id}`);
        } else {
            log.warn(`[AgentRuntime] Permission confirmation not found for ${id}`);
        }
    }

    /**
     * 清理所有待确认的权限请求（窗口关闭时调用，防止内存泄漏）
     */
    public cleanupPendingPermissionConfirmations(): void {
        log.log(`[AgentRuntime] Cleaning up ${this.pendingPermissionConfirmations.size} pending permission confirmations`);

        this.pendingPermissionConfirmations.forEach(({ timeout, resolve }) => {
            clearTimeout(timeout);
            resolve(false); // 拒绝所有待确认的请求
        });

        this.pendingPermissionConfirmations.clear();
    }

    // ========== 删除确认机制（兼容旧代码） ==========

    /**
     * 待处理的删除确认请求
     */
    private pendingDeleteConfirmations = new Map<string, {
        resolve: (approved: boolean) => void;
        timeout: NodeJS.Timeout;
    }>();

    /**
     * 请求删除操作确认
     * @param operation 删除操作信息
     * @returns 用户是否批准（30秒超时后默认拒绝）
     */
    public async requestDeleteConfirmation(operation: {
        type: 'delete_file' | 'delete_directory';
        path: string;
        itemCount?: number;
    }): Promise<boolean> {
        const id = `delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        log.log(`[AgentRuntime] Requesting delete confirmation for ${operation.type}: ${operation.path}`);

        // 1. 创建超时 Promise（30 秒）
        const timeoutPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
                this.pendingDeleteConfirmations.delete(id);
                log.warn(`[AgentRuntime] Delete confirmation timeout for ${operation.path}`);
                resolve(false); // 超时默认拒绝
            }, 30000); // 30秒超时

            this.pendingDeleteConfirmations.set(id, { resolve, timeout });
        });

        // 2. 发送删除确认请求到 UI
        this.broadcast('agent:delete-confirm-request', {
            id,
            operation: {
                type: operation.type,
                path: operation.path,
                itemCount: operation.itemCount || 1,
                timestamp: Date.now()
            }
        });

        // 3. 等待用户响应或超时
        return Promise.race([
            new Promise<boolean>(resolve => {
                const existing = this.pendingDeleteConfirmations.get(id);
                if (existing) {
                    // 替换超时的 resolve
                    clearTimeout(existing.timeout);
                    this.pendingDeleteConfirmations.set(id, {
                        resolve,
                        timeout: existing.timeout
                    });
                }
            }),
            timeoutPromise
        ]);
    }

    /**
     * 处理删除确认响应
     * @param id 确认请求 ID
     * @param approved 用户是否批准
     */
    public handleDeleteConfirmation(id: string, approved: boolean): void {
        const confirmation = this.pendingDeleteConfirmations.get(id);
        if (confirmation) {
            clearTimeout(confirmation.timeout);
            confirmation.resolve(approved);
            this.pendingDeleteConfirmations.delete(id);

            log.log(`[AgentRuntime] Delete confirmation ${approved ? 'approved' : 'rejected'} for ${id}`);
        } else {
            log.warn(`[AgentRuntime] Delete confirmation not found for ${id}`);
        }
    }

    /**
     * 清理所有待确认的删除请求（窗口关闭时调用，防止内存泄漏）
     */
    public cleanupPendingConfirmations(): void {
        log.log(`[AgentRuntime] Cleaning up ${this.pendingDeleteConfirmations.size} pending delete confirmations`);

        this.pendingDeleteConfirmations.forEach(({ timeout, resolve }) => {
            clearTimeout(timeout);
            resolve(false); // 拒绝所有待确认的请求
        });

        this.pendingDeleteConfirmations.clear();
    }

    // ========== 结束删除确认机制 ==========

    public abort() {
        this.abortController?.abort();
    }
}
