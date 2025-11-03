# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**Page Modifier** - AIを活用してWebページの機能を柔軟に拡張できるChrome Extension

ユーザーがチャットで要望を伝えると、Claude APIがプラグインJSON定義を生成し、Webページに機能を追加・変更・削除できます。プラグインはJSON形式で定義され、DOM操作、イベント処理、スタイル変更などを宣言的に記述します。

## 技術スタック

- **ビルド**: Vite 5.4+ (マルチエントリーポイント設定が必要)
- **フロントエンド**: React 18 + TypeScript 5.6
- **拡張機能**: Chrome Extension Manifest V3
- **AI統合**: Anthropic Claude API
- **バリデーション**: Zod
- **テスト**: Vitest + @testing-library/react + Playwright

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
│  └─ MutationObserver                     │
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
│   └── operations/    # insert, remove, hide, style等
├── sidepanel/         # Side Panel UI
│   ├── App.tsx
│   ├── components/
│   └── services/
├── shared/            # 共有型定義・バリデーション
│   ├── types.ts
│   ├── plugin-schema.ts
│   └── validator.ts
└── utils/
```

### プラグインJSON設計

プラグインは以下の構造を持つJSON定義：

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;  // semver
  targetDomains: string[];
  autoApply: boolean;
  priority: number;  // 0-1000
  operations: Operation[];
}

interface Operation {
  id: string;
  type: 'insert' | 'remove' | 'hide' | 'show' | 'style' | 'modify' | 'replace';
  selector: string;
  element?: Element;  // 階層的な子要素をサポート
  events?: Event[];
  condition?: Condition;
}
```

**重要な設計ポイント:**
- `Element.children`は再帰的構造をサポート（最大10階層推奨）
- 一つのプラグインで複数の`operations`を定義可能
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
# 全テスト
npm test

# ユニットテストのみ
npm run test:unit

# 統合テスト
npm run test:integration

# E2Eテスト
npm run test:e2e

# カバレッジレポート
npm run test:coverage
```

### Vite設定の重要ポイント

Chrome Extensionは複数エントリーポイントが必要：

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    input: {
      sidepanel: 'src/sidepanel/index.html',
      background: 'src/background/service-worker.ts',
      content: 'src/content/content-script.ts',
    },
  },
}
```

変更後は拡張機能のリロードが必要（HMRは動作しない）。

## 実装計画書

`docs/plans/`に14の詳細実装計画書があります：

| Phase | 計画書 | 内容 |
|-------|--------|------|
| 1 | 00_project_setup | プロジェクトセットアップ |
| 1 | 01_plugin_schema | プラグインスキーマ・型定義 |
| 2 | 02_plugin_storage | chrome.storageでのプラグイン管理 |
| 2 | 03_plugin_engine | JSON解釈・DOM操作エンジン |
| 2 | 04_operations | 各種操作（insert, remove等）実装 |
| 3 | 05_element_selector | 要素選択UI・セレクター生成 |
| 3 | 06_event_handling | イベント・アクション処理 |
| 3 | 07_content_script | Content Scriptメイン実装 |
| 4 | 08_background_worker | Service Workerメイン実装 |
| 5 | 09_chat_ui | チャットインターフェース |
| 6 | 10_ai_integration | Claude API統合 |
| 5 | 11_plugin_management_ui | プラグイン管理画面 |
| 7 | 12_security | セキュリティ対策・サンドボックス |
| 8 | 13_testing | テスト戦略・実装 |

各計画書には実装手順、コード例、依存関係、テスト観点が記載されています。

## セキュリティ

### 3段階のセキュリティレベル

- 🟢 **Safe**: 基本DOM操作のみ（自動適用可）
- 🟡 **Moderate**: 事前定義イベント、外部API（初回承認）
- 🔴 **Advanced**: カスタムJS実行（毎回承認）

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

## ドキュメント規約

ユーザーのグローバルCLAUDE.md (`~/.claude/CLAUDE.md`) に記載の規約に従う：

- **ドキュメント配置**:
  - `docs/requirements/`: 要件定義書
  - `docs/designs/`: 設計書
  - `docs/plans/`: 実装計画書（作成済み）
  - `docs/progress/`: 進捗管理

- **進捗管理**: `docs/progress/`にタスクリストとプログレスバー付きドキュメントを作成

- **バージョン管理**: 機能ごとにブランチを切り、完成後mainにマージ

## 参考情報

- Chrome Extension Manifest V3: https://developer.chrome.com/docs/extensions/mv3/
- Anthropic Claude API: https://docs.anthropic.com/
- Vite for Chrome Extension: マルチエントリーポイント設定が必須
