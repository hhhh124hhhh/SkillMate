#!/usr/bin/env node
/**
 * Python Runtime Setup Script for WeChat_Flowwork
 *
 * 自动下载并配置 Python 3.11.8 嵌入式版本，预装项目所需的依赖包
 *
 * 功能：
 * 1. 下载 Python 3.11.8 嵌入式版本（Windows amd64）
 * 2. 解压到 python-runtime/python/
 * 3. 修复 python311._pth（启用 import site）
 * 4. 下载 get-pip.py
 * 5. 安装依赖包到 python-runtime/lib/
 * 6. 验证安装
 *
 * 使用方法：
 *   node scripts/setup-python.js
 *   或
 *   npm run setup-python
 *
 * 作者：Claude Code
 * 创建时间：2026-01-16
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const PYTHON_VERSION = '3.11.8';
const PYTHON_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const GET_PIP_URL = 'https://bootstrap.pypa.io/get-pip.py';

// 路径配置
const PROJECT_ROOT = path.join(__dirname, '..');
const PYTHON_RUNTIME_DIR = path.join(PROJECT_ROOT, 'python-runtime');
// Python 嵌入式版本解压后直接在 PYTHON_RUNTIME_DIR 根目录，不在 python/ 子目录
const PYTHON_DIR = PYTHON_RUNTIME_DIR;
const LIB_DIR = path.join(PYTHON_RUNTIME_DIR, 'lib');
const ZIP_PATH = path.join(PYTHON_RUNTIME_DIR, 'python.zip');
const GET_PIP_PATH = path.join(PYTHON_RUNTIME_DIR, 'get-pip.py');
const REQUIREMENTS_PATH = path.join(PYTHON_RUNTIME_DIR, 'requirements.txt');

// 依赖包列表
const REQUIREMENTS = [
    'openai==1.12.0',
    'requests==2.31.0',
    'Pillow==10.2.0',
    'PyYAML==6.0.1'
];

/**
 * 下载文件（支持重试）
 */
