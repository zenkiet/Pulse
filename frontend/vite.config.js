import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.DOCKER_CONTAINER ? '0.0.0.0' : 'localhost',
    port: 5173,
    proxy: {
      // Proxy WebSocket connections to the real backend
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      // Proxy API requests to the real backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}); 