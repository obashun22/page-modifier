# 01. プラグインスキーマ設計

## 機能概要

プラグインのJSON定義とTypeScript型定義を設計します。階層的な要素構造と複数操作をサポートする柔軟なスキーマを定義し、Zodによるバリデーションを実装します。

## 実装内容

### 1. プラグインスキーマ全体構造

```typescript
interface Plugin {
  id: string;                    // 一意識別子
  name: string;                  // 表示名
  version: string;               // バージョン（semver）
  author?: string;               // 作成者
  description?: string;          // 説明
  targetDomains: string[];       // 適用対象ドメイン
  autoApply: boolean;            // 自動適用フラグ
  priority: number;              // 実行優先度（0-1000）
  operations: Operation[];       // 操作の配列
}
```

### 2. Operation（操作）型

```typescript
interface Operation {
  id: string;                    // 操作の一意識別子
  description?: string;          // 操作の説明
  type: OperationType;           // 操作タイプ
  selector: string;              // CSSセレクター
  position?: InsertPosition;     // 挿入位置（insertの場合）
  element?: Element;             // 要素定義
  style?: StyleObject;           // スタイル定義
  attributes?: AttributeObject;  // 属性定義
  condition?: Condition;         // 実行条件
}

type OperationType =
  | 'insert'   // 要素を挿入
  | 'remove'   // 要素を削除
  | 'hide'     // 要素を非表示
  | 'show'     // 要素を表示
  | 'style'    // スタイルを適用
  | 'modify'   // 属性/コンテンツを変更
  | 'replace'; // 要素を置換

type InsertPosition =
  | 'beforebegin'  // 対象要素の前
  | 'afterbegin'   // 対象要素の最初の子として
  | 'beforeend'    // 対象要素の最後の子として
  | 'afterend';    // 対象要素の後
```

### 3. Element（要素）型（階層構造サポート）

```typescript
interface Element {
  tag: string;                   // HTMLタグ名
  attributes?: AttributeObject;  // HTML属性
  style?: StyleObject;           // インラインスタイル
  textContent?: string;          // テキスト内容
  innerHTML?: string;            // HTML内容
  children?: Element[];          // 🔥 子要素（再帰的）
  events?: Event[];              // イベントハンドラー
}

type AttributeObject = Record<string, string>;
type StyleObject = Record<string, string>;
```

### 4. Event（イベント）型

```typescript
interface Event {
  type: EventType;               // イベントタイプ
  action: Action;                // 実行するアクション
  condition?: Condition;         // 実行条件
}

type EventType =
  | 'click'
  | 'dblclick'
  | 'mouseenter'
  | 'mouseleave'
  | 'focus'
  | 'blur'
  | 'change'
  | 'submit'
  | 'keydown'
  | 'keyup';
```

### 5. Action（アクション）型

```typescript
interface Action {
  type: ActionType;
  selector?: string;             // ターゲット要素
  value?: string;                // 値（copyText等で使用）
  className?: string;            // クラス名（toggleClass等）
  style?: StyleObject;           // スタイル
  code?: string;                 // カスタムコード
  url?: string;                  // URL（navigate等）
  notification?: string;         // 通知メッセージ
}

type ActionType =
  | 'copyText'        // テキストをコピー
  | 'navigate'        // ページ遷移
  | 'toggleClass'     // クラスを切り替え
  | 'addClass'        // クラスを追加
  | 'removeClass'     // クラスを削除
  | 'style'           // スタイルを適用
  | 'toggle'          // 表示/非表示切り替え
  | 'custom'          // カスタムJS実行
  | 'apiCall';        // 外部API呼び出し
```

### 6. Condition（条件）型

```typescript
interface Condition {
  type: ConditionType;
  selector?: string;             // 条件対象セレクター
  pattern?: string;              // マッチパターン
  code?: string;                 // カスタム条件コード
}

type ConditionType =
  | 'exists'          // 要素が存在する
  | 'notExists'       // 要素が存在しない
  | 'matches'         // パターンにマッチ
  | 'custom';         // カスタム条件
```

### 7. セレクター拡張

特殊なセレクター構文をサポート：

