import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: 'electron/main.ts',
        formats: ['cjs'],
        fileName: 'main.cjs'
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: 'electron/preload.ts',
        formats: ['cjs'],
        fileName: 'preload.cjs'
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: 'index.html'
      }
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    plugins: [react()]
  }
})
