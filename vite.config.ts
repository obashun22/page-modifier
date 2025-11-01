import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') {
            return 'src/content/content-script.js';
          }
          if (chunkInfo.name === 'background') {
            return 'src/background/service-worker.js';
          }
          if (chunkInfo.name === 'sidepanel') {
            return 'src/sidepanel/sidepanel.js';
          }
          return 'src/[name]/[name].js';
        },
        chunkFileNames: (chunkInfo) => {
          // Don't create chunks for content script dependencies
          return 'chunks/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return 'src/sidepanel/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        format: 'es',
        inlineDynamicImports: false,
        manualChunks: undefined, // Disable automatic chunking - each entry is self-contained
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
