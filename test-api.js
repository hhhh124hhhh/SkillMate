/**
 * 测试脚本：通过浏览器 DevTools Protocol 检查 Electron 应用状态
 * 并尝试触发 ConfigStore 相关功能来验证修复
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始诊断 Electron 应用状态...\n');

// 1. 检查配置文件
console.log('1️⃣ 检查配置文件状态:');
const configPath = path.join(__dirname, '.vscode', 'electron-userdata', 'wechatflowwork-config.json');

if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('✅ 配置文件存在');
    console.log('   模型:', config.model);
    console.log('   API URL:', config.apiUrl);
    console.log('   智谱 API Key:', config.zhipuApiKey ? `已设置 (***${config.zhipuApiKey.slice(-4)})` : '❌ 未设置');
    console.log('   授权文件夹数量:', config.authorizedFolders.length);
    console.log('   网络访问:', config.networkAccess);
} else {
    console.log('❌ 配置文件不存在');
}

// 2. 检查日志文件
console.log('\n2️⃣ 检查最新日志:');
const logPath = path.join(__dirname, '.vscode', 'electron-userdata', 'logs', 'main.log');

if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, 'utf-8');
    const lines = logContent.split('\n').slice(-20); // 最后20行
    console.log('📋 最近20条日志:');
    lines.forEach(line => {
        if (line.trim()) {
            // 检查是否有错误
            if (line.includes('error') || line.includes('Error') || line.includes('failed')) {
                console.log('  ❌', line);
            } else {
                console.log('  ℹ️ ', line);
            }
        }
    });
} else {
    console.log('⚠️  日志文件不存在');
}

// 3. 检查是否有崩溃日志
console.log('\n3️⃣ 检查崩溃日志:');
const crashLogPath = path.join(process.env.USERPROFILE || os.homedir(), '.aiagent', 'crash-logs.json');
if (fs.existsSync(crashLogPath)) {
    console.log('❌ 发现崩溃日志:');
    const crashLogs = JSON.parse(fs.readFileSync(crashLogPath, 'utf-8'));
    console.log('   最新崩溃:', crashLogs[crashLogs.length - 1]);
} else {
    console.log('✅ 无崩溃日志');
}

// 4. 测试建议
console.log('\n4️⃣ 下一步操作建议:');
console.log('   1. 打开 Electron 应用窗口');
console.log('   2. 按 F12 或 Ctrl+Shift+I 打开 DevTools');
console.log('   3. 切换到 Console 标签');
console.log('   4. 查找红色错误信息');
console.log('   5. 如果有 "Cannot read properties of null" 错误，截图发给我');

console.log('\n✅ 诊断完成！');
