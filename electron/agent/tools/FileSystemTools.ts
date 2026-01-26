import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import log from 'electron-log';
import { pythonRuntime } from '../PythonRuntime.js';
import { configStore } from '../../config/ConfigStore.js';
import { permissionManager } from '../security/PermissionManager.js';
import { auditLogger } from '../../security/AuditLogger.js';

// AgentRuntime 实例（运行时设置）
let agentRuntimeInstance: any = null;

export function setAgentRuntime(instance: any): void {
    agentRuntimeInstance = instance;
}

// 🔒 命令执行安全配置

// 命令白名单（仅允许安全命令）- 放宽参数限制，添加危险字符检查
const ALLOWED_COMMANDS = [
    // Python 相关（放宽限制 - 允许脚本文件名、Windows路径和参数）
    // 无引号路径（支持 Windows 盘符）
    /^python\s+[a-zA-Z]:(\\[^\s";|&`$<>]+)+\.py(\s+--[a-zA-Z0-9-]+(\s+[^\s";|&`$<>]+)*)*$/i,
    /^python\s+[a-zA-Z0-9_\-./\\]+\.py(\s+--[a-zA-Z0-9-]+(\s+[^\s";|&`$<>]+)*)*$/i,
    /^python3\s+[a-zA-Z]:(\\[^\s";|&`$<>]+)+\.py(\s+--[a-zA-Z0-9-]+(\s+[^\s";|&`$<>]+)*)*$/i,
    /^python3\s+[a-zA-Z0-9_\-./\\]+\.py(\s+--[a-zA-Z0-9-]+(\s+[^\s";|&`$<>]+)*)*$/i,
    /^[a-zA-Z0-9_\-./\\]+\.py$/i,

    // ✅ 新增：允许带引号的路径（Windows 路径，但严格验证）
    /^python\s+"[a-zA-Z]:(\\[^"]+)+\.py"(\s+--[a-zA-Z0-9-]+(\s+[^"\s;|&`$<>]+)*)*$/i,
    /^python3\s+"[a-zA-Z]:(\\[^"]+)+\.py"(\s+--[a-zA-Z0-9-]+(\s+[^"\s;|&`$<>]+)*)*$/i,

    // ✅ 新增：允许 Python 版本查询（诊断用）
    /^python\s+--version$/i,
    /^python3\s+--version$/i,

    // Node.js 相关
    /^node\s+[a-zA-Z0-9_\-./\\]+\.js$/i,
    /^npm\s+(install|test|run|start)(\s+[a-zA-Z0-9@\-./\\]+)*$/i,
    /^yarn\s+(add|install|test|run)(\s+[a-zA-Z0-9@\-./\\]+)*$/i,
    /^pnpm\s+(add|install|test|run)(\s+[a-zA-Z0-9@\-./\\]+)*$/i,

    // Git 相关
    /^git\s+(status|log|diff|show|branch|checkout|clone|init|add|commit|push|pull|fetch|remote)(\s+[a-zA-Z0-9_\-./\\]+)*$/i,

    // 包管理器
    /^pip\s+install(\s+[a-zA-Z0-9_\-./\\]+)*$/i,
    /^pip3\s+install(\s+[a-zA-Z0-9_\-./\\]+)*$/i,
    /^poetry\s+(add|install|update)(\s+[a-zA-Z0-9_\-./\\]+)*$/i,

    // 构建工具
    /^make\s*$/i,
    /^make\s+[a-zA-Z0-9_-]+$/i,
    /^npx\s+[a-zA-Z0-9@\-./\\]+$/i,

    // 文件操作（只读）
    /^cat\s+[a-zA-Z0-9_\-./\\]+$/i,
    /^ls\s*$/i,
    /^ls\s+[a-zA-Z0-9_\-./\\]+$/i,
    /^dir\s*$/i,
    /^dir\s+[a-zA-Z0-9_\-./\\]+$/i,

    // 系统信息
    /^pwd$/i,
    /^which\s+[a-zA-Z0-9_]+$/i,
    /^where\s+[a-zA-Z0-9_]+$/i,
    /^echo\s+[a-zA-Z0-9\s\-./\\]+$/i,

    // 压缩解压
    /^tar\s+(x|c)[zj]f\s+[a-zA-Z0-9_\-./\\]+$/i,
    /^unzip\s+[a-zA-Z0-9_\-./\\]+$/i,
    /^zip\s+[a-zA-Z0-9_\-./\\]+$/i,

    // 文本处理
    /^grep\s+[a-zA-Z0-9\s\-./\\]+$/i,
    /^head\s+[a-zA-Z0-9_\-./\\]+$/i,
    /^tail\s+[a-zA-Z0-9_\-./\\]+$/i,
    /^wc\s+[a-zA-Z0-9_\-./\\]+$/i,
];