```typescript
type SelectorString =
  | string                       // 通常のCSSセレクター
  | 'self'                       // 自分自身
  | 'parent'                     // 親要素
  | 'parent > .child'            // 親の子要素
  | 'ancestor(.class)'           // 祖先要素
  | 'ancestor(.class) > .child'  // 祖先からの相対
  | 'child(.class)'              // 子要素
  | 'next'                       // 次の兄弟
  | 'prev';                      // 前の兄弟
```

## Zodスキーマ定義

```typescript
import { z } from 'zod';

// Style Object
const StyleObjectSchema = z.record(z.string());

// Attribute Object
const AttributeObjectSchema = z.record(z.string());

// Condition
const ConditionSchema = z.object({
  type: z.enum(['exists', 'notExists', 'matches', 'custom']),
  selector: z.string().optional(),
  pattern: z.string().optional(),
  code: z.string().optional(),
});

// Action
const ActionSchema = z.object({
  type: z.enum([
    'copyText',
    'navigate',
    'toggleClass',
    'addClass',
    'removeClass',
    'style',
    'toggle',
    'custom',
    'apiCall'
  ]),
  selector: z.string().optional(),
  value: z.string().optional(),
  className: z.string().optional(),
  style: StyleObjectSchema.optional(),
  code: z.string().optional(),
  url: z.string().optional(),
  notification: z.string().optional(),
});

// Event
const EventSchema = z.object({
  type: z.enum([
    'click',
    'dblclick',
    'mouseenter',
    'mouseleave',
    'focus',
    'blur',
    'change',
    'submit',
    'keydown',
    'keyup'
  ]),
  action: ActionSchema,
  condition: ConditionSchema.optional(),
});

// Element (recursive)
const ElementSchema: z.ZodType<Element> = z.lazy(() =>
  z.object({
    tag: z.string(),
    attributes: AttributeObjectSchema.optional(),
    style: StyleObjectSchema.optional(),
    textContent: z.string().optional(),
    innerHTML: z.string().optional(),
    children: z.array(ElementSchema).optional(), // 🔥 再帰
    events: z.array(EventSchema).optional(),
  })
);

// Operation
const OperationSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  type: z.enum(['insert', 'remove', 'hide', 'show', 'style', 'modify', 'replace']),
  selector: z.string(),
  position: z.enum(['beforebegin', 'afterbegin', 'beforeend', 'afterend']).optional(),
  element: ElementSchema.optional(),
  style: StyleObjectSchema.optional(),
  attributes: AttributeObjectSchema.optional(),
  condition: ConditionSchema.optional(),
});

// Plugin
const PluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // semver
  author: z.string().optional(),
  description: z.string().optional(),
  targetDomains: z.array(z.string()),
  autoApply: z.boolean(),
  priority: z.number().min(0).max(1000),
  operations: z.array(OperationSchema),
});
```

## サンプルプラグインJSON

### 例1: シンプルなコピーボタン

```json
{
  "id": "simple-copy-button",
  "name": "コピーボタン",
  "version": "1.0.0",
  "targetDomains": ["github.com"],
  "autoApply": true,
  "priority": 100,
  "operations": [
    {
      "id": "op-1",
      "type": "insert",
      "selector": ".highlight",
      "position": "beforeend",
      "element": {
        "tag": "button",
        "attributes": {
          "class": "copy-btn"
        },
        "style": {
          "position": "absolute",
          "top": "8px",
          "right": "8px"
        },
        "textContent": "📋 Copy",
        "events": [
          {
            "type": "click",
            "action": {
              "type": "copyText",
              "selector": "parent > code"
            }
          }
        ]
      }
    }
  ]
}
```

### 例2: 階層構造の複雑なプラグイン

