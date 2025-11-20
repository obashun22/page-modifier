# Action の簡素化提案：宣言的Action vs カスタムコード

## 現状：9種類の宣言的Action

```typescript
type Action =
  | { type: 'copyText'; params: CopyTextParams }
  | { type: 'navigate'; params: NavigateParams }
  | { type: 'toggleClass'; params: ClassParams }
  | { type: 'addClass'; params: ClassParams }
  | { type: 'removeClass'; params: ClassParams }
  | { type: 'style'; params: StyleParams }
  | { type: 'toggle'; params: ToggleParams }
  | { type: 'custom'; params: CustomParams }      // ← 既にカスタムコード実行可能
  | { type: 'apiCall'; params: ApiCallParams };
```

### 使用例（現在）

```json
{
  "type": "click",
  "action": {
    "type": "copyText",
    "params": { "value": "コピーされました！" },
    "notification": "クリップボードにコピーしました"
  }
}
```

## 提案：全てcodeフィールドに統一

```typescript
interface Event {
  type: EventType;       // 'click', 'mouseenter'など
  code: string;          // 実行するコード
  notification?: string; // 通知メッセージ
  condition?: Condition; // 実行条件
}
```

### 使用例（提案）

```json
{
  "type": "click",
  "code": "navigator.clipboard.writeText('コピーされました！');",
  "notification": "クリップボードにコピーしました"
}
```

## メリット・デメリット比較

### ✅ メリット

#### 1. **圧倒的なシンプルさ**
- Action型の定義が不要（9種類 → 0種類）
- Zodスキーマが大幅に簡素化
- 学習コストが低い（JavaScriptだけ書けばOK）

#### 2. **柔軟性の向上**
- あらゆる処理を実装可能
- 新しいアクションタイプを追加する必要がない
- 複雑な条件分岐も自由に記述

#### 3. **実装の簡素化**
```typescript
// 現在：9種類のアクションを個別処理
async executeAction(action: Action, element: HTMLElement) {
  switch (action.type) {
    case 'copyText': // ...
    case 'navigate': // ...
    case 'toggleClass': // ...
    // ...
  }
}

// 提案：1つの処理のみ
async executeCode(code: string, element: HTMLElement) {
  const fn = new Function('element', code);
  fn(element);
}
```

#### 4. **Claude API生成の簡素化**
- Actionの種類を覚える必要がない
- 直接JavaScriptコードを生成すればOK

### ❌ デメリット

#### 1. **セキュリティレベルが常にAdvanced**
```typescript
// 現在：copyText, navigateなどは Moderate レベル
{
  "type": "copyText",
  "params": { "value": "..." }
}
// → 安全な操作として自動承認可能

// 提案：全てのイベントがカスタムコード実行
{
  "code": "navigator.clipboard.writeText('...');"
}
// → 常にAdvancedレベル = 毎回ユーザー承認が必要
```

**影響**: ユーザーエクスペリエンスの大幅な低下

#### 2. **Claude APIの生成品質低下**
宣言的な型があることで、Claude APIが構造化されたJSONを生成しやすくなります：

```json
// 宣言的（現在）：AIが生成しやすい
{
  "type": "copyText",
  "params": { "value": "..." }
}

// コード（提案）：AIがバグを含むコードを生成しやすい
{
  "code": "navigator.clipboard.writeText('...');"  // ← Promiseの処理忘れ
}

// 正しくは
{
  "code": "await navigator.clipboard.writeText('...');"
}
```

#### 3. **可読性とメンテナンス性の低下**
```json
// 宣言的：一目で何をするか分かる
{
  "type": "toggleClass",
  "params": { "className": "dark-mode", "selector": "body" }
}

// コード：コードを読まないと分からない
{
  "code": "document.body.classList.toggle('dark-mode');"
}
```

#### 4. **エラーハンドリングの責任がユーザーに**
```typescript
// 宣言的：エンジン側でエラーハンドリング
async executeAction(action: Action) {
  try {
    if (action.type === 'copyText') {
      await navigator.clipboard.writeText(action.params.value);
    }
  } catch (error) {
    console.error('コピーに失敗しました', error);
    // ユーザーに通知
  }
}

// コード：ユーザーが全てtry-catchを書く必要がある
{
  "code": "try { await navigator.clipboard.writeText('...'); } catch (e) { console.error(e); }"
}
```

#### 5. **バリデーション不可能**
- 宣言的ActionはZodでバリデーション可能
- カスタムコードは構文エラーや危険なコードを事前検出できない

#### 6. **ブラウザ互換性の問題**
```typescript
// 宣言的：エンジン側でポリフィル提供可能
async copyText(value: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
  } else {
    // フォールバック処理
    const textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// コード：ユーザーが全てのブラウザ対応を実装する必要がある
```

## ハイブリッド案：よく使うActionは残す

### 案A：基本Action + custom

```typescript
type Action =
  | { type: 'copyText'; params: { value: string } }
  | { type: 'navigate'; params: { url: string } }
  | { type: 'toggleClass'; params: { className: string; selector?: string } }
  | { type: 'code'; code: string };  // カスタムコード用
```

**メリット**:
- よく使う操作は宣言的で安全・簡単
- 複雑な処理はcodeで対応可能
- セキュリティレベルを適切に設定可能

### 案B：完全にcodeに統一 + ヘルパー関数提供

```typescript
interface Event {
  type: EventType;
  code: string;
  notification?: string;
}
```

