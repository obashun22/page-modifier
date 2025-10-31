# Page Modifier

AIを活用してWebページの機能を柔軟に拡張できるChrome Extension

## 概要

Page Modifierは、ユーザーがチャットで要望を伝えるだけで、Claude APIがプラグインJSON定義を生成し、Webページに機能を追加・変更・削除できるChrome拡張機能です。プラグインはJSON形式で定義され、DOM操作、イベント処理、スタイル変更などを宣言的に記述します。

## 機能

- 🤖 **AI駆動**: Claude APIを使用してプラグイン定義を自動生成
- 🔧 **柔軟な拡張**: JSON定義でDOM操作、イベント処理、スタイル変更を実現
- 🎨 **直感的UI**: チャットインターフェースで簡単に機能追加
- 🛡️ **セキュリティ**: 3段階のセキュリティレベルで安全に動作
- 📦 **プラグイン管理**: 作成したプラグインの保存・管理が可能

## 技術スタック

- **ビルド**: Vite 5.4+
- **フロントエンド**: React 18 + TypeScript 5.6
- **拡張機能**: Chrome Extension Manifest V3
- **AI統合**: Anthropic Claude API
- **バリデーション**: Zod

## セットアップ

### 前提条件

- Node.js v18以上
- npm v9以上
- Chrome browser

### インストール

```bash
# 依存関係のインストール
npm install

# 開発モード（ファイル監視）
npm run dev

# 本番ビルド
npm run build
```

### Chrome拡張機能として読み込む

1. `npm run build` を実行してビルド
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. プロジェクトの `dist/` ディレクトリを選択

## 開発

### ディレクトリ構造

```
page_modifier/
├── src/
│   ├── background/       # Service Worker
│   ├── content/          # Content Scripts
│   ├── sidepanel/        # Side Panel UI
│   ├── shared/           # 共有型定義・バリデーション
│   └── utils/            # ユーティリティ
├── public/
│   └── icons/            # アイコン画像
├── docs/                 # ドキュメント
└── plugins/              # サンプルプラグイン
```

### テスト

```bash
# 全テスト実行
npm test

# ユニットテストのみ
npm run test:unit

# カバレッジレポート
npm run test:coverage
```

## ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照してください：

- `docs/plans/`: 実装計画書
- `docs/designs/`: 設計書
- `docs/requirements/`: 要件定義書
- `docs/progress/`: 進捗管理

## ライセンス

MIT

## 参考情報

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [プロジェクトCLAUDE.md](./CLAUDE.md) - Claude Code向けのガイダンス
