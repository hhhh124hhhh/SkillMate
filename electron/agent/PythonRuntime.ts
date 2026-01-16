/**
 * Python Runtime Manager
 *
 * 管理 Python 3.11.8 嵌入式版本的加载和配置
 *
 * 功能：
 * 1. 自动检测开发/生产环境的 Python 运行时路径
 * 2. 验证 Python 解释器和依赖包的可用性
 * 3. 提供 Python 可执行文件路径和环境变量配置
 * 4. 单例模式，全局共享
 *
 * 使用方法：
 *   import { pythonRuntime } from './agent/PythonRuntime';
 *
 *   // 在 main.ts 中初始化
 *   await pythonRuntime.initialize();
 *
 *   // 获取 Python 可执行文件路径
 *   const pythonExe = pythonRuntime.getPythonExecutable();
 *
 *   // 获取环境变量（包含 PYTHONPATH）
 *   const env = pythonRuntime.getEnvironment();
 *
 * 作者：Claude Code
 * 创建时间：2026-01-16
 */

import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { app } from 'electron';

export class PythonRuntimeManager {
    private pythonExe: string | null = null;
    private libPath: string | null = null;
    private isReady = false;
    private initializationPromise: Promise<boolean> | null = null;

    /**
     * 初始化 Python 运行时
     *
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize(): Promise<boolean> {
        // 避免重复初始化
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    /**
     * 内部初始化实现
     */
    private async _initialize(): Promise<boolean> {
        console.log('[PythonRuntime] Initializing...');

        try {
            // 1. 确定运行时路径
            const runtimePath = this.getRuntimePath();
            console.log(`[PythonRuntime] Runtime path: ${runtimePath}`);

            // 2. 检查目录是否存在
            // 注意：Python 嵌入式版本解压后直接在 runtimePath 根目录，不在 python/ 子目录
            const pythonExe = path.join(runtimePath, 'python.exe');
            const libPath = path.join(runtimePath, 'lib');

            try {
                await fs.access(pythonExe);
                await fs.access(libPath);
            } catch {
                console.warn('[PythonRuntime] ✗ Python runtime not found');
                this._printSetupInstructions();
                return false;
            }

            this.pythonExe = pythonExe;
            this.libPath = libPath;

            console.log(`[PythonRuntime] ✓ Found Python: ${pythonExe}`);
            console.log(`[PythonRuntime] ✓ Found Lib: ${libPath}`);

            // 3. 验证依赖
            await this.verifyDependencies();

            this.isReady = true;
            console.log('[PythonRuntime] ✓ Initialization complete');
            return true;

        } catch (error) {
            const err = error as Error;
            console.error('[PythonRuntime] ✗ Initialization failed:', err.message);
            this._printSetupInstructions();
            return false;
        }
    }

    /**
     * 获取运行时路径
     *
     * 开发环境: 项目根目录/python-runtime
     * 生产环境: process.resourcesPath/python-runtime
     */
    private getRuntimePath(): string {
        if (app.isPackaged) {
            // 生产环境: resources/python-runtime
            return path.join(process.resourcesPath, 'python-runtime');
        } else {
            // 开发环境: 项目根目录/python-runtime
            return path.join(process.cwd(), 'python-runtime');
        }
    }

