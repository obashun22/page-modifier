# Operation におけるイベント設計の提案

## 現状の確認

### 既存の実装：Element レベルのイベント

現在、`Element`には`events`フィールドがあり、**挿入された要素に対するDOMイベント**を処理できます：

```typescript
interface Element {
  tag: string;
  events?: Event[];  // ✅ 既に実装済み
}

interface Event {
  type: EventType;   // 'click', 'mouseenter', etc.
  action: Action;    // 実行するアクション
}
```

**使用例：**
```json
{
  "type": "insert",
  "params": {
    "selector": "header",
    "position": "beforeend",
    "element": {
      "tag": "button",
      "textContent": "コピー",
      "events": [
        {
          "type": "click",
          "action": {
            "type": "custom",
            "params": {
              "code": "alert('クリックされました！');"
            }
          }
        }
      ]
    }
  }
}
```

## 2つの異なる「イベント」の概念

### 1. Element レベルのイベント（既存）
- **対象**: 挿入された要素に対するDOMイベント
- **タイミング**: ユーザーがその要素と対話した時
- **例**: クリック、ホバー、フォーカス
- **現状**: ✅ 既に実装済み

### 2. Operation レベルのイベント（新規提案）
- **対象**: 操作自体のライフサイクルイベント
- **タイミング**: 操作の実行前後
- **例**: 要素挿入後に通知、要素削除前に確認
- **現状**: ❌ 未実装

## 提案：Operation レベルのライフサイクルフック

### 設計案A：ライフサイクルフックを追加

```typescript
interface OperationBase {
  id: string;
  description?: string;
  condition?: Condition;

  // ライフサイクルフック（新規）
  onBefore?: ExecuteParams;   // 操作実行前
  onAfter?: ExecuteParams;    // 操作実行後
  onError?: ExecuteParams;    // 操作失敗時
}

interface ExecuteParams {
  code: string;               // 実行するコード
  notification?: string;      // 通知メッセージ
}
```

**使用例：**
```json
{
  "type": "insert",
  "params": {
    "selector": "header",
    "position": "beforeend",
    "element": { "tag": "button", "textContent": "ボタン" }
  },
  "onAfter": {
    "code": "console.log('ボタンを挿入しました');",
    "notification": "ボタンを追加しました"
  }
}
```

### 設計案B：汎用的なイベントシステム

```typescript
interface OperationBase {
  id: string;
  description?: string;
  condition?: Condition;

  // 汎用的なイベントハンドラー（新規）
  events?: OperationEvent[];
}

interface OperationEvent {
  trigger: 'before' | 'after' | 'error';  // トリガータイミング
  action: Action;                         // 実行するアクション
}
```

**使用例：**
```json
{
  "type": "insert",
  "params": {
    "selector": "header",
    "position": "beforeend",
    "element": { "tag": "button", "textContent": "ボタン" }
  },
  "events": [
    {
      "trigger": "after",
      "action": {
        "type": "custom",
        "params": {
          "code": "console.log('挿入完了');"
        },
        "notification": "ボタンを追加しました"
      }
    }
  ]
}
```

### 設計案C：executeで代用（現状のまま）

Operation レベルのイベントを追加せず、`execute`操作を複数組み合わせて実現：

```json
[
  {
    "type": "execute",
    "params": {
      "code": "console.log('挿入前処理');",
      "timing": "once"
    }
  },
  {
    "type": "insert",
    "params": {
      "selector": "header",
      "position": "beforeend",
      "element": { "tag": "button", "textContent": "ボタン" }
    }
  },
  {
    "type": "execute",
    "params": {
      "code": "console.log('挿入後処理');",
      "timing": "once"
    }
  }
]
```

**メリット**: 既存の仕組みで実現可能、シンプル
**デメリット**: 3つの操作に分割される、実行順序の保証が必要

## ユースケース分析

### ユースケース1：挿入後に通知を表示
```json
{
  "type": "insert",
  "params": { ... },
  "onAfter": {
    "notification": "ボタンを追加しました"
  }
}
```

### ユースケース2：削除前に確認
```json
{
  "type": "remove",
  "params": { "selector": ".important-data" },
  "onBefore": {
    "code": "if (!confirm('本当に削除しますか？')) throw new Error('キャンセル');"
  }
}
```

### ユースケース3：更新後にアナリティクス送信
```json
{
  "type": "update",
  "params": { ... },
  "onAfter": {
    "code": "fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ event: 'element_updated' }) });"
  }
}
```

