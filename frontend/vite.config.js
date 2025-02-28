import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy WebSocket connections to the backend
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      // Proxy API requests to the backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    },
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}); 