```json
{
  "id": "enhanced-toolbar",
  "name": "強化ツールバー",
  "version": "1.0.0",
  "targetDomains": ["*.example.com"],
  "autoApply": true,
  "priority": 200,
  "operations": [
    {
      "id": "op-1",
      "description": "ツールバーを追加",
      "type": "insert",
      "selector": "article",
      "position": "afterbegin",
      "element": {
        "tag": "div",
        "attributes": {
          "class": "custom-toolbar"
        },
        "style": {
          "display": "flex",
          "gap": "8px",
          "padding": "12px"
        },
        "children": [
          {
            "tag": "button",
            "attributes": {
              "class": "toolbar-btn"
            },
            "textContent": "📋 Copy",
            "events": [
              {
                "type": "click",
                "action": {
                  "type": "copyText",
                  "selector": "parent.parent > p"
                }
              }
            ]
          },
          {
            "tag": "button",
            "attributes": {
              "class": "toolbar-btn"
            },
            "textContent": "🔗 Share",
            "children": [
              {
                "tag": "span",
                "attributes": {
                  "class": "icon"
                },
                "textContent": "🔗"
              }
            ],
            "events": [
              {
                "type": "click",
                "action": {
                  "type": "custom",
                  "code": "navigator.share({url: location.href})"
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## 実装ステップ

### Phase 1: 型定義作成

- [ ] src/shared/types.ts作成
- [ ] Plugin, Operation, Element, Event, Actionの型定義
- [ ] Condition, セレクター型の定義
- [ ] 型のエクスポート

### Phase 2: Zodスキーマ作成

- [ ] src/shared/plugin-schema.ts作成
- [ ] 各型に対応するZodスキーマ定義
- [ ] 再帰的なElementSchemaの実装
- [ ] スキーマのエクスポート

### Phase 3: バリデーション実装

- [ ] src/shared/validator.ts作成
- [ ] validatePlugin関数実装
- [ ] エラーメッセージのカスタマイズ
- [ ] バリデーション結果の型定義

### Phase 4: ユーティリティ実装

- [ ] src/utils/plugin-utils.ts作成
- [ ] プラグインID生成関数
- [ ] バージョン比較関数
- [ ] ドメインマッチング関数

### Phase 5: テストケース作成

- [ ] サンプルプラグインJSON作成（plugins/）
- [ ] バリデーションのユニットテスト
- [ ] エッジケースのテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型定義 | ^5.6.0 |
| Zod | スキーマバリデーション | ^3.23.0 |
| Vitest | テスト | ^2.0.0 |

## ファイル構成

```
src/
├── shared/
│   ├── types.ts              # TypeScript型定義
│   ├── plugin-schema.ts      # Zodスキーマ定義
│   └── validator.ts          # バリデーション関数
└── utils/
    └── plugin-utils.ts       # ユーティリティ関数

plugins/
├── simple-copy-button.json
├── enhanced-toolbar.json
└── article-enhancer.json
```

## 依存関係

**前提条件:**
- 00_project_setup完了

**依存する機能:**
- なし

**このスキーマを使用する機能:**
- 02_plugin_storage
- 03_plugin_engine
- 09_chat_ui
- 10_ai_integration
- 11_plugin_management_ui
- 12_security

## テスト観点

- [ ] 正常なプラグインJSONがバリデーションを通過する
- [ ] 不正なプラグインJSONが適切にエラーを返す
- [ ] 再帰的なElement構造が正しくバリデーションされる
- [ ] semverバージョンが正しく検証される
- [ ] 複数operationsを持つプラグインが正しく処理される
- [ ] 特殊セレクター（parent, ancestor等）が定義されている

## セキュリティ考慮事項

1. **バリデーション**
   - 全てのプラグインは読み込み前に必ずバリデーション
   - 不正なスキーマは即座に拒否

2. **セレクター検証**
   - XSS攻撃につながる不正なセレクターを検出
   - innerHTML使用時の警告

3. **カスタムコード検証**
   - custom actionの使用を検出
   - セキュリティレベルの判定に使用

## 注意点・制約事項

1. **再帰的Element構造**
   - Zodの`z.lazy()`を使用して再帰を実現
   - 深すぎる階層は制限を設けるべき（推奨: 最大10階層）

2. **セレクター構文**
   - 標準CSSセレクター + 独自拡張構文
   - 独自構文は実行時に標準セレクターに変換

3. **バージョン管理**
   - semverに準拠（例: 1.0.0）
   - メジャー/マイナー/パッチの変更ルールを定義

4. **互換性**
   - スキーマのバージョンアップ時の下位互換性を考慮
   - マイグレーション機能の実装を検討

## 次のステップ

✅ プラグインスキーマ設計完了後
→ **02_plugin_storage.md**: プラグインの保存・読み込み機能を実装