ただし、window.pluginHelpersとしてヘルパー関数を提供：

```javascript
// プラグイン側のコード
{
  "code": "pluginHelpers.copyText('コピーされました！');"
}

// 実装（main-world-script.ts）
window.pluginHelpers = {
  copyText: async (value) => {
    await navigator.clipboard.writeText(value);
  },
  toggleClass: (className, selector) => {
    const el = selector ? document.querySelector(selector) : element;
    el?.classList.toggle(className);
  },
  navigate: (url) => {
    window.location.href = url;
  }
};
```

**メリット**:
- シンプルな構造
- よく使う操作はヘルパーで簡単に実装
- 柔軟性も保持

**デメリット**:
- 依然としてセキュリティレベルはAdvanced
- ヘルパーのドキュメント整備が必要

## 使用頻度の分析

現実的に、各Actionはどれくらい使われるか？

| Action | 頻度 | 代替の難易度 |
|--------|------|------------|
| copyText | 高 | 低（1行で書ける） |
| navigate | 高 | 低（1行で書ける） |
| toggleClass | 高 | 低（1行で書ける） |
| addClass | 中 | 低（1行で書ける） |
| removeClass | 中 | 低（1行で書ける） |
| style | 中 | 低（1行で書ける） |
| toggle | 中 | 低（数行で書ける） |
| apiCall | 低 | 中（fetchを書く必要） |
| custom | 高 | - |

**結論**: ほとんどのActionは1～数行のコードで実装可能

## セキュリティレベルの再検討

もし全てcodeにする場合、セキュリティレベルの設計を変更する必要があります：

### 現在の3段階
- 🟢 Safe: 基本DOM操作のみ
- 🟡 Moderate: 事前定義Action、外部API
- 🔴 Advanced: カスタムコード実行

### 提案後（全てcode）
- 🟢 Safe: 基本DOM操作のみ（Operation: insert, update, remove）
- 🔴 Advanced: Element.eventsがある、またはOperation: execute
  - 全てのイベント処理がカスタムコード実行

**問題**: Moderateレベルが消滅し、ユーザー体験が低下

### 解決策：ホワイトリスト方式

特定のヘルパー関数のみを使用している場合はModerateレベル：

```typescript
function assessCodeSecurity(code: string): SecurityLevel {
  // ホワイトリストのパターン
  const safePatterns = [
    /^pluginHelpers\.copyText\(['"].*['"]\);?$/,
    /^pluginHelpers\.navigate\(['"].*['"]\);?$/,
    /^pluginHelpers\.toggleClass\(['"].*['"](?:,\s*['"].*['"])?\);?$/,
  ];

  if (safePatterns.some(pattern => pattern.test(code.trim()))) {
    return 'moderate';
  }
  return 'advanced';
}
```

## 推奨：案A（基本Action + code）

最もバランスの取れたアプローチ：

```typescript
type Action =
  | { type: 'copyText'; params: { value: string } }
  | { type: 'navigate'; params: { url: string } }
  | { type: 'toggleClass'; params: { className: string; selector?: string } }
  | { type: 'code'; code: string };
```

**理由**:
1. **セキュリティ**: よく使う操作はModerateレベルで安全
2. **Claude API**: 宣言的Actionの方がAIが生成しやすい
3. **柔軟性**: 複雑な処理は`code`で対応可能
4. **シンプル**: 9種類→4種類に削減
5. **UX**: 基本操作は自動承認可能

### 削除するAction
- addClass → toggleClassで代用、またはcode
- removeClass → toggleClassで代用、またはcode
- style → codeで記述（1行で書ける）
- toggle → codeで記述
- apiCall → codeでfetchを書く
- custom → `code`に統合

## 実装例の比較

### よくあるユースケース

#### 1. クリップボードにコピー
```json
// 宣言的
{
  "type": "click",
  "action": {
    "type": "copyText",
    "params": { "value": "コピー完了！" },
    "notification": "クリップボードにコピーしました"
  }
}

// コード
{
  "type": "click",
  "code": "await navigator.clipboard.writeText('コピー完了！');",
  "notification": "クリップボードにコピーしました"
}
```

#### 2. ダークモード切り替え
```json
// 宣言的
{
  "type": "click",
  "action": {
    "type": "toggleClass",
    "params": { "className": "dark-mode", "selector": "body" }
  }
}

// コード
{
  "type": "click",
  "code": "document.body.classList.toggle('dark-mode');"
}
```

#### 3. 外部API呼び出し
```json
// 宣言的
{
  "type": "click",
  "action": {
    "type": "apiCall",
    "params": {
      "url": "https://api.example.com/data",
      "method": "POST",
      "data": { "key": "value" }
    }
  }
}

// コード
{
  "type": "click",
  "code": "await fetch('https://api.example.com/data', { method: 'POST', body: JSON.stringify({ key: 'value' }) });"
}
```

## 結論

**推奨**: 案A（基本Action + code）

- `copyText`, `navigate`, `toggleClass`の3つは残す（頻度高・安全性高）
- その他は`code`で統一
- セキュリティレベル: 基本Action = Moderate、code = Advanced

**完全code統一は非推奨**:
- セキュリティUXの大幅な低下
- Claude API生成品質の低下
- エラーハンドリングの責任がユーザーに

ただし、プロジェクトの方向性として「最大限のシンプルさ」を重視するなら、案B（完全code統一 + ヘルパー）も選択肢としてはあり得ます。
