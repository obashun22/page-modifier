import { defineConfig } from 'vite';
import { resolve } from 'path';

// MAIN World Script専用のビルド設定
// このスクリプトはページコンテキストで実行されるため、
// すべての依存関係を含む単一のIIFEファイルとしてビルドする必要があります
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/content/main-world-script.ts'),
      name: 'PageModifierMainWorld',
      formats: ['iife'],
      fileName: () => 'main-world-script.js',
    },
    outDir: 'dist/assets',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // すべての依存関係を単一ファイルにバンドル
        inlineDynamicImports: true,
      },
    },
  },
});
