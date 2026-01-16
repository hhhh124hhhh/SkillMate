import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pythonRuntime } from '../PythonRuntime';

const execAsync = promisify(exec);

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
        const workingDir = args.cwd || defaultCwd;
        const timeout = 60000; // 60 second timeout

        try {
            let command = args.command;
            const env = { ...process.env };

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

                    console.log(`[FileSystemTools] Using bundled Python: ${bundledPython}`);
                }
            }

            console.log(`[FileSystemTools] Executing command: ${command} in ${workingDir}`);
            const { stdout, stderr } = await execAsync(command, {
                cwd: workingDir,
                timeout: timeout,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                encoding: 'utf-8',
                env: env, // 传递环境变量
                shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
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
