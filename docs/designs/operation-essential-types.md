# Operation型の本質的な整理

## 現状の問題

現在8つの操作タイプがありますが、機能が重複しています：

| 操作 | 本質 |
|------|------|
| hide | `style` の特殊ケース（display: none） |
| show | `style` の特殊ケース（display: block） |
| style | 要素の変更 |
| modify | 要素の変更（styleと本質的に同じ） |
| replace | `remove` + `insert` の組み合わせ |

## ユースケース分析

Web拡張機能でよくあるユースケースを分類：

### 1. 新しい要素を追加する
- ダークモード切り替えボタンを追加
- カスタムツールバーを追加
- 情報パネルを挿入
- **→ insert**

### 2. 既存要素を変更する
- 背景色を変更（スタイル）
- クラスを追加/削除（属性）
- テキストを書き換え（コンテンツ）
- 要素を表示/非表示（visibility）
- **→ update**（統合的な変更操作）

### 3. 既存要素を削除する
- 広告を削除
- 不要なバナーを削除
- プロモーションを削除
- **→ remove**

### 4. カスタムロジックを実行する
- ページデータを取得してローカルストレージに保存
- 複雑な条件分岐処理
- 外部APIとの連携
- **→ execute**

### 5. 既存要素を置き換える（頻出パターン）
- 古いボタンを新しいデザインに置換
- レガシーUIコンポーネントをモダンに置換
- **→ replace**（便利な糖衣構文として残す？）

## 提案: 4つの本質的な操作

### 案A: 最もミニマルな構成（4つ）

```typescript
type OperationType =
  | 'insert'   // 要素を挿入
  | 'update'   // 要素を更新（style, attributes, content, visibility）
  | 'remove'   // 要素を削除
  | 'execute'; // カスタムコード実行
```

**メリット:**
- ✅ CRUD操作に近い直感的な分類
- ✅ 機能の重複がない
- ✅ シンプルで理解しやすい
- ✅ Claude APIが生成しやすい

**デメリット:**
- ❌ `replace`がなくなる（`remove` + `insert`で代用可能だが冗長）
- ❌ 既存の`hide`/`show`の移行が必要

### 案B: 実用的な構成（5つ）

```typescript
type OperationType =
  | 'insert'   // 要素を挿入
  | 'update'   // 要素を更新
  | 'remove'   // 要素を削除
  | 'replace'  // 要素を置換（糖衣構文）
  | 'execute'; // カスタムコード実行
```

**メリット:**
- ✅ `replace`は頻出パターンなので便利
- ✅ 1つの操作で置換が完結

**デメリット:**
- ❌ `replace` = `remove` + `insert` なので冗長性がある

### 案C: より宣言的な構成（3つ）

```typescript
type OperationType =
  | 'render'   // 要素を描画（insert + update + replaceを統合）
  | 'remove'   // 要素を削除
  | 'execute'; // カスタムコード実行
```

**メリット:**
- ✅ 非常にシンプル
- ✅ 宣言的なアプローチ

**デメリット:**
- ❌ `render`が多機能すぎて曖昧
- ❌ insertとupdateの区別がつかない

## 推奨: 案A（4つの操作）

最も本質的で、機能の重複がない構成です。

### 新しい型定義

```typescript
// ==================== 操作タイプ ====================

type OperationType =
  | 'insert'   // 要素を挿入
  | 'update'   // 要素を更新
  | 'remove'   // 要素を削除
  | 'execute'; // カスタムコード実行

// ==================== パラメータ定義 ====================

/** insert: 要素を挿入 */
interface InsertParams {
  selector: string;            // 挿入位置の基準となる要素
  position: InsertPosition;    // 挿入位置
  element: Element;            // 挿入する要素
}

/** update: 要素を更新 */
interface UpdateParams {
  selector: string;            // 更新対象の要素
  style?: StyleObject;         // スタイル変更
  attributes?: AttributeObject;// 属性変更
  textContent?: string;        // テキスト変更
  innerHTML?: string;          // HTML変更
  addClass?: string[];         // 追加するクラス
  removeClass?: string[];      // 削除するクラス
  toggleClass?: string[];      // 切り替えるクラス
}

/** remove: 要素を削除 */
interface RemoveParams {
  selector: string;            // 削除対象の要素
}

/** execute: カスタムコード実行 */
interface ExecuteParams {
  code: string;                // 実行するJavaScriptコード
  selector?: string;           // コンテキストとなる要素
  timing?: 'once' | 'always';  // 実行タイミング
}

// ==================== Discriminated Union ====================

type Operation =
  | { type: 'insert'; params: InsertParams } & OperationBase
  | { type: 'update'; params: UpdateParams } & OperationBase
  | { type: 'remove'; params: RemoveParams } & OperationBase
  | { type: 'execute'; params: ExecuteParams } & OperationBase;
```

## JSON例

### 1. insert: ボタンを追加
```json
{
  "type": "insert",
  "params": {
    "selector": "header",
    "position": "beforeend",
    "element": {
      "tag": "button",
      "textContent": "ダークモード",
      "attributes": { "class": "dark-toggle" }
    }
  }
}
```

