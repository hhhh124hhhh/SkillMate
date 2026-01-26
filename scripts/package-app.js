const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.join(__dirname, '../release/win-unpacked');
const outputFile = path.join(__dirname, '../release/SkillMate-2.0.0-Windows-x64.zip');

console.log('正在打包应用程序...');

try {
  // 使用 PowerShell 的 Compress-Archive，但以不同方式
  const command = `powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputFile}' -Force"`;
  execSync(command, { stdio: 'inherit' });
  console.log('✅ 打包成功:', outputFile);
} catch (error) {
  console.error('❌ 打包失败:', error.message);

  // 如果 PowerShell 失败，尝试使用 7-Zip
  try {
    console.log('尝试使用 7-Zip...');
    const sevenZip = path.join(__dirname, '../node_modules/7zip-bin/win/x64/7za.exe');
    const command = `"${sevenZip}" a -tzip "${outputFile}" "${sourceDir}\\*"`;
    execSync(command, { stdio: 'inherit' });
    console.log('✅ 打包成功 (7-Zip):', outputFile);
  } catch (error2) {
    console.error('❌ 7-Zip 也失败了:', error2.message);
    process.exit(1);
  }
}
