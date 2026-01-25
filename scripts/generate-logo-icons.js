/**
 * SkillMate Logo Icon Generator
 * 从 SVG 源文件生成多尺寸 PNG 图标
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  inputDir: path.join(__dirname, '../public'),
  outputDir: path.join(__dirname, '../public/icons'),

  // 需要生成的尺寸
  sizes: [16, 24, 32, 48, 64, 128, 256, 512, 1024],

  // SVG 源文件
  sources: [
    { name: 'hexagon', file: 'logo-skillmate-hexagon.svg' },
    { name: 'robot', file: 'logo-skillmate-robot.svg' },
    { name: 'robot-thinking', file: 'robot-thinking.svg' },
    { name: 'robot-success', file: 'robot-success.svg' },
    { name: 'robot-error', file: 'robot-error.svg' },
    { name: 'robot-welcome', file: 'robot-welcome.svg' }
  ]
};

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 生成单个图标的多个尺寸
 */
async function generateIconSizes(sourceFile, iconName) {
  const sourcePath = path.join(CONFIG.inputDir, sourceFile);

  // 检查源文件是否存在
  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠️  源文件不存在: ${sourceFile}`);
    return;
  }

  console.log(`\n📦 生成 ${iconName} 图标...`);

  for (const size of CONFIG.sizes) {
    const outputDir = path.join(CONFIG.outputDir, `${size}x${size}`, iconName);
    ensureDir(outputDir);

    const outputFile = path.join(outputDir, `icon-${size}.png`);

    try {
      await sharp(sourcePath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png({
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputFile);

      console.log(`  ✅ ${size}x${size} → ${outputFile}`);
    } catch (error) {
      console.error(`  ❌ ${size}x${size} 失败:`, error.message);
    }
  }
}

/**
 * 生成主图标（用于应用图标）
 */
async function generateMainIcon() {
  console.log('\n🎯 生成主应用图标...');

  const sourcePath = path.join(CONFIG.inputDir, 'logo-skillmate-hexagon.svg');
  const mainSizes = [32, 48, 64, 128, 256, 512];

  for (const size of mainSizes) {
    const outputDir = path.join(CONFIG.outputDir, `${size}x${size}`);
    ensureDir(outputDir);

    const outputFile = path.join(outputDir, 'icon.png');

    try {
      await sharp(sourcePath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png({
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputFile);

      console.log(`  ✅ icon-${size}.png`);
    } catch (error) {
      console.error(`  ❌ icon-${size}.png 失败:`, error.message);
    }
  }

  // 更新 public/icon.png (512x512)
  try {
    const mainIcon = path.join(CONFIG.inputDir, 'icon.png');
    await sharp(sourcePath)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center'
      })
      .png({
        quality: 100,
        compressionLevel: 9
      })
      .toFile(mainIcon);
    console.log(`  ✅ public/icon.png 已更新`);
  } catch (error) {
    console.error(`  ❌ public/icon.png 失败:`, error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  SkillMate Logo Icon Generator');
  console.log('========================================');

  // 确保输出目录存在
  ensureDir(CONFIG.outputDir);

  // 生成主图标
  await generateMainIcon();

  // 生成所有变体图标
  for (const source of CONFIG.sources) {
    await generateIconSizes(source.file, source.name);
  }

  console.log('\n✨ 所有图标生成完成！');
  console.log(`📁 输出目录: ${CONFIG.outputDir}`);
  console.log('\n下一步:');
  console.log('  1. 在 Windows/macOS 上测试图标显示效果');
  console.log('  2. 如果需要 ICO/ICNS 格式，使用专用工具转换');
  console.log('  3. 更新 Electron 配置中的图标路径');
}

// 运行
main().catch(console.error);
