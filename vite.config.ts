// BLOCK 1: Imports
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BLOCK 2: Vite Configuration
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://solid-tribble-pj66gpw7957vh9p65-3001.app.github.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})