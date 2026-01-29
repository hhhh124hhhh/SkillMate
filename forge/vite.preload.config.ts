import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import obfuscatorPackage from 'rollup-plugin-javascript-obfuscator'

const obfuscator = obfuscatorPackage.default || obfuscatorPackage
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  build: {
    target: 'node20',
    lib: {
      entry: path.resolve(__dirname, '..', 'electron', 'preload.ts'),
      formats: ['cjs'],
      fileName: 'preload.cjs'
    },
    outDir: path.resolve(__dirname, '..', '.vite', 'build'),
    emptyOutDir: true,
    rollupOptions: {
      external: [
        // Electron 内置模块
        'electron',
        'electron/common',

        // 原生模块
        'sqlite3',
        'sequelize',
        'better-sqlite3',
        'sharp',
        '@modelcontextprotocol/sdk',

        // 其他 Node.js 专用模块
        'electron-updater',
        'electron-log',
        'electron-store',
        'jszip'
      ],
      output: {
        entryFileNames: '[name].cjs'
      }
    },
    // 优化生产构建
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    sourcemap: false  // 预加载脚本不生成 sourcemap
  },

  plugins: [
    // 生产环境代码混淆
    ...(process.env.NODE_ENV === 'production'
      ? [
          obfuscator({
            compact: true,
            stringArray: true,
            stringArrayThreshold: 0.5,
            transformObjectKeys: true,
            ignoreImports: true,
            disableConsoleOutput: false
          })
        ]
      : [])
  ]
})
