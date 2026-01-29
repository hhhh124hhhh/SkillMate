import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  resolve: {
    // 使用别名简化导入
    alias: {
      '@': path.resolve(__dirname, '..', 'src')
    }
  },

  build: {
    target: 'node20',
    lib: {
      entry: path.resolve(__dirname, '..', 'electron', 'main.ts'),
      formats: ['cjs'],
      fileName: 'main.cjs'
    },
    outDir: path.resolve(__dirname, '..', '.vite', 'build'),
    emptyOutDir: true,
    rollupOptions: {
      external: [
        // Electron 内置模块
        'electron',
        'electron/main',
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
    sourcemap: process.env.NODE_ENV !== 'production'
  }
})