### ユースケース4：エラー時のフォールバック処理
```json
{
  "type": "insert",
  "params": { ... },
  "onError": {
    "code": "console.error('挿入に失敗しました');",
    "notification": "要素の挿入に失敗しました"
  }
}
```

## 評価と推奨

### 案A：ライフサイクルフック
**メリット:**
- ✅ 直感的で分かりやすい
- ✅ `onBefore`, `onAfter`, `onError`の3つで十分カバー
- ✅ 実装が比較的シンプル

**デメリット:**
- ❌ フィールドが3つ増える
- ❌ 柔軟性がやや低い

### 案B：汎用的なイベントシステム
**メリット:**
- ✅ 拡張性が高い（将来的なトリガー追加が容易）
- ✅ 既存の`Event`型と設計が一貫

**デメリット:**
- ❌ やや複雑
- ❌ `Element.events`との混同の可能性

### 案C：executeで代用
**メリット:**
- ✅ 新しい機能を追加する必要がない
- ✅ 既存の仕組みで実現可能

**デメリット:**
- ❌ 操作が分割されて冗長
- ❌ 実行順序の管理が複雑
- ❌ 操作とフックの関連性が不明確

## 推奨：案A（ライフサイクルフック）

**理由:**
1. **シンプルで直感的**: `onBefore`, `onAfter`, `onError`で十分
2. **実用的**: よくあるユースケースを簡潔に表現できる
3. **実装が容易**: 既存の`ExecuteParams`を再利用可能

### 最終的な型定義

```typescript
interface OperationBase {
  id: string;
  description?: string;
  condition?: Condition;

  // ライフサイクルフック
  onBefore?: LifecycleHook;
  onAfter?: LifecycleHook;
  onError?: LifecycleHook;
}

interface LifecycleHook {
  code: string;               // 実行するJavaScriptコード
  notification?: string;      // 通知メッセージ
}

type Operation =
  | { type: 'insert'; params: InsertParams } & OperationBase
  | { type: 'update'; params: UpdateParams } & OperationBase
  | { type: 'remove'; params: RemoveParams } & OperationBase
  | { type: 'execute'; params: ExecuteParams } & OperationBase;
```

### 完全な使用例

```json
{
  "id": "op-001",
  "type": "insert",
  "description": "ダークモードボタンを追加",
  "params": {
    "selector": "header",
    "position": "beforeend",
    "element": {
      "tag": "button",
      "textContent": "🌙",
      "attributes": { "class": "dark-toggle" },
      "events": [
        {
          "type": "click",
          "action": {
            "type": "toggleClass",
            "params": { "className": "dark-mode", "selector": "body" },
            "notification": "ダークモードを切り替えました"
          }
        }
      ]
    }
  },
  "onAfter": {
    "code": "console.log('ダークモードボタンを挿入しました');",
    "notification": "ダークモード機能を追加しました"
  }
}
```

## セキュリティ考慮事項

ライフサイクルフックもカスタムコード実行なので、**Advancedセキュリティレベル**として扱う必要があります：

```typescript
function assessOperationSecurity(op: Operation): SecurityLevel {
  // onBefore, onAfter, onErrorのいずれかが存在する場合
  if (op.onBefore || op.onAfter || op.onError) {
    return 'advanced';  // カスタムコード実行のため
  }
  // ...
}
```

## 実装の影響範囲

1. **型定義**: `OperationBase`に3つのフィールドを追加
2. **Zodスキーマ**: `LifecycleHook`スキーマを追加
3. **Plugin Engine**: ライフサイクルフック実行ロジックを追加
4. **セキュリティチェック**: フック検出ロジックを追加
5. **Claude API**: プロンプトにライフサイクルフックの説明を追加

## 代替案：最小限の実装（onAfterのみ）

もし複雑性を最小限に抑えたい場合、`onAfter`のみを実装：

```typescript
interface OperationBase {
  id: string;
  description?: string;
  condition?: Condition;
  onComplete?: LifecycleHook;  // 操作完了後のみ
}
```

**理由:**
- `onBefore`は`condition`で代用可能
- `onError`のユースケースは限定的
- `onAfter`（`onComplete`）が最も頻繁に使われる

## 結論

**推奨**: 案A（ライフサイクルフック）を採用し、まずは`onAfter`のみを実装。将来的に必要に応じて`onBefore`と`onError`を追加する段階的アプローチを提案します。

これにより：
- ✅ 複雑性を最小限に抑える
- ✅ 最も頻繁なユースケースに対応
- ✅ 将来の拡張性を保持
