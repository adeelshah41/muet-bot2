import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Allow external access
    port: 5173,
    strictPort: false,
    // Allow all hosts for development (ngrok, localtunnel, etc.)
    allowedHosts: [
      'muet.thebotss.com',
      'localhost',
      '.localhost',
      '127.0.0.1',
      '0.0.0.0',
      '.ngrok.io',
      '.ngrok-free.app',
    ],
    hmr: {
      overlay: false, // Disable error overlay that might cause issues
    },
    cors: true,
  },
  // Hardcoded backend proxy (optional, but can help with requests)
  // Comment this out if you want direct requests to 98.93.38.52:8000
  /*
  proxy: {
    '/api': {
      target: 'http://98.93.38.52:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
  */
})
