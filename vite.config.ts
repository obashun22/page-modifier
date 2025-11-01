import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        // MAIN World Scriptを個別にビルド
        'main-world-script': resolve(__dirname, 'src/content/main-world-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // MAIN World Scriptは assets/ に配置
          if (chunkInfo.name === 'main-world-script') {
            return 'assets/main-world-script.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
