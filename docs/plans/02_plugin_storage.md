# 02. プラグインストレージ

## 機能概要

chrome.storage APIを使用して、プラグインの保存・読み込み・管理を実装します。ドメイン別のプラグイン管理、インポート/エクスポート機能、およびプラグインの有効/無効切り替えを提供します。

## 実装内容

### 1. ストレージデータ構造

```typescript
interface StorageData {
  plugins: Record<string, PluginData>;  // プラグインID → プラグインデータ
  settings: Settings;                    // 全体設定
  domainMappings: DomainMappings;       // ドメイン → プラグインIDリスト
}

interface PluginData {
  plugin: Plugin;                        // プラグイン本体
  enabled: boolean;                      // 有効/無効
  createdAt: number;                     // 作成日時（timestamp）
  updatedAt: number;                     // 更新日時（timestamp）
  lastUsedAt?: number;                   // 最終使用日時
  usageCount: number;                    // 使用回数
}

interface Settings {
  autoApplyPlugins: boolean;             // プラグイン自動適用
  showNotifications: boolean;            // 通知表示
  theme: 'light' | 'dark' | 'auto';      // テーマ
  apiKey?: string;                       // Claude APIキー（暗号化）
}

interface DomainMappings {
  [domain: string]: string[];            // ドメイン → プラグインIDの配列
}
```

### 2. プラグインストレージクラス

```typescript
class PluginStorage {
  // プラグインの保存
  async savePlugin(plugin: Plugin): Promise<void>;

  // プラグインの取得（ID指定）
  async getPlugin(id: string): Promise<PluginData | null>;

  // 全プラグインの取得
  async getAllPlugins(): Promise<PluginData[]>;

  // ドメインに適用されるプラグインの取得
  async getPluginsForDomain(domain: string): Promise<PluginData[]>;

  // プラグインの更新
  async updatePlugin(id: string, plugin: Partial<Plugin>): Promise<void>;

  // プラグインの削除
  async deletePlugin(id: string): Promise<void>;

  // プラグインの有効/無効切り替え
  async togglePlugin(id: string, enabled: boolean): Promise<void>;

  // プラグインのインポート
  async importPlugin(json: string): Promise<Plugin>;

  // プラグインのエクスポート
  async exportPlugin(id: string): Promise<string>;

  // 複数プラグインのエクスポート
  async exportAllPlugins(): Promise<string>;

  // 設定の保存・取得
  async getSettings(): Promise<Settings>;
  async updateSettings(settings: Partial<Settings>): Promise<void>;

  // ドメインマッピングの更新
  async updateDomainMappings(pluginId: string, domains: string[]): Promise<void>;

  // ストレージのクリア
  async clear(): Promise<void>;
}
```

### 3. ストレージキー定義

```typescript
const STORAGE_KEYS = {
  PLUGINS: 'plugins',
  SETTINGS: 'settings',
  DOMAIN_MAPPINGS: 'domainMappings',
} as const;
```

### 4. ドメインマッチングロジック

```typescript
/**
 * URLがドメインパターンにマッチするか判定
 *
 * パターン例:
 * - "github.com" → github.comのみ
 * - "*.github.com" → サブドメインを含む
 * - "*.example.com/blog/*" → パスパターンも対応
 */
function matchesDomain(url: string, pattern: string): boolean {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  const pathname = urlObj.pathname;

  // ワイルドカード対応
  if (pattern.includes('*')) {
    const regex = new RegExp(
      '^' + pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*') + '$'
    );
    return regex.test(hostname + pathname);
  }

  // 完全一致
  return hostname === pattern || hostname.endsWith('.' + pattern);
}
```

### 5. インポート/エクスポート

