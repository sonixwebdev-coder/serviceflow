import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const dependencyChunk = (id) => {
  const modulePath = id.replaceAll('\\', '/');
  if (!modulePath.includes('/node_modules/')) return undefined;

  if (
    /\/node_modules\/(?:react|react-dom|react-router|react-router-dom|scheduler|react-is)\//.test(
      modulePath
    )
  ) {
    return 'vendor-react';
  }
  if (modulePath.includes('/node_modules/@tanstack/')) return 'vendor-query';
  if (modulePath.includes('/node_modules/axios/')) return 'vendor-http';
  if (/\/node_modules\/(?:d3-[^/]+|internmap)\//.test(modulePath)) return 'vendor-d3';
  if (
    /\/node_modules\/(?:recharts|recharts-scale|react-smooth|decimal\.js-light|fast-equals|eventemitter3|lodash|lodash-es|clsx|prop-types)\//.test(
      modulePath
    )
  ) {
    return 'vendor-charts';
  }

  return undefined;
};

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
  server: {
    port: 5176,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: dependencyChunk,
      },
    },
  },
});
