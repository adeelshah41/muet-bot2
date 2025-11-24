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
      clientPort: 443, // For ngrok HTTPS
    },
  },
})
