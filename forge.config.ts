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

      // 生成应用图标
      // const { execSync } = await import('node:child_process')
      // try {
      //   console.log('  → Generating application icons...')
      //   execSync('npm run generate-icons', { stdio: 'inherit' })
      // } catch (error) {
      //   console.warn('  ⚠️  Icon generation failed, continuing...')
      // }
      console.log('  → Skipped Python setup and icon generation (dev mode)')
    },

    postPackage: async (forgeConfig: any) => {
      console.log('🔧 [Forge Hook] Running post-package tasks...')

      // 混淆 preload 脚本
      const { execSync } = await import('node:child_process')
      try {
        const packagePath = path.resolve(
          forgeConfig.outputPath || 'out',
          forgeConfig.packageJSON.name || 'SkillMate',
          process.platform === 'win32' ? 'resources' : 'SkillMate.app/Contents/Resources'
        )

        const preloadPath = path.join(packagePath, 'app.asar.unpacked', 'preload.cjs')

        if (require('node:fs').existsSync(preloadPath)) {
          console.log('  → Obfuscating preload script...')
          // 这里可以添加混淆逻辑，如果需要的话
          // 目前保持原样，因为 Vite 插件已经处理了混淆
        }
      } catch (error) {
        console.warn('  ⚠️  Post-package obfuscation failed:', error)
      }
    }
  },

  packagerConfig: {
    name: 'SkillMate',
    icon: path.resolve(__dirname, 'build', 'icon'),
    asar: true,
    asarUnpack: [
      'resources/skills/**/*',
      'python-runtime/**/*',
      'node_modules/sharp/**/*',
      'node_modules/@modelcontextprotocol/sdk/**/*'
    ],
    extraResource: [
      'python-runtime',
      'resources/skills'
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
      /^\/out\//,                         // 之前的打包输出
      /^\/release\///                        // 发布文件
    ]
  },

  rebuildConfig: {
    onlyModules: ['sharp', '@modelcontextprotocol/sdk'],
    force: false
  },

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
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
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
            config: 'forge/vite.preload.config.ts'
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
