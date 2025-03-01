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
        target: process.env.VITE_API_URL || 'http://localhost:7654',
        ws: true,
      },
      // Proxy API requests to the real backend
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:7654',
        changeOrigin: true,
      }
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Define environment variables that will be available in the frontend code
  define: {
    // Stringify the values to ensure they're treated as strings in the frontend
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
  }
}); 