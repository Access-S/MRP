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
    // The `allowedHosts` block is not strictly necessary when using the proxy,
    // but we can leave it as it doesn't cause harm.
    allowedHosts: [
        '5173-accesss-mrp-h4fgsbefng0.ws-us121.gitpod.io'
    ],
    // --- THIS IS THE UPDATED PROXY CONFIGURATION ---
    proxy: {
      // Any request from your frontend starting with /api...
      '/api': {
        // ...will be forwarded to your backend server running on port 3001
        // Inside Codespaces/Gitpod, services can talk to each other via localhost.
        target: 'http://localhost:3001',
        
        // This header is important for virtual hosts
        changeOrigin: true,

        // We REMOVE the rewrite rule. A request to '/api/forecasts' should
        // go to the backend as '/api/forecasts', not '/forecasts'.
      },
    },
  },
})