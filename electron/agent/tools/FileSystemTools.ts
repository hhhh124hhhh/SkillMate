import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';
import { pythonRuntime } from '../PythonRuntime.js';
import { configStore } from '../../config/ConfigStore.js';
import { permissionManager } from '../security/PermissionManager.js';
import { auditLogger } from '../../security/AuditLogger.js';

const execAsync = promisify(exec);

// 🔒 命令执行安全配置

// 命令白名单（仅允许安全命令）
const ALLOWED_COMMANDS = [
    // Python 相关
    /^python\s+[\w\-./\\]+\.py(\s+[\w\-./\\]+)*$/i,
    /^python3\s+[\w\-./\\]+\.py(\s+[\w\-./\\]+)*$/i,
    /^[\w\-./\\]+\.py$/i,

    // Node.js 相关
    /^node\s+[\w\-./\\]+\.js(\s+[\w\-./\\]+)*$/i,
    /^npm\s+(install|test|run|start)(\s+[\w@\-./\\]+)*$/i,
    /^yarn\s+(add|install|test|run)(\s+[\w@\-./\\]+)*$/i,
    /^pnpm\s+(add|install|test|run)(\s+[\w@\-./\\]+)*$/i,

    // Git 相关
    /^git\s+(status|log|diff|show|branch|checkout|clone|init|add|commit|push|pull|fetch|remote)(\s+[\w\-./\\]+)*$/i,

    // 包管理器
    /^pip\s+install(\s+[\w\-./\\]+)*$/i,
    /^pip3\s+install(\s+[\w\-./\\]+)*$/i,
    /^poetry\s+(add|install|update)(\s+[\w\-./\\]+)*$/i,

    // 构建工具
    /^make\s*$/i,
    /^make\s+[\w-]+$/i,
    /^npx\s+[\w@\-./\\]+(\s+[\w\-./\\]+)*$/i,

    // 文件操作（只读）
    /^cat\s+[\w\-./\\]+$/i,
    /^ls\s*$/i,
    /^ls\s+[\w\-./\\]+$/i,
    /^dir\s*$/i,
    /^dir\s+[\w\-./\\]+$/i,

    // 系统信息
    /^pwd$/i,
    /^which\s+\w+$/i,
    /^where\s+\w+$/i,
    /^echo\s+[\w\s\-./\\]+$/i,

    // 压缩解压
    /^tar\s+(x|c)[zj]f\s+[\w\-./\\]+.*$/i,
    /^unzip\s+[\w\-./\\]+.*$/i,
    /^zip\s+[\w\-./\\]+.*$/i,

    // 文本处理
    /^grep\s+[\w\s\-./\\]+$/i,
    /^head\s+[\w\-./\\]+.*$/i,
    /^tail\s+[\w\-./\\]+.*$/i,
    /^wc\s+[\w\-./\\]+.*$/i,
];

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

        // 🔒 安全检查：路径授权验证
        if (args.cwd && !permissionManager.isPathAuthorized(args.cwd)) {
            log.error(`[Security] ❌ Unauthorized working directory: ${args.cwd}`);
            await auditLogger.log('security', 'command_blocked', { reason: 'unauthorized_path', path: args.cwd, command: originalCommand }, 'error');
            return `Error: Working directory not authorized: ${args.cwd}\nPlease select a folder first.`;
        }

        try {
            let command = originalCommand;
            const env = { ...process.env };

            // 自动注入豆包 API Key 到环境变量
            const doubaoApiKey = configStore.get('doubaoApiKey');
            if (doubaoApiKey) {
                env.DOUBAO_API_KEY = doubaoApiKey;
                log.log('[FileSystemTools] Injected DOUBAO_API_KEY into environment');
            }

            // 检测是否是 Python 命令
            if (this.isPythonCommand(command)) {
                if (!pythonRuntime.isAvailable()) {
                    return 'Error: Python runtime is not available. Please run "npm run setup-python" first.';
                }

                // 替换为内置 Python
                const bundledPython = pythonRuntime.getPythonExecutable();
                if (bundledPython) {
                    command = this.replacePythonCommand(command, bundledPython);

                    // 添加 PYTHONPATH 环境变量
                    Object.assign(env, pythonRuntime.getEnvironment());

                    log.log(`[FileSystemTools] Using bundled Python: ${bundledPython}`);
                }
            }

            log.log(`[FileSystemTools] Executing command: ${command} in ${workingDir}`);

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

            const { stdout, stderr } = await execAsync(command, {
                cwd: workingDir,
                timeout: timeout,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                encoding: 'utf-8',
                env: env, // 传递环境变量
                shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
            });

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
     * 替换 Python 命令为内置运行时
     *
     * @param command - 原始命令
     * @param bundledPython - 内置 Python 可执行文件路径
     * @returns 替换后的命令
     */
    private replacePythonCommand(command: string, bundledPython: string): string {
        const cmd = command.trim();

        // python script.py -> "bundled/python.exe" script.py
        if (cmd.startsWith('python ')) {
            return `"${bundledPython}" ${cmd.substring(7)}`;
        }
        // python3 script.py -> "bundled/python.exe" script.py
        else if (cmd.startsWith('python3 ')) {
            return `"${bundledPython}" ${cmd.substring(8)}`;
        }
        // 直接调用 .py 文件 -> "bundled/python.exe" script.py
        else if (cmd.endsWith('.py')) {
            return `"${bundledPython}" ${cmd}`;
        }

        return command;
    }
}
