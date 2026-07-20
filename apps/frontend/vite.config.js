import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          'vendor-http': ['axios'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-state': ['zustand', 'zustand/middleware'],
          'vendor-datefns': ['date-fns', 'date-fns/locale/ro'],
          'vendor-calendar': ['react-big-calendar'],
          'vendor-dompurify': ['dompurify'],
          'vendor-charts': ['recharts'],
          'vendor-socket': ['socket.io-client'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
});
