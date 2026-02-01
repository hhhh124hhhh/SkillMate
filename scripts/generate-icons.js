const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
// png-to-ico 模块导入
const pngToIco = require('png-to-ico').default || require('png-to-ico')

// 源文件和输出目录
const sourceSvg = path.join(__dirname, '..', 'public', 'logo-skillmate-hexagon.svg')
const buildDir = path.join(__dirname, '..', 'build')
const icoFile = path.join(buildDir, 'icon.ico')
const pngDir = path.join(buildDir, 'icons', 'png')

// 定义所有需要的尺寸
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]

async function generateIcons() {
  console.log('🎨 Generating application icons...')
  console.log(`   Source: ${sourceSvg}`)

  try {
    // 1. 确保输出目录存在
    await fs.promises.mkdir(pngDir, { recursive: true })

    // 2. 生成 PNG 图标
    console.log('\n📦 Generating PNG icons...')
    for (const size of sizes) {
      const pngPath = path.join(pngDir, `${size}x${size}.png`)

      await sharp(sourceSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(pngPath)

      console.log(`  ✓ Generated ${size}x${size}.png`)
    }

    // 3. 生成 ICO 文件（包含多个尺寸）
    console.log('\n📦 Generating ICO file...')
    const pngFiles = [16, 32, 48, 256].map(size =>
      path.join(pngDir, `${size}x${size}.png`)
    )

    const icoBuffer = await pngToIco(pngFiles)
    await fs.promises.writeFile(icoFile, icoBuffer)
    console.log('  ✓ Generated icon.ico')

    // 4. 验证生成的文件
    const icoStats = await fs.promises.stat(icoFile)
    console.log(`\n✅ Icons generated successfully!`)
    console.log(`   ICO size: ${(icoStats.size / 1024).toFixed(1)} KB`)
    console.log(`   Location: ${buildDir}`)

  } catch (error) {
    console.error('\n❌ Icon generation failed:', error.message)
    process.exit(1)
  }
}

// 运行
generateIcons()
