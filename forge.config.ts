import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerDeb } from '@electron-forge/maker-deb'
import MakerZip from '@electron-forge/maker-zip'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config = {
  hooks: {
    generateAssets: async (forgeConfig: any) => {
      console.log('🔧 [Forge Hook] Running pre-package tasks...')

      // ⚠️ 临时跳过 Python runtime 设置（加快启动速度）
      // const { execSync } = await import('node:child_process')
      // try {
      //   console.log('  → Setting up Python runtime...')
      //   execSync('npm run setup-python', { stdio: 'inherit' })
      // } catch (error) {
      //   console.warn('  ⚠️  Python runtime setup failed, continuing...')
      // }

      // 生成应用图标（启用以确保图标一致性）
      const { execSync } = await import('node:child_process')
      try {
        console.log('  → Generating application icons...')
        execSync('npm run generate-icons', { stdio: 'inherit' })
        console.log('  ✅ Icons generated successfully')
      } catch (error) {
        console.warn('  ⚠️  Icon generation failed, continuing...')
      }
    },

    postPackage: async (forgeConfig: any) => {
      console.log('🔧 [Forge Hook] Running post-package tasks...')

      const fs = await import('node:fs')
      const path = await import('node:path')

      try {
        // 简化路径构建，直接使用已知输出目录
        const platform = process.platform
        const arch = process.arch
        const appName = 'SkillMate'

        let packagePath: string
        if (platform === 'win32') {
          packagePath = path.resolve('out', `${appName}-${platform}-${arch}`, 'resources')
        } else if (platform === 'darwin') {
          packagePath = path.resolve('out', `${appName}-mac-${arch}`, `${appName}.app`, 'Contents', 'Resources')
        } else {
          packagePath = path.resolve('out', `${appName}-${platform}-${arch}`, 'resources')
        }

        // 🔧 手动复制 preload.cjs 到 app.asar.unpacked
        // 查找可能的 preload.cjs 位置
        const possiblePaths = [
          path.resolve(process.cwd(), '.vite', 'build', 'preload.cjs'),
          path.resolve(process.cwd(), 'dist-electron', 'preload.cjs'),
          path.resolve(process.cwd(), 'out', `${appName}-${platform}-${arch}`, 'resources', '.vite', 'build', 'preload.cjs')
        ]

        let preloadSource: string | null = null
        for (const testPath of possiblePaths) {
          if (fs.existsSync(testPath)) {
            preloadSource = testPath
            console.log(`  🔍 Found preload.cjs at: ${testPath}`)
            break
          }
        }

        if (preloadSource) {
          const unpackedDir = path.join(packagePath, 'app.asar.unpacked')
          fs.mkdirSync(unpackedDir, { recursive: true })
          const preloadDest = path.join(unpackedDir, 'preload.cjs')
          fs.copyFileSync(preloadSource, preloadDest)
          console.log('  ✅ Copied preload.cjs to app.asar.unpacked')
        } else {
          console.warn('  ⚠️  preload.cjs not found in any expected location')
          console.warn('     Searched:', possiblePaths.join(', '))
        }
      } catch (error) {
        console.warn('  ⚠️  Post-package tasks failed:', error)
      }
    }
  },

  packagerConfig: {
    name: 'SkillMate',
    icon: path.resolve(__dirname, 'build', 'icon'),
    asar: true,
    asarUnpack: [
      'resources/skills/**/*',
      'build/**/*',  // ✅ 添加：确保图标文件被解包到 app.asar.unpacked
      // 'python-runtime/**/*',  // ⚠️ 暂时禁用：文件结构损坏，缺少 INSTALLER 文件
      'node_modules/sharp/**/*',
      'node_modules/@modelcontextprotocol/sdk/**/*'
    ],
    extraResource: [
      // 'python-runtime',  // ⚠️ 暂时禁用：同上
      'resources/skills',
      'resources/mcp-templates.json'  // 修复：确保 MCP 模板文件被打包到正确位置
    ],
    ignore: [
      /^\/src/,
      /^\/test-electron-/,
      /^\/\.vscode/,
      /^\/\.git/,
      /^\/node_modules\/\.cache/,
      /^\/dist-electron/,
      /^\/\.vscode\/electron-userdata/,  // 开发模式配置
      /^\/\.env/,                          // 环境变量（可能包含敏感信息）
      /^\/\.trae/,                         // 文档目录（可能包含敏感信息）
      /^\/out\//,                         // 之前的打包输出
      /^\/release\//                       // 发布文件
    ]
  },

  // ⚠️ 暂时禁用 rebuild（避免网络超时）
  // rebuildConfig: {
  //   onlyModules: ['sharp', '@modelcontextprotocol/sdk'],
  //   force: false
  // },

  makers: [
    new MakerSquirrel({
      name: 'SkillMate',
      authors: 'SkillMate Team',
      description: 'AI技能生态系统平台 - 激发人性的公众号创作AI助手',
      setupIcon: path.resolve(__dirname, 'build', 'icon.ico'),
      loadingGif: path.resolve(__dirname, 'build', 'install-spinner.gif'),
      // 远程更新服务器配置
      // remoteReleases: 'https://github.com/yourusername/skill-mate'
    }),

    new MakerDMG({
      background: path.resolve(__dirname, 'build', 'background.png'),
      format: 'ULFO',
      contents: (opts: any) => [
        {
          x: 130,
          y: 240
        },
        {
          x: 410,
          y: 240,
          type: 'link',
          path: '/Applications'
        }
      ],
      icon: path.resolve(__dirname, 'build', 'icon.icns')
    }),

    new MakerDeb({
      options: {
        maintainer: 'SkillMate Team',
        homepage: 'https://github.com/yourusername/skill-mate',
        icon: path.resolve(__dirname, 'build', 'icon.png')
      }
    }),

    new MakerZip({})
  ],

  plugins: [
    // ⚠️ 暂时禁用 auto-unpack-natives（可能导致网络超时）
    // {
    //   name: '@electron-forge/plugin-auto-unpack-natives',
    //   config: {}
    // },
    // Fuses插件暂时禁用，配置较复杂，可后续启用
    // {
    //   name: '@electron-forge/plugin-fuses',
    //   config: {
    //     [FuseVersion.V1]: {
    //       [FuseV1Options.RunAsNode]: false,
    //       [FuseV1Options.EnableCookieEncryption]: true,
    //       [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    //       [FuseV1Options.EnableNodeCliInspectArguments]: false,
    //       [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    //       [FuseV1Options.OnlyLoadAppFromAsar]: true
    //     }
    //   }
    // },
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // Vite 主进程和预加载脚本配置
        build: [
          {
            entry: 'electron/main.ts',
            config: 'forge/vite.main.config.ts',
            target: 'main'
          },
          {
            entry: 'electron/preload.ts',
            config: 'forge/vite.preload.config.ts',
            target: 'preload'  // 🔧 添加 target 属性
          }
        ],
        // Vite 渲染进程配置
        renderer: [
          {
            name: 'main_window',
            config: 'forge/vite.renderer.config.ts'
          }
        ]
      }
    }
  ]
}

export default config
