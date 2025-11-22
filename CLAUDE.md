# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**Page Modifier** - AIを活用してWebページの機能を柔軟に拡張できるChrome Extension

ユーザーがチャットで要望を伝えると、Claude APIがプラグインJSON定義を生成し、Webページに機能を追加・変更・削除できます。プラグインはJSON形式で定義され、DOM操作、イベント処理、スタイル変更などを宣言的に記述します。

## 技術スタック

- **ビルド**: Vite 5.4+ + @crxjs/vite-plugin (Chrome Extension専用プラグイン)
- **フロントエンド**: React 18 + TypeScript 5.6 + Tailwind CSS 3.4
- **拡張機能**: Chrome Extension Manifest V3
- **AI統合**: Anthropic Claude API (@anthropic-ai/sdk)
- **バリデーション**: Zod
- **テスト**: Vitest + @testing-library/react (jsdom環境)

## アーキテクチャ

### コンポーネント構成

```
┌─────────────────────────────────────────┐
│ Chrome Extension                         │
├─────────────────────────────────────────┤
│                                           │
│  Side Panel (React)                      │
│  ├─ Chat UI                              │
│  │  └─ Claude API統合                    │
│  └─ Plugin Management UI                 │
│                                           │
│  Background Service Worker               │
│  ├─ Plugin Storage (chrome.storage)     │
│  └─ Message Router                       │
│                                           │
│  Content Script (各Webページに注入)      │
│  ├─ Plugin Engine                        │
│  ├─ Element Selector                     │
│  ├─ Event Manager                        │
│  ├─ MutationObserver                     │
│  └─ Main World Script (CSP回避)         │
└─────────────────────────────────────────┘
```

### ディレクトリ構造

```
src/
├── background/         # Service Worker
│   ├── service-worker.ts
│   └── plugin-store.ts
├── content/           # Content Scripts
│   ├── content-script.ts
│   ├── plugin-engine.ts
│   ├── element-selector.ts
│   ├── event-manager.ts
│   ├── main-world-script.ts    # MAIN World実行スクリプト
│   └── notification-utils.ts
├── sidepanel/         # Side Panel UI
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.html
│   ├── index.css
│   ├── components/    # NavigationBar, ChatView, PluginManagementView等
│   └── services/      # claude-api-client.ts, ai-service.ts
├── shared/            # 共有型定義・バリデーション
│   ├── types.ts
│   ├── plugin-schema.ts
│   ├── validator.ts
│   ├── chat-types.ts
│   ├── storage-types.ts
│   └── url-validator.ts
└── utils/             # plugin-utils.ts, uuid.ts
tests/
├── unit/              # ユニットテスト
│   ├── content/
│   ├── shared/
│   └── utils/
├── fixtures/          # テストデータ
└── setup.ts           # テストセットアップ
```

### プラグインJSON設計

プラグインは以下の構造を持つJSON定義：

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;  // semver
  targetDomains: string[];  // Chrome Extension Match Pattern形式
  enabled: boolean;
  operations: Operation[];
}

interface Operation {
  id: string;
  type: 'insert' | 'update' | 'delete' | 'execute';
  params: InsertParams | UpdateParams | DeleteParams | ExecuteParams;
  condition?: Condition;
}

interface InsertParams {
  selector: string;
  position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';
  element: Element;  // 階層的な子要素をサポート
}

interface UpdateParams {
  selector: string;
  style?: Record<string, string>;
  attributes?: Record<string, string>;
  textContent?: string;
}

interface DeleteParams {
  selector: string;
}

interface ExecuteParams {
  code: string;
  run?: 'once' | 'always';
}
```

**重要な設計ポイント:**
- **targetDomains**: Chrome Extension Match Pattern形式（`https://example.com/*`, `*://*.github.com/*`等）をサポート
  - 後方互換性のため、ドメイン名のみ（`example.com`）も許可
- `Element.children`は再帰的構造をサポート（最大10階層推奨）
- 一つのプラグインで複数の`operations`を定義可能
- プラグインは配列の逆順（古い順）に実行される
- 特殊セレクター構文: `parent`, `ancestor(.class)`, `next`, `prev`

### メッセージパッシング

Chrome Extension API経由で以下のコンポーネント間通信：

- **Side Panel ↔ Background**: プラグインCRUD、設定管理
- **Background ↔ Content Script**: プラグイン実行、要素選択モード
- **Content Script → Background → Side Panel**: 要素選択結果

### Main World API

Main Worldで実行されるカスタムJavaScriptから利用可能なAPIです。

#### Storage API

`window.pluginStorage`を通じてchrome.storage.localにアクセスできます。

**構造:**
```typescript
window.pluginStorage = {
  page: {
    async get(key: string): Promise<any>
    async set(key: string, value: any): Promise<void>
    async remove(key: string): Promise<void>
    async clear(): Promise<void>
  },
  global: {
    async get(key: string): Promise<any>
    async set(key: string, value: any): Promise<void>
    async remove(key: string): Promise<void>
    async clear(): Promise<void>
  }
}
```