    /**
     * 验证依赖包是否已安装
     */
    private async verifyDependencies(): Promise<void> {
        console.log('[PythonRuntime] Verifying dependencies...');

        if (!this.pythonExe || !this.libPath) {
            throw new Error('Python runtime not initialized');
        }

        // 创建临时测试脚本文件，避免 shell 转义问题
        const testScriptPath = path.join(this.getRuntimePath(), '_test_deps.py');
        const testCode = `
import sys
sys.path.insert(0, r"${this.libPath}")
try:
    import openai
    import requests
    import PIL
    import yaml
    print('OK')
except ImportError as e:
    print(f'MISSING: {e}')
    sys.exit(1)
`;

        await fs.writeFile(testScriptPath, testCode, 'utf-8');
        console.log('[PythonRuntime] Created test script:', testScriptPath);

        return new Promise((resolve, reject) => {
            const proc = spawn(this.pythonExe!, [testScriptPath], {
                env: {
                    ...process.env,
                    PYTHONPATH: this.libPath!,
                    PYTHONIOENCODING: 'utf-8'
                },
                shell: true
            });

            let output = '';
            let error = '';

            proc.stdout.on('data', (data) => {
                output += data.toString();
            });

            proc.stderr.on('data', (data) => {
                error += data.toString();
            });

            proc.on('close', async (code) => {
                // 清理临时脚本
                try {
                    await fs.unlink(testScriptPath);
                } catch {}

                console.log('[PythonRuntime] Process exited with code:', code);
                console.log('[PythonRuntime] stdout:', output);
                if (error) console.log('[PythonRuntime] stderr:', error);

                if (code === 0 && output.includes('OK')) {
                    console.log('[PythonRuntime] ✓ All dependencies verified');
                    resolve();
                } else {
                    console.warn('[PythonRuntime] ⚠ Dependency verification failed');
                    reject(new Error('Dependencies verification failed'));
                }
            });

            proc.on('error', async (err) => {
                // 清理临时脚本
                try {
                    await fs.unlink(testScriptPath);
                } catch {}
                console.error('[PythonRuntime] ✗ Failed to spawn Python process:', err);
                reject(err);
            });
        });
    }

    /**
     * 获取 Python 可执行文件路径
     *
     * @returns {string | null} Python 可执行文件的完整路径，如果未初始化则返回 null
     */
    getPythonExecutable(): string | null {
        return this.pythonExe;
    }

    /**
     * 获取依赖包路径
     *
     * @returns {string | null} 依赖包目录的完整路径，如果未初始化则返回 null
     */
    getLibPath(): string | null {
        return this.libPath;
    }

    /**
     * 检查 Python 运行时是否可用
     *
     * @returns {boolean} 如果 Python 运行时已初始化且可用，返回 true
     */
    isAvailable(): boolean {
        return this.isReady;
    }

    /**
     * 获取执行 Python 脚本所需的环境变量
     *
     * @returns {Record<string, string>} 环境变量对象，包含 PYTHONPATH 和 PYTHONIOENCODING
     */
    getEnvironment(): Record<string, string> {
        if (!this.libPath) {
            return {};
        }

        return {
            PYTHONPATH: this.libPath,
            PYTHONIOENCODING: 'utf-8'
        };
    }

    /**
     * 打印设置说明
     */
    private _printSetupInstructions(): void {
        if (app.isPackaged) {
            console.error('\n' + '='.repeat(60));
            console.error('Python Runtime Not Found!');
            console.error('='.repeat(60));
            console.error('\nThe application was built without the Python runtime.');
            console.error('Please rebuild the application with the following steps:');
            console.error('\n  1. cd /path/to/wechat-flowwork');
            console.error('  2. npm run setup-python');
            console.error('  3. npm run build');
            console.error('\n' + '='.repeat(60) + '\n');
        } else {
            console.error('\n' + '='.repeat(60));
            console.error('Python Runtime Not Found!');
            console.error('='.repeat(60));
            console.error('\nTo use the AI skills, you need to set up the Python runtime first.');
            console.error('\nRun the following command:');
            console.error('\n  npm run setup-python');
            console.error('\nThis will download and configure Python 3.11.8 (embeddable version)');
            console.error('and install the required dependencies (openai, requests, Pillow, PyYAML).');
            console.error('\nEstimated download size: ~25 MB');
            console.error('Estimated installation time: 2-5 minutes');
            console.error('\n' + '='.repeat(60) + '\n');
        }
    }
}

/**
 * 单例实例
 *
 * 使用说明：
 *   import { pythonRuntime } from './agent/PythonRuntime';
 *
 *   // 初始化（通常在 main.ts 的 app.whenReady() 中）
 *   await pythonRuntime.initialize();
 *
 *   // 检查是否可用
 *   if (pythonRuntime.isAvailable()) {
 *     const pythonExe = pythonRuntime.getPythonExecutable();
 *     const env = pythonRuntime.getEnvironment();
 *     // 使用 pythonExe 和 env 执行 Python 脚本
 *   }
 */
export const pythonRuntime = new PythonRuntimeManager();
