// BLOCK 1: Imports
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BLOCK 2: Vite Configuration
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    hmr: {
        clientPort: 443
    },
    allowedHosts: [
        '5173-accesss-mrp-h4fgsbefng0.ws-us121.gitpod.io'
    ],
    proxy: {
      '/api': {
        target: 'https://3001-accesss-mrp-h4fgsbefng0.ws-us121.gitpod.io',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})