```typescript
// JSONファイルからインポート
async function importPluginFromFile(file: File): Promise<Plugin> {
  const text = await file.text();
  const json = JSON.parse(text);

  // バリデーション
  const result = PluginSchema.safeParse(json);
  if (!result.success) {
    throw new Error('Invalid plugin format: ' + result.error.message);
  }

  return result.data;
}

// JSONファイルへエクスポート
function exportPluginToFile(plugin: Plugin, filename?: string): void {
  const json = JSON.stringify(plugin, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${plugin.id}.json`;
  a.click();

  URL.revokeObjectURL(url);
}
```

### 6. ストレージイベントリスナー

```typescript
// ストレージ変更の監視
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.plugins) {
      console.log('Plugins updated:', changes.plugins);
      // Content Scriptに通知
      notifyContentScripts('plugins-updated');
    }
  }
});
```

## 実装ステップ

### Phase 1: 基本クラス実装

- [ ] src/background/plugin-store.ts作成
- [ ] PluginStorageクラスの骨組み実装
- [ ] ストレージキー定義
- [ ] 型定義のインポート

### Phase 2: CRUD操作実装

- [ ] savePlugin実装
- [ ] getPlugin実装
- [ ] getAllPlugins実装
- [ ] updatePlugin実装
- [ ] deletePlugin実装
- [ ] togglePlugin実装

### Phase 3: ドメイン管理実装

- [ ] getPluginsForDomain実装
- [ ] updateDomainMappings実装
- [ ] matchesDomain関数実装
- [ ] ワイルドカードパターン対応

### Phase 4: インポート/エクスポート実装

- [ ] importPlugin実装
- [ ] exportPlugin実装
- [ ] exportAllPlugins実装
- [ ] importPluginFromFile実装
- [ ] exportPluginToFile実装

### Phase 5: 設定管理実装

- [ ] getSettings実装
- [ ] updateSettings実装
- [ ] デフォルト設定の定義

### Phase 6: イベント処理実装

- [ ] ストレージ変更リスナー実装
- [ ] Content Scriptへの通知機能
- [ ] エラーハンドリング

### Phase 7: ユーティリティ実装

- [ ] src/utils/storage-utils.ts作成
- [ ] ストレージ容量チェック
- [ ] データマイグレーション機能
- [ ] バックアップ/リストア機能

### Phase 8: テスト実装

- [ ] ユニットテスト作成
- [ ] モックストレージの実装
- [ ] エッジケースのテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| chrome.storage.local | ローカルストレージ | - |
| Zod | バリデーション | ^3.23.0 |
| TypeScript | 型安全性 | ^5.6.0 |

## ファイル構成

```
src/
├── background/
│   └── plugin-store.ts           # プラグインストレージクラス
├── utils/
│   ├── storage-utils.ts          # ストレージユーティリティ
│   └── domain-matcher.ts         # ドメインマッチング
└── shared/
    └── storage-types.ts          # ストレージ型定義
```

## 依存関係

**前提条件:**
- 00_project_setup完了
- 01_plugin_schema完了

**依存する機能:**
- 01_plugin_schema（Plugin型、バリデーション）

**この機能を使用する機能:**
- 03_plugin_engine
- 07_content_script
- 08_background_worker
- 09_chat_ui
- 11_plugin_management_ui

## テスト観点

- [ ] プラグインの保存・取得が正常に動作する
- [ ] ドメインマッチングが正しく機能する
  - [ ] 完全一致
  - [ ] サブドメインマッチ（*.example.com）
  - [ ] パスパターンマッチ
- [ ] インポート時にバリデーションが実行される
- [ ] エクスポートしたJSONが再インポート可能
- [ ] 複数プラグインの同時保存が可能
- [ ] ストレージ容量制限のハンドリング
- [ ] 同一IDのプラグインを上書きできる
- [ ] 無効化したプラグインが取得時に除外される

## セキュリティ考慮事項

1. **APIキーの暗号化**
   - Claude APIキーは暗号化して保存
   - Web Crypto APIを使用

2. **バリデーション**
   - インポート時に必ずバリデーション実行
   - 不正なデータの拒否

3. **容量制限**
   - chrome.storage.localの制限を考慮（最大5MB）
   - 大きすぎるプラグインの警告

4. **権限チェック**
   - ストレージアクセス権限の確認

## 注意点・制約事項

1. **ストレージ容量**
   - chrome.storage.local: 最大5MB
   - chrome.storage.sync: 最大100KB（非推奨）
   - 容量超過時のエラーハンドリングが必要

2. **非同期処理**
   - 全てのストレージ操作は非同期
   - async/awaitで統一

3. **ドメインマッピング**
   - プラグイン保存時に自動でマッピング更新
   - targetDomainsが変更された場合の整合性維持

4. **データ移行**
   - スキーマ変更時のマイグレーション機能が必要
   - バージョン管理の実装

5. **パフォーマンス**
   - 頻繁なストレージアクセスを避ける
   - メモリキャッシュの活用を検討

## APIサンプル

### プラグインの保存

```typescript
const pluginStore = new PluginStorage();

await pluginStore.savePlugin({
  id: 'my-plugin',
  name: 'マイプラグイン',
  version: '1.0.0',
  targetDomains: ['example.com'],
  autoApply: true,
  priority: 100,
  operations: [/* ... */]
});
```

### ドメインに対応するプラグインの取得

```typescript
const plugins = await pluginStore.getPluginsForDomain('github.com');
// enabled=trueのプラグインのみ返される
```

### プラグインのエクスポート

```typescript
const json = await pluginStore.exportPlugin('my-plugin');
// ファイルダウンロード
exportPluginToFile(JSON.parse(json), 'my-plugin.json');
```

## 次のステップ

✅ プラグインストレージ実装完了後
→ **03_plugin_engine.md**: プラグインを解釈して実行するエンジンを実装
