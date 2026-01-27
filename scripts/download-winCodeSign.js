const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cacheDir = 'C:\\Users\\Lenovo\\AppData\\Local\\electron-builder\\Cache\\winCodeSign';
// 使用中国镜像
const downloadUrl = 'https://registry.npmmirror.com/-/binary/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';
const tempFile = path.join(__dirname, '../winCodeSign-2.6.0.7z');

console.log('📥 正在从中国镜像下载 winCodeSign 工具...');
console.log('URL:', downloadUrl);

// 下载文件
https.get(downloadUrl, (response) => {
  if (response.statusCode === 200 || response.statusCode === 302) {
    const fileStream = fs.createWriteStream(tempFile);
    response.pipe(fileStream);

    fileStream.on('finish', () => {
      console.log('✅ 下载完成:', tempFile);
      console.log('📦 大小:', (fs.statSync(tempFile).size / 1024 / 1024).toFixed(2), 'MB');

      // 创建缓存目录
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log('✅ 创建缓存目录:', cacheDir);
      }

      // 清理旧的失败文件
      const oldFiles = fs.readdirSync(cacheDir).filter(f => f.includes('.7z') || f.endsWith('.dir'));
      oldFiles.forEach(f => {
        try {
          fs.unlinkSync(path.join(cacheDir, f));
        } catch (e) {
          // 忽略删除失败
        }
      });

      // 使用 PowerShell 解压
      console.log('📦 正在解压...');
      try {
        execSync(`powershell -Command "Expand-Archive -Path '${tempFile}' -DestinationPath '${cacheDir}' -Force"`, {
          stdio: 'inherit'
        });
        console.log('✅ 解压成功！');

        // 验证文件
        const exePath = path.join(cacheDir, 'winCodeSign.exe');
        if (fs.existsSync(exePath)) {
          console.log('✅ 验证成功: winCodeSign.exe 已就绪');
          console.log('\n🚀 现在可以运行: npm run build');
        } else {
          console.error('❌ 验证失败: winCodeSign.exe 不存在');
        }
      } catch (error) {
        console.error('❌ 解压失败:', error.message);
      }
    });
  } else {
    console.error('❌ 下载失败，状态码:', response.statusCode);
    console.log('\n💡 请手动下载:');
    console.log('1. 访问: ' + downloadUrl);
    console.log('2. 保存到: ' + tempFile);
    console.log('3. 解压到: ' + cacheDir);
  }
}).on('error', (err) => {
  console.error('❌ 下载失败:', err.message);
  console.log('\n💡 请手动下载:');
  console.log('1. 访问: ' + downloadUrl);
  console.log('2. 保存到: ' + tempFile);
  console.log('3. 解压到: ' + cacheDir);
});
