import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isPackage = (id, packageName) =>
  id.replaceAll('\\', '/').includes(`/node_modules/${packageName}/`);

const portalVendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined;

  if (['react', 'react-dom', 'scheduler'].some((name) => isPackage(id, name))) {
    return 'vendor-react';
  }
  if (['react-router', 'react-router-dom'].some((name) => isPackage(id, name))) {
    return 'vendor-router';
  }
  if (['@tanstack/query-core', '@tanstack/react-query'].some((name) => isPackage(id, name))) {
    return 'vendor-query';
  }
  if (isPackage(id, 'axios')) return 'vendor-http';
  if (
    [
      '@socket.io/component-emitter',
      'engine.io-client',
      'engine.io-parser',
      'socket.io-client',
      'socket.io-parser',
    ].some((name) => isPackage(id, name))
  ) {
    return 'vendor-realtime';
  }
  if (['class-variance-authority', 'clsx', 'tailwind-merge'].some((name) => isPackage(id, name))) {
    return 'vendor-ui';
  }

  return undefined;
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: portalVendorChunk,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
});
