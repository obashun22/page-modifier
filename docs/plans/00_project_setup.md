# 00. プロジェクトセットアップ

## 機能概要

Chrome Extension開発のための基盤環境を構築します。Vite + React + TypeScriptを使用したモダンな開発環境を整備し、Chrome Extension Manifest V3に準拠した構成を作成します。

## 実装内容

### 1. 開発環境構築

- **Vite**: 高速なビルドツール
- **React 18**: UI構築フレームワーク
- **TypeScript**: 型安全性の確保
- **Chrome Extension Manifest V3**: 最新の拡張機能仕様

### 2. ディレクトリ構成

```
page_modifier/
├── manifest.json                 # Chrome Extension設定
├── package.json                  # npm設定
├── tsconfig.json                 # TypeScript設定
├── vite.config.ts                # Vite設定
├── .gitignore
├── README.md
├── docs/
│   ├── requirements/             # 要件定義書
│   ├── designs/                  # 設計書
│   ├── plans/                    # 実装計画書
│   └── progress/                 # 進捗管理
├── src/
│   ├── background/               # Background Service Worker
│   ├── content/                  # Content Scripts
│   ├── sidepanel/                # Side Panel UI
│   ├── shared/                   # 共有コード
│   └── utils/                    # ユーティリティ
├── public/
│   └── icons/                    # アイコン画像
└── plugins/                      # サンプルプラグイン
```

### 3. 必要なパッケージ

#### 依存関係
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "@anthropic-ai/sdk": "^0.32.0",
  "zod": "^3.23.0"
}
```

#### 開発依存関係
```json
{
  "typescript": "^5.6.0",
  "vite": "^5.4.0",
  "@vitejs/plugin-react": "^4.3.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "@types/chrome": "^0.0.270",
  "vitest": "^2.0.0",
  "@testing-library/react": "^16.0.0"
}
```

### 4. Manifest V3設定

```json
{
  "manifest_version": 3,
  "name": "Page Modifier",
  "version": "1.0.0",
  "description": "Webページの機能を柔軟に拡張できるChrome拡張",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "sidePanel"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content-script.js"],
      "run_at": "document_end"
    }
  ],
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "action": {
    "default_title": "Page Modifier"
  },
  "icons": {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 5. Vite設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

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
        entryFileNames: 'src/[name]/[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
```

### 6. TypeScript設定

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["chrome", "vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 実装ステップ

### Phase 1: プロジェクト初期化

- [ ] プロジェクトディレクトリ作成
- [ ] package.json作成（npm init）
- [ ] 必要なパッケージのインストール
- [ ] .gitignore作成
- [ ] README.md作成

### Phase 2: 設定ファイル作成

- [ ] tsconfig.json作成
- [ ] vite.config.ts作成
- [ ] manifest.json作成

### Phase 3: ディレクトリ構造作成

- [ ] src/ディレクトリ構造作成
- [ ] docs/ディレクトリ構造作成
- [ ] public/ディレクトリ構造作成
- [ ] plugins/ディレクトリ作成

### Phase 4: 基本ファイル作成

- [ ] src/background/service-worker.ts（空ファイル）
- [ ] src/content/content-script.ts（空ファイル）
- [ ] src/sidepanel/index.html
- [ ] src/sidepanel/App.tsx
- [ ] src/sidepanel/main.tsx

### Phase 5: ビルド確認

- [ ] npm run build でビルド成功確認
- [ ] Chromeで拡張機能を読み込んで動作確認
- [ ] 開発モード（npm run dev）の動作確認

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| Vite | ビルドツール | ^5.4.0 |
| React | UIフレームワーク | ^18.3.0 |
| TypeScript | 型システム | ^5.6.0 |
| Zod | スキーマバリデーション | ^3.23.0 |
| Vitest | テストフレームワーク | ^2.0.0 |

## ファイル構成

```
セットアップ後の初期ファイル構成:

page_modifier/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── manifest.json
├── .gitignore
├── README.md
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   └── content-script.ts
│   └── sidepanel/
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
└── public/
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

## 依存関係

**前提条件:**
- Node.js v18以上
- npm v9以上
- Chrome browser

**他機能との依存:**
- なし（最初のステップ）

## テスト観点

- [ ] npm installが正常に完了する
- [ ] npm run buildでエラーなくビルドできる
- [ ] ビルド成果物がdist/に生成される
- [ ] Chromeで拡張機能として読み込める
- [ ] manifest.jsonが正しく認識される

## セキュリティ考慮事項

- **CSP設定**: Content Security Policyを適切に設定
- **permissions**: 必要最小限の権限のみ要求
- **host_permissions**: 全URLへのアクセス権限（プラグイン実行に必要）

## 注意点・制約事項

1. **Manifest V3準拠**
   - Service Worker使用（Background Pageは非推奨）
   - remotely hosted codeは使用不可

2. **Vite設定**
   - Chrome Extensionのビルドに特化した設定が必要
   - マルチエントリーポイント対応

3. **開発フロー**
   - 変更後は拡張機能のリロードが必要
   - HMR（Hot Module Replacement）は制限あり

4. **アイコン**
   - 16x16, 48x48, 128x128の3サイズ必要
   - PNG形式推奨

## 次のステップ

✅ プロジェクトセットアップ完了後
→ **01_plugin_schema.md**: プラグインのJSONスキーマと型定義を作成
