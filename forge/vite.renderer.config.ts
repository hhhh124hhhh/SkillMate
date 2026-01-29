import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  publicDir: 'public',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', 'src')
    }
  },

  build: {
    target: 'chrome116',
    outDir: path.resolve(__dirname, '..', '.vite', 'renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, '..', 'index.html')
    }
  },

  plugins: [react()],

  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173
    }
  },

  // 优化配置
  optimizeDeps: {
    include: ['react', 'react-dom', '@anthropic-ai/sdk']
  }
})
