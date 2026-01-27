const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.join(__dirname, '../release/win-unpacked');
const outputFile = path.join(__dirname, '../release/SkillMate-2.0.0-Windows-x64-Portable.zip');

console.log('正在创建便携版压缩包...');

try {
  // 检查源目录
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ 源目录不存在:', sourceDir);
    process.exit(1);
  }

  // 使用 PowerShell 的 Compress-Archive
  const command = `powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputFile}' -Force"`;
  execSync(command, { stdio: 'inherit' });

  const stats = fs.statSync(outputFile);
  console.log('✅ 压缩成功!');
  console.log('   文件:', outputFile);
  console.log('   大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  console.log('\n使用方法:');
  console.log('1. 解压 SkillMate-2.0.0-Windows-x64-Portable.zip');
  console.log('2. 运行解压后的 SkillMate.exe');
  console.log('3. 首次运行时配置 API Key');
} catch (error) {
  console.error('❌ 压缩失败:', error.message);
  process.exit(1);
}