// ✅ 新增：危险字符黑名单（防止命令注入）
const DANGEROUS_CHARS_PATTERN = /[;&|`$()<>]/;

// 危险命令黑名单（永远阻止）
const BLOCKED_COMMANDS = [
    // 删除命令
    /\brm\s+(?:-rf?\s+)?[/*~]/i,
    /\bdel\s+(?:\/[SQs]*)?\s+[/*~]/i,
    /\brmdir\s+/i,

    // 管道和命令注入
    /\bcurl\b.*\|/i,
    /\bwget\b.*\|/i,
    /\|.*\b(sh|bash|cmd|powershell)\b/i,

    // 权限提升
    /\bsudo\b/i,
    /\bsu\b/i,
    /\bdoas\b/i,

    // 敏感文件访问
    /\bcat\s+.*\/\.ssh\//i,
    /\bcat\s+.*\/\.aws\//i,
    /\bcat\s+.*\/\.env/i,
    /\bcat\s+.*\/\.kube\//i,

    // 系统破坏
    /\bformat\s+c:/i,
    /\bmkfs\./i,
    /\bdd\s+if=/i,

    // 配置修改
    /\bchmod\s+.*777/i,
    /\bchown\s+/i,

    // 网络攻击
    /\bnc\s+.*\s+-e/i,
    /\bnetcat\s+.*\s+-e/i,
    /\btelnet\b/i,

    // 数据库操作
    /\bdb_dump\s+/i,
    /\bdb_drop\s+/i,
    /\bsqlmap\b/i,

    // 密码破解
    /\bjohn\b/i,
    /\bhashcat\b/i,
    /\bhydra\b/i,
];

export const ReadFileSchema = {
    name: "read_file",
    description: "Read the content of a file from the local filesystem. Use this to analyze code or documents.",
    input_schema: {
        type: "object" as const,
        properties: {
            path: { type: "string", description: "Absolute path to the file." }
        },
        required: ["path"]
    }
};

export const WriteFileSchema = {
    name: "write_file",
    description: "Write content to a file. Overwrites existing files. Create directories if needed.",
    input_schema: {
        type: "object" as const,
        properties: {
            path: { type: "string", description: "Absolute path to the file." },
            content: { type: "string", description: "The content to write." }
        },
        required: ["path", "content"]
    }
};

export const ListDirSchema = {
    name: "list_dir",
    description: "List contents of a directory.",
    input_schema: {
        type: "object" as const,
        properties: {
            path: { type: "string", description: "Absolute path to the directory." }
        },
        required: ["path"]
    }
};

export const RunCommandSchema = {
    name: "run_command",
    description: "Execute a shell command (bash, python, npm, etc.). Use for running scripts, installing dependencies, building projects. The command runs in the specified working directory.",
    input_schema: {
        type: "object" as const,
        properties: {
            command: { type: "string", description: "The command to execute (e.g., 'python script.py', 'npm install')." },
            cwd: { type: "string", description: "Working directory for the command. Defaults to first authorized folder." }
        },
        required: ["command"]
    }
};

export class FileSystemTools {

    async readFile(args: { path: string }) {
        try {
            const content = await fs.readFile(args.path, 'utf-8');
            return `Successfully read file ${args.path}:\n${content}`;
        } catch (error: unknown) {
            return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    async writeFile(args: { path: string, content: string }) {
        try {
            await fs.mkdir(path.dirname(args.path), { recursive: true });
            await fs.writeFile(args.path, args.content, 'utf-8');
            return `Successfully wrote to ${args.path}`;
        } catch (error: unknown) {
            return `Error writing file: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    async listDir(args: { path: string }) {
        try {
            const items = await fs.readdir(args.path, { withFileTypes: true });
            const result = items.map(item =>
                `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`
            ).join('\n');
            return `Directory contents of ${args.path}:\n${result}`;
        } catch (error: unknown) {
            return `Error listing directory: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    async runCommand(args: { command: string, cwd?: string }, defaultCwd: string) {
        const originalCommand = args.command.trim();
        const workingDir = args.cwd || defaultCwd;
        const timeout = 60000; // 60 second timeout

        // 🔒 安全检查：命令长度限制
        if (originalCommand.length > 1000) {
            await auditLogger.log('security', 'command_blocked', { reason: 'too_long', command: originalCommand.substring(0, 100) }, 'warning');
            return `Error: Command too long (max 1000 characters).\nCommand: ${originalCommand.substring(0, 100)}...`;
        }

        // 🔒 安全检查：黑名单检测
        for (const pattern of BLOCKED_COMMANDS) {
            if (pattern.test(originalCommand)) {
                log.error(`[Security] ❌ Blocked dangerous command: ${originalCommand}`);
                await auditLogger.log('security', 'command_blocked', { reason: 'blacklist', command: originalCommand }, 'error');
                return `Error: Command blocked by security policy (dangerous operation).\nCommand: ${originalCommand}`;
            }
        }

        // 🔒 安全检查：管道和重定向检测
        if (/[|<>]/.test(originalCommand) && !/^cat\s+[\w\-./\\]+$/i.test(originalCommand)) {
            log.error(`[Security] ❌ Blocked command with pipes/redirects: ${originalCommand}`);
            await auditLogger.log('security', 'command_blocked', { reason: 'pipes_redirects', command: originalCommand }, 'warning');
            return `Error: Pipes and redirections are not allowed for security reasons.\nCommand: ${originalCommand}`;
        }

        // 🔒 安全检查：白名单验证
        const isAllowed = ALLOWED_COMMANDS.some(pattern => pattern.test(originalCommand));
        if (!isAllowed) {
            log.error(`[Security] ❌ Blocked command not in whitelist: ${originalCommand}`);
            await auditLogger.log('security', 'command_blocked', { reason: 'not_whitelisted', command: originalCommand }, 'warning');
            return `Error: Command not in whitelist. Allowed commands: Python, Node.js, Git, NPM, Yarn, Pip, file operations, and text processing tools.\nCommand: ${originalCommand}`;
        }

        // ✅ 新增：安全检查 - 危险字符检测（防止命令注入）
        if (DANGEROUS_CHARS_PATTERN.test(originalCommand)) {
            log.error(`[Security] ❌ Blocked command with dangerous characters: ${originalCommand}`);
            await auditLogger.log('security', 'command_blocked', { reason: 'dangerous_chars', command: originalCommand }, 'warning');
            return `Error: Command contains dangerous characters (; & | \` $ ( ) < >) that are not allowed for security reasons.\nCommand: ${originalCommand}`;
        }

        // 🔒 安全检查：路径授权验证
        if (args.cwd && !permissionManager.isPathAuthorized(args.cwd)) {
            log.error(`[Security] ❌ Unauthorized working directory: ${args.cwd}`);
            await auditLogger.log('security', 'command_blocked', { reason: 'unauthorized_path', path: args.cwd, command: originalCommand }, 'error');
            return `Error: Working directory not authorized: ${args.cwd}\nPlease select a folder first.`;
        }

        try {
            // 解析命令为可执行文件和参数（参数化执行，防止注入）
            const parsedCommand = this.parseCommand(originalCommand);
            const env = { ...process.env };

            // 自动注入豆包 API Key 到环境变量
            const doubaoApiKey = configStore.get('doubaoApiKey');
            if (doubaoApiKey) {
                env.DOUBAO_API_KEY = doubaoApiKey;
                log.log('[FileSystemTools] Injected DOUBAO_API_KEY into environment');
            }

            // 检测是否是 Python 命令并替换为内置运行时
            if (this.isPythonCommand(originalCommand)) {
                if (!pythonRuntime.isAvailable()) {
                    return 'Error: Python runtime is not available. Please run "npm run setup-python" first.';
                }

                const bundledPython = pythonRuntime.getPythonExecutable();
                if (bundledPython) {
                    parsedCommand.command = bundledPython;
                    // 添加 PYTHONPATH 环境变量
                    Object.assign(env, pythonRuntime.getEnvironment());
                    log.log(`[FileSystemTools] Using bundled Python: ${bundledPython}`);
                }
            }

            log.log(`[FileSystemTools] Executing command: ${parsedCommand.command} ${parsedCommand.args.join(' ')} in ${workingDir}`);

            // 🔒 记录审计日志（命令执行开始）
            await auditLogger.log(
                'command',
                'command_executed',
                {
                    command: originalCommand,
                    workingDir,
                    timeout
                },
                'info'
            );

            // 🔒 使用 spawn 参数化执行，防止命令注入
            // @ts-ignore - env may contain undefined values
            const { stdout, stderr } = await this.executeCommand(
                parsedCommand.command,
                parsedCommand.args,
                workingDir,
                env,
                timeout
            );

            let result = `Command executed in ${workingDir}:\n$ ${args.command}\n\n`;
            if (stdout) result += `STDOUT:\n${stdout}\n`;
            if (stderr) result += `STDERR:\n${stderr}\n`;
            return result || 'Command completed with no output.';
        } catch (error: unknown) {
            const err = error as { stdout?: string; stderr?: string; message?: string };
            let errorMsg = `Command failed in ${workingDir}:\n$ ${args.command}\n\n`;
            if (err.stdout) errorMsg += `STDOUT:\n${err.stdout}\n`;
            if (err.stderr) errorMsg += `STDERR:\n${err.stderr}\n`;
            errorMsg += `Error: ${err.message || String(error)}`;
            return errorMsg;
        }
    }

    /**
     * 检测是否是 Python 命令
     *
     * @param command - 要执行的命令
     * @returns 如果是 Python 命令返回 true
     */
    private isPythonCommand(command: string): boolean {
        const cmd = command.trim().toLowerCase();
        return cmd.startsWith('python ') || cmd.startsWith('python3 ') || cmd.endsWith('.py');
    }

    /**
     * 解析命令字符串为可执行文件和参数数组
     * 使用参数化执行防止命令注入
     *
     * @param command - 命令字符串
     * @returns 包含可执行文件和参数数组的对象
     */
    private parseCommand(command: string): { command: string; args: string[] } {
        const trimmed = command.trim();
        const parts = trimmed.split(/\s+/);

        if (parts.length === 0) {
            return { command: trimmed, args: [] };
        }

        // 第一个部分是命令
        const executable = parts[0];
        // 剩余部分是参数（保持原样，不进行shell扩展）
        const args = parts.slice(1);

        return { command: executable, args };
    }

    /**
     * 使用 spawn 参数化执行命令（防止命令注入）
     *
     * @param command - 可执行文件
     * @param args - 参数数组
     * @param cwd - 工作目录
     * @param env - 环境变量
     * @param timeout - 超时时间（毫秒）
     * @returns stdout 和 stderr
     */
    // @ts-ignore - env type is complex for child_process
    private executeCommand(
        command: string,
        args: string[],
        cwd: string,
        env: any,
        timeout: number
    ): Promise<{ stdout: string; stderr: string }> {
        // @ts-ignore - child_process type inference issues
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let killed = false;

            const proc: any = spawn(command, args, {
                cwd,
                env,
                timeout,
                // maxBuffer: 10 * 1024 * 1024, // 10MB - removed for compatibility
                shell: false, // 🔒 关键：不使用 shell，防止命令注入
                windowsHide: true // 隐藏命令行窗口（Windows）
            });

            // 收集 stdout
            proc.stdout?.on('data', (data: any) => {
                stdout += data.toString();
            });

            // 收集 stderr
            proc.stderr?.on('data', (data: any) => {
                stderr += data.toString();
            });

            // 进程结束
            proc.on('close', (code: number) => {
                if (killed) {
                    reject(new Error(`Command execution timeout or killed`));
                } else if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed with exit code ${code}\n${stderr}`));
                }
            });

            // 错误处理
            proc.on('error', (err: Error) => {
                reject(new Error(`Failed to execute command: ${err.message}`));
            });

            // 超时处理
            setTimeout(() => {
                if (!killed) {
                    killed = true;
                    proc.kill('SIGKILL');
                }
            }, timeout);
        });
    }

    // ========== 删除工具 ==========

    /**
     * 删除文件
     * 注意：此工具应该在 AgentRuntime 中被调用，并由 AgentRuntime 处理确认逻辑
     */
    async deleteFile(args: { path: string }): Promise<string> {
        try {
            // 1. 检查路径权限
            if (!permissionManager.isPathAuthorized(args.path)) {
                throw new Error(`Path not authorized: ${args.path}`);
            }

            // 2. 检查项目信任状态
            const isTrusted = permissionManager.isProjectTrusted(args.path);

            // 3. 如果项目未信任，需要确认（由 AgentRuntime 处理）
            if (!isTrusted && agentRuntimeInstance) {
                const approved = await agentRuntimeInstance.requestDeleteConfirmation({
                    type: 'delete_file',
                    path: args.path
                });

                if (!approved) {
                    return 'Delete operation cancelled by user.';
                }
            }

            // 4. 执行删除
            await fs.unlink(args.path);

            // 5. 记录审计日志
            await auditLogger.log('file_op', 'delete_file_success', { filePath: args.path });

            // 6. 通知前端（如果可用）
            if (agentRuntimeInstance) {
                agentRuntimeInstance.broadcast('agent:operation-completed', {
                    type: 'delete_file',
                    path: args.path,
                    timestamp: Date.now()
                });
            }

            return `Successfully deleted file: ${args.path}`;
        } catch (error) {
            await auditLogger.log('file_op', 'delete_file_error', {
                filePath: args.path,
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * 删除目录
     * 注意：此工具应该在 AgentRuntime 中被调用，并由 AgentRuntime 处理确认逻辑
     */
    async deleteDirectory(args: { path: string }): Promise<string> {
        try {
            // 1. 检查路径权限
            if (!permissionManager.isPathAuthorized(args.path)) {
                throw new Error(`Path not authorized: ${args.path}`);
            }

            // 2. 统计将删除的文件数量
            let itemCount = 0;
            try {
                const files = await fs.readdir(args.path, { recursive: true });
                itemCount = files.length;
            } catch {
                // 目录不存在或为空
            }

            // 3. 无论项目是否信任，删除目录都需要确认（由 AgentRuntime 处理）
            if (agentRuntimeInstance) {
                const approved = await agentRuntimeInstance.requestDeleteConfirmation({
                    type: 'delete_directory',
                    path: args.path,
                    itemCount
                });

                if (!approved) {
                    return `Delete operation cancelled by user. Would have deleted ${itemCount} items.`;
                }
            } else {
                // 如果没有 AgentRuntime 实例，直接拒绝（安全第一）
                return `Cannot delete directory: ${args.path} (${itemCount} items). Confirmation required but no agent runtime available.`;
            }

            // 4. 执行删除
            await fs.rm(args.path, { recursive: true, force: true });

            // 5. 记录审计日志
            await auditLogger.log('file_op', 'delete_directory_success', {
                dirPath: args.path,
                itemCount
            });

            return `Successfully deleted directory: ${args.path} (${itemCount} items)`;
        } catch (error) {
            await auditLogger.log('file_op', 'delete_directory_error', {
                dirPath: args.path,
                error: (error as Error).message
            });
            throw error;
        }
    }

    // ========== 结束删除工具 ==========
}