### 2. update: 要素を変更（スタイル）
```json
{
  "type": "update",
  "params": {
    "selector": "body",
    "style": {
      "backgroundColor": "#1a1a1a",
      "color": "#ffffff"
    }
  }
}
```

### 3. update: 要素を変更（クラス操作）
```json
{
  "type": "update",
  "params": {
    "selector": ".sidebar",
    "addClass": ["collapsed"],
    "style": { "display": "none" }
  }
}
```

### 4. update: テキストを変更
```json
{
  "type": "update",
  "params": {
    "selector": "h1",
    "textContent": "新しいタイトル",
    "attributes": { "data-modified": "true" }
  }
}
```

### 5. remove: 広告を削除
```json
{
  "type": "remove",
  "params": {
    "selector": ".ad-banner"
  }
}
```

### 6. execute: カスタム処理
```json
{
  "type": "execute",
  "params": {
    "code": "console.log('Page loaded!');",
    "timing": "once"
  }
}
```

## 既存操作からの移行

### hide → update
```json
// 旧
{ "type": "hide", "selector": ".sidebar" }

// 新
{
  "type": "update",
  "params": {
    "selector": ".sidebar",
    "style": { "display": "none" }
  }
}
```

### show → update
```json
// 旧
{ "type": "show", "selector": ".content" }

// 新
{
  "type": "update",
  "params": {
    "selector": ".content",
    "style": { "display": "block" }
  }
}
```

### style → update
```json
// 旧
{
  "type": "style",
  "selector": "body",
  "style": { "backgroundColor": "#000" }
}

// 新
{
  "type": "update",
  "params": {
    "selector": "body",
    "style": { "backgroundColor": "#000" }
  }
}
```

### modify → update
```json
// 旧
{
  "type": "modify",
  "selector": "h1",
  "textContent": "新タイトル"
}

// 新
{
  "type": "update",
  "params": {
    "selector": "h1",
    "textContent": "新タイトル"
  }
}
```

### replace → remove + insert
```json
// 旧
{
  "type": "replace",
  "selector": ".old-button",
  "element": { "tag": "button", "textContent": "新ボタン" }
}

// 新（2つの操作に分割）
[
  {
    "type": "remove",
    "params": { "selector": ".old-button" }
  },
  {
    "type": "insert",
    "params": {
      "selector": ".old-button",
      "position": "beforebegin",
      "element": { "tag": "button", "textContent": "新ボタン" }
    }
  }
]
```

または、`replace`専用ヘルパー関数を用意：
```typescript
function createReplaceOperations(
  selector: string,
  newElement: Element
): [Operation, Operation] {
  return [
    { type: 'remove', params: { selector } },
    {
      type: 'insert',
      params: { selector, position: 'beforebegin', element: newElement }
    }
  ];
}
```

## UpdateParams の設計理由

`update`操作に`addClass`, `removeClass`, `toggleClass`を追加した理由：

### 従来の方法（attributes）
```json
{
  "type": "update",
  "params": {
    "selector": ".btn",
    "attributes": { "class": "btn btn-primary active" }  // ❌ 既存クラスを上書き
  }
}
```

### 新しい方法（クラス操作）
```json
{
  "type": "update",
  "params": {
    "selector": ".btn",
    "addClass": ["active", "highlighted"],     // ✅ 既存クラスを保持
    "removeClass": ["disabled"]
  }
}
```

**メリット:**
- ✅ 既存のクラスを保持したまま追加/削除可能
- ✅ DOMのclassList APIと同じ思想
- ✅ より直感的で安全

## 実装の影響範囲

### 1. 型定義（src/shared/types.ts）
- `OperationType`を8つ→4つに削減
- `Operation`をDiscriminated Unionに変更
- `UpdateParams`を追加

### 2. Zodスキーマ（src/shared/plugin-schema.ts）
- `OperationSchema`を更新
- 新しいパラメータスキーマを追加

### 3. Plugin Engine（src/content/plugin-engine.ts）
- `applyOperation`メソッドを4つの操作に対応
- `update`操作のロジックを実装

### 4. Claude API（src/sidepanel/services/ai-service.ts）
- プロンプトを更新（4つの操作のみ生成）

### 5. マイグレーション
- 既存プラグインを新形式に変換する関数を実装

## 次のステップ

1. **承認**: この4つの操作で十分かを確認
2. **実装**: 新しい型定義とスキーマを実装
3. **マイグレーション**: 既存プラグインの変換機能を実装
4. **テスト**: ユニットテスト・統合テストを更新
5. **ドキュメント**: CLAUDE.mdとサンプルを更新

## 代替案: replaceを残す（5つ）

もし`replace`操作の利便性を重視する場合：

```typescript
type OperationType =
  | 'insert'
  | 'update'
  | 'remove'
  | 'replace'  // ← 残す
  | 'execute';
```

**判断基準:**
- `replace`の使用頻度が高い → 残す
- `replace`の使用頻度が低い → 削除してremove + insertで代用
