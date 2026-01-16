#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SOURCE_SVG = path.join(ROOT, 'public', 'logo_new.svg');
const BUILD_DIR = path.join(ROOT, 'build');
const PUBLIC_DIR = path.join(ROOT, 'public');

// Linux 图标尺寸
const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512];

// Windows ICO 尺寸
const WINDOWS_SIZES = [16, 32, 48, 256];

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 生成指定尺寸的 PNG 图标
 */
async function generatePng(size, outputPath) {
  try {
    await sharp(SOURCE_SVG)
      .resize(size, size, {
        fit: 'cover',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated: ${outputPath}`);
  } catch (error) {
    throw new Error(`Failed to generate PNG ${size}x${size}: ${error.message}`);
  }
}

/**
 * 生成 Windows ICO 文件
 */
async function generateIco() {
  console.log('\n📦 Generating Windows ICO...');

  const tempPngs = [];

  try {
    // 生成所需的 PNG 尺寸
    for (const size of WINDOWS_SIZES) {
      const tempPath = path.join(BUILD_DIR, `temp_${size}x${size}.png`);
      await generatePng(size, tempPath);
      tempPngs.push(tempPath);
    }

    // 合并为 ICO
    const icoPath = path.join(BUILD_DIR, 'icon.ico');
    const icoBuffer = await pngToIco(tempPngs);
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`✓ Generated: ${icoPath}`);

    // 清理临时文件
    tempPngs.forEach(p => {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    });
  } catch (error) {
    // 清理临时文件
    tempPngs.forEach(p => {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    });
    throw new Error(`Failed to generate ICO: ${error.message}`);
  }
}

/**
 * 生成 macOS ICNS 文件
 */
async function generateIcns() {
  console.log('\n📦 Generating macOS ICNS...');

  const icnsPath = path.join(BUILD_DIR, 'icon.icns');

  // 检查是否已存在 ICNS 文件（非 macOS 平台）
  if (fs.existsSync(icnsPath) && process.platform !== 'darwin') {
    console.log('✓ Using existing icon.icns (generated on macOS)');
    return;
  }

  // 如果不是 macOS 且不存在 ICNS 文件
  if (process.platform !== 'darwin') {
    console.warn('⚠️  ICNS generation requires macOS.');
    console.warn('   The build will fail on macOS if icon.icns is missing.');
    console.warn('   Run this script on a Mac to generate the ICNS file.');
    console.warn('   Or manually generate ICNS from an online tool and save to build/icon.icns');
    return;
  }

  try {
    // macOS 需要的尺寸
    const macSizes = [16, 32, 64, 128, 256, 512, 1024];
    const iconsetDir = path.join(BUILD_DIR, 'icon.iconset');

    ensureDir(iconsetDir);

    // 生成所有尺寸
    for (const size of macSizes) {
      const isRetina = size > 512;
      const baseSize = isRetina ? size / 2 : size;

      // 普通尺寸
      const normalPath = path.join(iconsetDir, `icon_${baseSize}x${baseSize}.png`);
      await generatePng(baseSize, normalPath);

      // Retina 尺寸
      const retinaPath = path.join(iconsetDir, `icon_${baseSize}x${baseSize}@2x.png`);
      await generatePng(size, retinaPath);
    }

    // 使用 iconutil 生成 ICNS
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, {
      stdio: 'inherit'
    });
    console.log(`✓ Generated: ${icnsPath}`);

    // 清理临时目录
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  } catch (error) {
    // 清理临时目录
    const iconsetDir = path.join(BUILD_DIR, 'icon.iconset');
    if (fs.existsSync(iconsetDir)) {
      fs.rmSync(iconsetDir, { recursive: true, force: true });
    }
    throw new Error(`Failed to generate ICNS: ${error.message}`);
  }
}

/**
 * 生成 Linux PNG 图标集
 */
async function generateLinuxIcons() {
  console.log('\n📦 Generating Linux PNG icons...');

  const iconsDir = path.join(BUILD_DIR, 'icons');
  ensureDir(iconsDir);

  for (const size of LINUX_SIZES) {
    await generatePng(
      size,
      path.join(iconsDir, `${size}x${size}.png`)
    );
  }
}

/**
 * 生成运行时图标（用于托盘和窗口）
 */
async function generateRuntimeIcon() {
  console.log('\n📦 Generating runtime icon (512x512)...');

  const iconPath = path.join(PUBLIC_DIR, 'icon.png');
  await generatePng(512, iconPath);
}

/**
 * 主函数
 */
async function main() {
  console.log('🎨 Starting icon generation from SVG...\n');

  // 检查源文件
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error(`❌ Source SVG not found: ${SOURCE_SVG}`);
    process.exit(1);
  }

  try {
    // 确保构建目录存在
    ensureDir(BUILD_DIR);

    // 生成各平台图标
    await generateRuntimeIcon();  // 用于开发环境和托盘
    await generateLinuxIcons();   // Linux
    await generateIco();          // Windows
    await generateIcns();         // macOS

    console.log('\n✅ All icons generated successfully!');
    console.log('\n📁 Output files:');
    console.log(`   - ${path.join(PUBLIC_DIR, 'icon.png')} (512x512)`);
    console.log(`   - ${path.join(BUILD_DIR, 'icon.ico')} (Windows)`);
    console.log(`   - ${path.join(BUILD_DIR, 'icon.icns')} (macOS)`);
    console.log(`   - ${path.join(BUILD_DIR, 'icons/*.png')} (Linux)`);

  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 执行主函数
main();
