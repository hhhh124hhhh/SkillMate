import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
// CommonJS 兼容导入
import obfuscatorPackage from 'rollup-plugin-javascript-obfuscator'
const obfuscator = obfuscatorPackage.default || obfuscatorPackage

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: [
                'sqlite3',
                'sequelize',
                'better-sqlite3',
                '@modelcontextprotocol/sdk'
              ],
            },
          },
          plugins: [
            obfuscator({
              compact: true,                    // 压缩代码
              controlFlowFlattening: false,     // 控制流扁平化(影响性能,关闭)
              deadCodeInjection: false,         // 死代码注入(影响性能,关闭)
              stringArray: true,                // 字符串数组化
              stringArrayThreshold: 0.5,        // 字符串混淆比例(0.5 平衡性能和安全)
              transformObjectKeys: true,        // 对象键转换
              identifierNamesGenerator: 'hex',  // 标识符名称生成器
              ignoreImports: true,              // 忽略 import 语句(避免破坏模块系统)
              debugProtection: false,           // 调试保护(影响开发,关闭)
              disableConsoleOutput: false       // 保留 console 输出(便于调试)
            })
          ]
        }
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              external: [
                'sqlite3',
                'sequelize',
                'better-sqlite3',
                '@modelcontextprotocol/sdk'
              ],
            },
          },
          plugins: [
            obfuscator({
              compact: true,
              stringArray: true,
              stringArrayThreshold: 0.5,
              ignoreImports: true,
              disableConsoleOutput: false
            })
          ]
        }
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
})
