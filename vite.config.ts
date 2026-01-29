import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
// CommonJS 兼容导入
import obfuscatorPackage from 'rollup-plugin-javascript-obfuscator'
const obfuscator = obfuscatorPackage.default || obfuscatorPackage
// 修复 vite-plugin-electron 的 electron 导入 bug
import { fixElectronImportPlugin } from './vite-plugin-fix-electron-import.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs'
              },
              external: [
                'electron',
                'sqlite3',
                'sequelize',
                'better-sqlite3',
                '@modelcontextprotocol/sdk',
                'electron-updater',
                'electron-log',
                'sharp',
                'jszip'
              ]
            },
          },
          plugins: [
            // 修复 vite-plugin-electron 的 electron 导入 bug
            fixElectronImportPlugin()
          ]
        }
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs'
              },
              external: [
                'electron',
                'sqlite3',
                'sequelize',
                'better-sqlite3',
                '@modelcontextprotocol/sdk',
                'electron-updater',
                'electron-log',
                'sharp',
                'jszip'
              ]
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
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})
