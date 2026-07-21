import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isPackage = (id, packageName) =>
  id.replaceAll('\\', '/').includes(`/node_modules/${packageName}/`);

const websiteVendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined;
  if (
    ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'].some((name) =>
      isPackage(id, name)
    )
  ) {
    return 'vendor-react';
  }
  if (['@tanstack/query-core', '@tanstack/react-query'].some((name) => isPackage(id, name))) {
    return 'vendor-query';
  }
  return undefined;
};

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
  server: {
    port: 5175,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: websiteVendorChunk,
      },
    },
  },
});