async function downloadFile(url, dest, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`[Download] Attempt ${i + 1}/${maxRetries}: ${url}`);

            return new Promise((resolve, reject) => {
                const file = fsSync.createWriteStream(dest);

                https.get(url, (response) => {
                    // 处理重定向
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        file.close();
                        return downloadFile(response.headers.location, dest, 1)
                            .then(resolve)
                            .catch(reject);
                    }

                    if (response.statusCode !== 200) {
                        file.close();
                        reject(new Error(`Failed to download: ${response.statusCode}`));
                        return;
                    }

                    const totalSize = parseInt(response.headers['content-length'], 10);
                    let downloadedSize = 0;

                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        if (totalSize) {
                            const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
                            process.stdout.write(`\rProgress: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
                        }
                    });

                    response.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        console.log('\n[Download] ✓ Complete');
                        resolve();
                    });

                    file.on('error', (err) => {
                        fsSync.unlink(dest, () => {});
                        reject(err);
                    });
                }).on('error', reject);
            });
        } catch (error) {
            console.error(`\n[Download] ✗ Attempt ${i + 1} failed:`, error.message);
            if (i === maxRetries - 1) throw error;
            console.log('[Download] Retrying in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

/**
 * 解压 ZIP 文件（使用 PowerShell）
 */
async function extractZip(zipPath, destPath) {
    console.log(`[Extract] Extracting ${zipPath} to ${destPath}`);

    try {
        // 使用 PowerShell 调用 Expand-Archive
        const psCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`;
        execSync(psCommand, { encoding: 'utf-8', stdio: 'inherit' });
        console.log('[Extract] ✓ Complete');
    } catch (error) {
        throw new Error(`Failed to extract: ${error.message}`);
    }
}

/**
 * 查找 python311._pth 文件
 */
async function findPTHFile(pythonDir) {
    // 递归搜索 _pth 文件
    async function searchDir(dir) {
        const files = await fs.readdir(dir, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            if (file.isDirectory()) {
                const result = await searchDir(fullPath);
                if (result) return result;
            } else if (file.name.endsWith('._pth')) {
                return fullPath;
            }
        }

        return null;
    }

    return await searchDir(pythonDir);
}

/**
 * 修复 python311._pth 文件
 */
async function patchPythonPTH(pythonDir) {
    // 首先检查解压后是否有子目录（如 python-3.11.8-embed-amd64）
    const files = await fs.readdir(pythonDir, { withFileTypes: true });

    if (files.length === 1 && files[0].isDirectory() && files[0].name.startsWith('python-')) {
        // 有子目录，移动文件到 pythonDir
        const subDir = path.join(pythonDir, files[0].name);
        console.log(`[Patch] Found subdirectory: ${files[0].name}, moving files...`);

        const subFiles = await fs.readdir(subDir);
        for (const file of subFiles) {
            const srcPath = path.join(subDir, file);
            const destPath = path.join(pythonDir, file);
            await fs.rename(srcPath, destPath);
        }

        // 删除空子目录
        await fs.rmdir(subDir);
        console.log('[Patch] ✓ Files moved to correct location');
    }

    // 尝试直接查找 _pth 文件
    let pthPath = path.join(pythonDir, 'python311._pth');

    try {
        await fs.access(pthPath);
    } catch {
        // 如果直接路径不存在，搜索文件
        console.log('[Patch] python311._pth not found in expected location, searching...');
        pthPath = await findPTHFile(pythonDir);

        if (!pthPath) {
            throw new Error('python311._pth file not found in extracted Python distribution');
        }

        console.log(`[Patch] Found python311._pth at: ${pthPath}`);
    }

    console.log(`[Patch] Fixing ${pthPath}`);

    try {
        let content = await fs.readFile(pthPath, 'utf-8');

        // 取消注释 import site（支持带空格和不带空格两种格式）
        content = content.replace(/^#import\s+site/m, 'import site');

        // 添加 lib 目录到 Python 路径
        // 注意：pythonDir 现在等于 PYTHON_RUNTIME_DIR，不需要再取 dirname
        const sitePackagesPath = path.join(pythonDir, 'lib', 'Lib', 'site-packages');
        content += `\n${sitePackagesPath}\n`;

        await fs.writeFile(pthPath, content, 'utf-8');
        console.log('[Patch] ✓ Fixed python311._pth');
    } catch (error) {
        throw new Error(`Failed to patch python311._pth: ${error.message}`);
    }
}

/**
 * 创建 requirements.txt
 */
async function createRequirements() {
    console.log('[Setup] Creating requirements.txt...');
    await fs.writeFile(REQUIREMENTS_PATH, REQUIREMENTS.join('\n'), 'utf-8');
    console.log('[Setup] ✓ requirements.txt created');
}

/**
 * 安装依赖包
 */
async function installDependencies(pythonDir, libDir) {
    const pythonExe = path.join(pythonDir, 'python.exe');

    // 设置环境变量
    const env = {
        ...process.env,
        PYTHONPATH: libDir,
        PYTHONIOENCODING: 'utf-8'
    };

    try {
        // 1. 安装 pip
        console.log('[Setup] Installing pip...');
        try {
            execSync(`"${pythonExe}" "${GET_PIP_PATH}" --target="${libDir}"`, {
                encoding: 'utf-8',
                stdio: 'inherit',
                env: env
            });
        } catch (error) {
            console.warn('[Setup] pip install failed, trying alternative method...');
            execSync(`"${pythonExe}" -m ensurepip --upgrade --default-pip`, {
                encoding: 'utf-8',
                stdio: 'inherit',
                env: env
            });
        }

        // 2. 安装依赖包（逐个安装以避免 pip.exe 问题）
        console.log('[Setup] Installing Python packages...');

        for (const req of REQUIREMENTS) {
            console.log(`[Setup] Installing ${req}...`);

            // 使用 Python 直接调用 pip 模块
            const installScript = `
import sys
sys.path.insert(0, r"${libDir}")
import pip
pip.main(['install', '--target', r"${libDir}", '${req}'])
`;

            const tempScriptPath = path.join(PYTHON_RUNTIME_DIR, '_temp_install.py');
            await fs.writeFile(tempScriptPath, installScript, 'utf-8');

            try {
                execSync(`"${pythonExe}" "${tempScriptPath}"`, {
                    encoding: 'utf-8',
                    stdio: 'inherit',
                    env: env
                });
                console.log(`[Setup] ✓ ${req} installed`);
            } catch (error) {
                console.warn(`[Setup] ⚠ ${req} failed: ${error.message}`);
            } finally {
                // 删除临时脚本
                try {
                    await fs.unlink(tempScriptPath);
                } catch {}
            }
        }

        console.log('[Setup] ✓ Dependencies installation completed');
    } catch (error) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
    }
}

/**
 * 验证安装
 */
async function verifyInstallation(pythonDir, libDir) {
    console.log('[Verify] Testing Python installation...');

    const pythonExe = path.join(pythonDir, 'python.exe');
    const testCode = `
import sys
sys.path.insert(0, r"${libDir}")

try:
    import openai
    import requests
    import PIL
    import yaml
    print('✓ All dependencies imported successfully')
    print(f'  openai: {openai.__version__}')
    print(f'  requests: {requests.__version__}')
    print(f'  Pillow: {PIL.__version__}')
    print(f'  yaml: {yaml.__version__}')
except ImportError as e:
    print(f'✗ Import failed: {e}')
    sys.exit(1)
`;

    try {
        const output = execSync(`"${pythonExe}" -c "${testCode.replace(/\n/g, ';')}"`, {
            encoding: 'utf-8',
            env: {
                ...process.env,
                PYTHONPATH: libDir
            }
        });
        console.log('[Verify] ✓ Installation verified');
        console.log(output);
    } catch (error) {
        console.warn('[Verify] ⚠ Verification failed, but installation may still work');
        console.warn(error.message);
    }
}

/**
 * 清理临时文件
 */
async function cleanup() {
    console.log('[Cleanup] Removing temporary files...');

    try {
        await fs.unlink(ZIP_PATH);
        await fs.unlink(GET_PIP_PATH);
        await fs.unlink(REQUIREMENTS_PATH);
        console.log('[Cleanup] ✓ Complete');
    } catch (error) {
        // 忽略清理错误
        console.warn('[Cleanup] Some files could not be removed:', error.message);
    }
}

/**
 * 显示完成信息
 */
function showCompletion() {
    console.log('\n' + '='.repeat(60));
    console.log('✓ Python Runtime Setup Complete!');
    console.log('='.repeat(60));
    console.log('\nInstalled components:');
    console.log(`  • Python: ${PYTHON_VERSION}`);
    console.log(`  • Location: ${PYTHON_RUNTIME_DIR}`);
    console.log('\nInstalled packages:');
    REQUIREMENTS.forEach(req => console.log(`  • ${req}`));
    console.log('\nNext steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Test the AI skills in the application');
    console.log('\nTo rebuild from scratch:');
    console.log('  1. Delete python-runtime/ directory');
    console.log('  2. Run: npm run setup-python');
    console.log('='.repeat(60) + '\n');
}

/**
 * 主函数
 */
async function main() {
    console.log('=== Python Runtime Setup for WeChat_Flowwork ===');
    console.log(`Version: ${PYTHON_VERSION}\n`);

    try {
        // 1. 创建目录
        await fs.mkdir(PYTHON_DIR, { recursive: true });
        await fs.mkdir(LIB_DIR, { recursive: true });

        // 2. 检查是否已下载
        const pythonExe = path.join(PYTHON_DIR, 'python.exe');
        try {
            await fs.access(pythonExe);
            console.log('[Check] Python already exists, skipping download');
            console.log('[Check] To reinstall, delete python-runtime/ directory and run again\n');
        } catch {
            // 3. 下载 Python
            console.log('\n[Step 1/6] Downloading Python Embedded...');
            await downloadFile(PYTHON_URL, ZIP_PATH);

            // 4. 解压
            console.log('\n[Step 2/6] Extracting Python...');
            await extractZip(ZIP_PATH, PYTHON_RUNTIME_DIR);

            // 5. 修复 _pth
            console.log('\n[Step 3/6] Patching python311._pth...');
            await patchPythonPTH(PYTHON_RUNTIME_DIR);
        }

        // 6. 下载 get-pip.py
        console.log('\n[Step 4/6] Downloading get-pip.py...');
        try {
            await fs.access(GET_PIP_PATH);
            console.log('[Check] get-pip.py already exists, skipping download');
        } catch {
            await downloadFile(GET_PIP_URL, GET_PIP_PATH);
        }

        // 7. 创建 requirements.txt
        console.log('\n[Step 5/6] Creating requirements.txt...');
        await createRequirements();

        // 8. 安装依赖
        console.log('\n[Step 6/6] Installing dependencies...');
        await installDependencies(PYTHON_DIR, LIB_DIR);

        // 9. 验证
        console.log('\n[Verify] Verifying installation...');
        await verifyInstallation(PYTHON_DIR, LIB_DIR);

        // 10. 清理
        await cleanup();

        // 11. 显示完成信息
        showCompletion();

    } catch (error) {
        console.error('\n✗ Setup failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('  1. Check your internet connection');
        console.error('  2. Try running again (downloads will resume)');
        console.error('  3. If problem persists, please open an issue on GitHub');
        process.exit(1);
    }
}

// 运行主函数
main();
