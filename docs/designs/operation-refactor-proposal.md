# Operation構造のリファクタリング提案

## 現状の課題

1. **型安全性の不足**: すべてのフィールドがoptionalで、TypeScriptの型チェックが弱い
2. **フィールドの使い分けが不明確**: 各操作タイプでどのフィールドが有効かが分かりにくい
3. **命名の一貫性**: `run`という名前が曖昧
4. **イベント処理の欠如**: Operation レベルでイベントを設定できない

## 提案: Discriminated Unionの採用

ActionやEventと同様に、各操作タイプごとにparamsオブジェクトを持つDiscriminated Union構造に変更します。

### 新しい型定義

```typescript
// ==================== 共通型 ====================

/** 操作の基本情報（全操作タイプで共通） */
interface OperationBase {
  id: string;                  // UUID形式
  description?: string;        // 説明（optional）
  condition?: Condition;       // 実行条件
  events?: Event[];            // この操作をトリガーするイベント（NEW!）
}

// ==================== 操作固有のパラメータ ====================

/** insert操作のパラメータ */
interface InsertParams {
  selector: string;            // 挿入位置の基準となる要素
  position: InsertPosition;    // 挿入位置
  element: Element;            // 挿入する要素
}

/** remove操作のパラメータ */
interface RemoveParams {
  selector: string;            // 削除対象の要素
}

/** hide操作のパラメータ */
interface HideParams {
  selector: string;            // 非表示にする要素
}

/** show操作のパラメータ */
interface ShowParams {
  selector: string;            // 表示する要素
}

/** style操作のパラメータ */
interface StyleParams {
  selector: string;            // スタイルを適用する要素
  style: StyleObject;          // 適用するスタイル
}

/** modify操作のパラメータ */
interface ModifyParams {
  selector: string;            // 変更対象の要素
  attributes?: AttributeObject;// 変更する属性
  textContent?: string;        // テキスト内容
  innerHTML?: string;          // HTML内容（XSS注意）
}

/** replace操作のパラメータ */
interface ReplaceParams {
  selector: string;            // 置換対象の要素
  element: Element;            // 新しい要素
}

/** execute操作のパラメータ */
interface ExecuteParams {
  code: string;                // 実行するJavaScriptコード
  selector?: string;           // コンテキストとなる要素（optional）
  executionMode?: 'once' | 'always';  // 実行タイミング（デフォルト: 'once'）
}

// ==================== Discriminated Union ====================

/** 操作定義（Discriminated Union） */
export type Operation =
  | { type: 'insert'; params: InsertParams } & OperationBase
  | { type: 'remove'; params: RemoveParams } & OperationBase
  | { type: 'hide'; params: HideParams } & OperationBase
  | { type: 'show'; params: ShowParams } & OperationBase
  | { type: 'style'; params: StyleParams } & OperationBase
  | { type: 'modify'; params: ModifyParams } & OperationBase
  | { type: 'replace'; params: ReplaceParams } & OperationBase
  | { type: 'execute'; params: ExecuteParams } & OperationBase;
```

### 新しいJSON例

```json
{
  "id": "op-001",
  "type": "insert",
  "description": "ダークモード切り替えボタンを追加",
  "params": {
    "selector": "header",
    "position": "beforeend",
    "element": {
      "tag": "button",
      "textContent": "🌙",
      "attributes": { "class": "dark-mode-toggle" },
      "events": [
        {
          "type": "click",
          "action": {
            "type": "toggleClass",
            "params": { "className": "dark-mode", "selector": "body" }
          }
        }
      ]
    }
  }
}
```

```json
{
  "id": "op-002",
  "type": "execute",
  "description": "ページ読み込み時に通知を表示",
  "params": {
    "code": "console.log('Plugin loaded!');",
    "executionMode": "once"
  }
}
```

## メリット

### 1. **型安全性の向上**
```typescript
// コンパイル時に型チェック
function applyOperation(op: Operation) {
  if (op.type === 'insert') {
    // op.params.position が必ず存在することが保証される
    const pos = op.params.position;  // ✅ OK
  }
  if (op.type === 'execute') {
    // op.params.code が必ず存在することが保証される
    const code = op.params.code;     // ✅ OK
  }
}
```

### 2. **IDEの補完が効く**
```typescript
const insertOp: Operation = {
  type: 'insert',
  params: {
    // IDEがInsertParamsのフィールドを自動補完してくれる
    selector: '...',
    position: '...',  // 'beforebegin' | 'afterbegin' | ...
    element: { ... }
  }
};
```

### 3. **JSON生成がシンプルに**
Claude APIがプラグインを生成する際、各操作タイプで必要なフィールドが明確になるため、エラーが減る。

### 4. **バリデーションが簡潔に**
```typescript
// refineによる複雑なランタイムチェックが不要
export const OperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('insert'),
    params: z.object({
      selector: z.string().min(1),
      position: z.enum(['beforebegin', 'afterbegin', 'beforeend', 'afterend']),
      element: ElementSchema,
    }),
    ...OperationBaseSchema.shape,
  }),
  // ...
]);
```

### 5. **イベント処理の統一**
Operation レベルでもイベントを設定可能に（例: 要素削除後に通知）

## デメリットと対策

### デメリット1: 既存プラグインとの互換性
**対策**: マイグレーション関数を提供
```typescript
function migrateOperation(old: OldOperation): Operation {
  const base = { id: old.id, description: old.description, condition: old.condition };

  switch (old.type) {
    case 'insert':
      return {
        ...base,
        type: 'insert',
        params: {
          selector: old.selector!,
          position: old.position!,
          element: old.element!,
        },
      };
    // ...
  }
}
```

### デメリット2: JSON構造が少し複雑に
**対策**: ドキュメント整備とテンプレート提供

## 実装ロードマップ

1. **Phase 1**: 新しい型定義を`types.ts`に追加（既存型は`@deprecated`マーク）
2. **Phase 2**: 新しいZodスキーマを`plugin-schema.ts`に追加
3. **Phase 3**: マイグレーション関数を実装
4. **Phase 4**: `plugin-engine.ts`を新しい型に対応
5. **Phase 5**: Claude APIのプロンプトを更新
6. **Phase 6**: 既存型を削除（バージョン2.0.0でリリース）

## 代替案: 現状維持 + 改善

もし破壊的変更を避けたい場合、以下の小さな改善を行う：

1. **命名改善**: `run` → `executionMode`
2. **descriptionをoptionalに**: 空文字列可の必須フィールドは不自然
3. **ドキュメント強化**: どの操作でどのフィールドが必要かを明記
4. **バリデーションメッセージ改善**: エラーメッセージをより詳細に

```typescript
export interface Operation {
  id: string;
  description?: string;         // ✅ optionalに変更
  type: OperationType;
  selector?: SelectorString;
  position?: InsertPosition;
  element?: Element;
  style?: StyleObject;
  attributes?: AttributeObject;
  condition?: Condition;
  code?: string;
  executionMode?: ScriptRun;    // ✅ run → executionMode
  events?: Event[];             // ✅ 追加
}
```

## 推奨

**Discriminated Unionへの移行を推奨します**。理由：
- 長期的なメンテナンス性の向上
- 型安全性の向上
- Action/Eventと設計の一貫性
- Claude API統合の信頼性向上

ただし、バージョン2.0.0としてリリースし、マイグレーション期間を設ける必要があります。
