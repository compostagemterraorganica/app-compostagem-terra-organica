import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5900,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 300
    },
    hmr: {
      clientPort: Number(process.env.PORT) || 5900
    },
    proxy: {
      '/api': {
        // API local do monorepo (docker-compose root: 5700→3000)
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5700',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
