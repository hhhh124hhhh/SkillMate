/**
 * MCP 配置诊断脚本
 * 用于验证百度搜索配置是否正确保存
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(require('os').homedir(), '.aiagent', 'mcp.json');

console.log('='.repeat(60));
console.log('MCP 配置诊断');
console.log('='.repeat(60));

// 1. 检查配置文件是否存在
if (!fs.existsSync(configPath)) {
  console.log('❌ 配置文件不存在:', configPath);
  console.log('\n请先在设置中配置 MCP 服务器');
  process.exit(1);
}

console.log('✅ 配置文件存在:', configPath);

// 2. 读取配置
const content = fs.readFileSync(configPath, 'utf-8');
let config;
try {
  config = JSON.parse(content);
} catch (e) {
  console.log('❌ 配置文件 JSON 格式错误:', e.message);
  process.exit(1);
}

console.log('✅ 配置文件格式正确\n');

// 3. 检查百度搜索配置
const baiduConfig = config.mcpServers?.['baidu-search'];
if (!baiduConfig) {
  console.log('❌ 未找到百度搜索配置\n');
  console.log('请在设置中添加"百度千帆AI搜索"服务器');
  process.exit(1);
}

console.log('✅ 找到百度搜索配置');
console.log('配置详情:');
console.log('  - 类型:', baiduConfig.type);
console.log('  - URL:', baiduConfig.baseUrl);
console.log('  - 禁用:', baiduConfig.disabled ? '是' : '否');

// 4. 检查 Authorization header
const authHeader = baiduConfig.headers?.['Authorization'];
if (!authHeader) {
  console.log('\n❌ 未找到 Authorization header\n');
  console.log('请在配置中添加 Authorization header');
  process.exit(1);
}

console.log('\nAuthorization header:');
console.log('  值:', authHeader);

// 5. 检查是否为占位符
const isPlaceholder = authHeader.includes('YOUR_') ||
                       authHeader.includes('API_KEY_HERE');

if (isPlaceholder) {
  console.log('\n⚠️  警告: Authorization header 仍然是占位符！');
  console.log('\n请按以下步骤配置:');
  console.log('1. 访问 https://console.bce.baidu.com/qianfan/planet/apiKey');
  console.log('2. 创建 API Key（服务选择「千帆 AppBuilder」）');
  console.log('3. 将占位符替换为实际的 API Key');
  console.log('4. 格式应该是: Bearer bce-v3/ALTAK...Altc/...');
  console.log('5. 确保 "disabled" 设置为 false');
  console.log('\n然后在设置中:');
  console.log('  a) 点击"百度千帆AI搜索"的编辑按钮');
  console.log('  b) 修改 Authorization header');
  console.log('  c) 点击"保存配置"按钮');
  console.log('  d) 点击底部的"保存并应用"按钮');
  process.exit(1);
}

console.log('\n✅ Authorization header 已填写');

// 6. 检查格式
if (!authHeader.startsWith('Bearer ')) {
  console.log('\n❌ Authorization header 格式错误！');
  console.log('当前格式:', authHeader);
  console.log('正确格式应该是: Bearer bce-v3/ALTAK...Altc/...');
  console.log('注意: Bearer 后面应该是空格，不是加号');
  process.exit(1);
}

console.log('✅ Authorization header 格式正确\n');

// 7. 检查是否禁用
if (baiduConfig.disabled) {
  console.log('⚠️  警告: 百度搜索服务器被禁用了！');
  console.log('\n请在配置中将 "disabled" 设置为 false\n');
  process.exit(1);
}

console.log('✅ 百度搜索服务器已启用\n');

// 8. 验证 API Key 格式
const apiKey = authHeader.replace('Bearer ', '');
if (!apiKey.startsWith('bce-v3/')) {
  console.log('⚠️  警告: API Key 格式可能不正确');
  console.log('当前格式:', apiKey.substring(0, 20) + '...');
  console.log('千帆 AppBuilder API Key 应该以 "bce-v3/" 开头\n');
  console.log('请确认您创建 API Key 时选择了"千帆 AppBuilder"服务');
  process.exit(1);
}

console.log('✅ API Key 格式正确\n');

// 全部检查通过
console.log('='.repeat(60));
console.log('🎉 所有检查通过！');
console.log('='.repeat(60));
console.log('\n配置摘要:');
console.log('  • URL:', baiduConfig.baseUrl);
console.log('  • Authorization:', authHeader.substring(0, 30) + '...');
console.log('  • 状态: 已启用');
console.log('\n重启应用后应该可以正常连接百度搜索服务\n');
