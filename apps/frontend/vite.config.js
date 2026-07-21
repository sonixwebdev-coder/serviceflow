import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isPackage = (id, packageName) =>
  id.replaceAll('\\', '/').includes(`/node_modules/${packageName}/`);

const frontendVendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined;

  if (
    ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'].some((name) =>
      isPackage(id, name)
    )
  ) {
    return 'vendor-react';
  }
  if (isPackage(id, 'axios')) return 'vendor-http';
  if (['@tanstack/query-core', '@tanstack/react-query'].some((name) => isPackage(id, name))) {
    return 'vendor-query';
  }
  if (isPackage(id, 'zustand')) return 'vendor-state';
  if (isPackage(id, 'date-fns')) return 'vendor-datefns';
  if (isPackage(id, 'react-big-calendar')) return 'vendor-calendar';
  if (isPackage(id, 'dompurify')) return 'vendor-dompurify';
  if (isPackage(id, 'recharts')) return 'vendor-charts';
  if (isPackage(id, 'socket.io-client')) return 'vendor-socket';
  if (
    ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'].some((name) => isPackage(id, name))
  ) {
    return 'vendor-dnd';
  }

  return undefined;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  oxc: { jsx: { runtime: 'automatic' } },
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
        manualChunks: frontendVendorChunk,
      },
    },
  },
});