**スコープ:**
- `page`: ページ固有のストレージ（キー形式: `page:{domain}:{key}`）
- `global`: 拡張機能全体で共有されるストレージ（キー形式: `global:{key}`）

**使用例:**
```javascript
// ページ固有のカウンターを保存
const count = await window.pluginStorage.page.get('counter') || 0;
await window.pluginStorage.page.set('counter', count + 1);

// 全ページで共有される設定を取得
const theme = await window.pluginStorage.global.get('theme');

// ページのストレージをクリア
await window.pluginStorage.page.clear();
```

**技術実装:**
- Main World → postMessage → Content Script → chrome.storage.local
- CSP制約を受けない（postMessageとChrome APIは制限外）
- 最大5MB（chrome.storage.local制限）

## 開発フロー

### 初期セットアップ

```bash
# 依存関係インストール
npm install

# 開発モード（ファイル監視）
npm run dev

# 本番ビルド
npm run build
```

ビルド後、Chromeで`chrome://extensions/`を開き、「パッケージ化されていない拡張機能を読み込む」から`dist/`ディレクトリを読み込む。

### テスト実行

```bash
# 全テスト（watch mode）
npm test

# ユニットテストのみ（一度だけ実行）
npm run test:unit

# カバレッジレポート
npm run test:coverage
```

**テスト環境:**
- Vitest + jsdom環境でユニットテストを実行
- 現在実装済み: plugin-schema、plugin-utilsのユニットテスト
- テストファイル: `tests/unit/` ディレクトリ配下

### Vite設定の重要ポイント

**@crxjs/vite-plugin**を使用してChrome Extensionをビルド：

```typescript
// vite.config.ts
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),  // manifest.jsonから自動でエントリーポイントを設定
  ],
  build: {
    rollupOptions: {
      input: {
        // MAIN World Scriptを個別にビルド
        'main-world-script': resolve(__dirname, 'src/content/main-world-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'main-world-script') {
            return 'assets/main-world-script.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
```

**ポイント:**
- manifest.jsonで定義されたエントリーポイント（background, content_scripts, side_panel）は自動で処理される
- main-world-script.tsは別途rollupOptionsで個別ビルドが必要
- 変更後は拡張機能のリロードが必要（HMRは動作しない）

## 実装状況

プロジェクトの主要機能は実装済みです：

- ✅ プラグインスキーマ・型定義（Zod + TypeScript）
- ✅ chrome.storageでのプラグイン管理
- ✅ JSON解釈・DOM操作エンジン（PluginEngine）
- ✅ 各種操作（insert, update, delete, execute）
- ✅ 要素選択UI・セレクター生成
- ✅ イベント処理（JavaScriptコード実行）
- ✅ Content Script実装
- ✅ Background Service Worker実装
- ✅ チャットインターフェース
- ✅ Claude API統合
- ✅ プラグイン管理UI
- ✅ Main World Script（CSP制約回避）
- ✅ Storage API（window.pluginStorage）
- 🟡 テスト（ユニットテストのみ実装済み）

## セキュリティ

### 主要対策

- **JSONバリデーション**: Zodスキーマで全プラグインを検証
- **カスタムJSサンドボックス**: Function constructor + withステートメント + タイムアウト
- **XSS対策**: innerHTML使用時の警告、textContent優先
- **CSP設定**: `script-src 'self'`で外部スクリプト禁止
- **URL検証**: javascript:スキーム禁止、HTTPSのみ許可

## 制約事項

1. **Manifest V3準拠**
   - Service Worker使用（Background Pageは使用不可）
   - Remotely hosted codeは実行不可

2. **chrome.storage制限**
   - chrome.storage.local: 最大5MB
   - 容量超過時のエラーハンドリング必須

3. **MutationObserver**
   - 大量のDOM変更時のパフォーマンス考慮
   - スロットリング実装推奨

4. **再帰的Element構造**
   - 子要素の階層は最大10階層推奨
   - 無限再帰防止が必要

5. **Claude API**
   - ユーザー各自のAPIキー設定が必要
   - レート制限・トークン数の考慮

## 開発規約

ユーザーのグローバルCLAUDE.md (`~/.claude/CLAUDE.md`) に記載の規約に従う：

- **バージョン管理**:
  - 機能ごとにブランチを切って開発
  - 完成次第mainブランチにマージ
  - mainブランチは常に正常に動作する状態を維持

- **ドキュメント管理**（必要に応じて作成）:
  - `docs/requirements/`: 要件定義書
  - `docs/designs/`: 設計書
  - `docs/progress/`: 進捗管理

- **コード管理**:
  - 命名規則を明確にする
  - 適切にコメントを記載する
  - 過剰な実装を避ける
  - 再利用性や保守性に留意する

## 参考情報

### 公式ドキュメント
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension Match Patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Vite](https://vitejs.dev/)
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zod](https://zod.dev/)

### 主要技術
- **React 18**: UIライブラリ
- **TypeScript 5.6**: 型安全性
- **Vite + @crxjs/vite-plugin**: ビルドツール（Chrome Extension専用）
- **Tailwind CSS**: ユーティリティファーストCSS
- **Zod**: スキーマバリデーション
- **Vitest**: テストフレームワーク
