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
            // Temporarily disable obfuscator to debug electron import issue
            // obfuscator({
            //   compact: true,
            //   controlFlowFlattening: false,
            //   deadCodeInjection: false,
            //   stringArray: true,
            //   stringArrayThreshold: 0.5,
            //   transformObjectKeys: true,
            //   identifierNamesGenerator: 'hex',
            //   ignoreImports: true,
            //   debugProtection: false,
            //   disableConsoleOutput: false
            // })
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
