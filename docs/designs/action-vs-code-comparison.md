# 宣言的Action vs Code実行：詳細比較

## 2つのアプローチ

### アプローチA：宣言的Action（現状）

```typescript
type Action =
  | { type: 'copyText'; params: { value: string } }
  | { type: 'navigate'; params: { url: string } }
  | { type: 'toggleClass'; params: { className: string } }
  | ...（9種類）;

interface Event {
  type: EventType;
  action: Action;
  condition?: Condition;
}
```

### アプローチB：Code実行のみ

```typescript
interface Event {
  type: EventType;
  code: string;
  notification?: string;
  condition?: Condition;
}
```

## 📊 定量的比較

### 1. コード量（型定義 + 実装）

| 指標 | アプローチA（宣言的） | アプローチB（Code） | 差分 |
|-----|---------------------|-------------------|------|
| 型定義行数 | ~150行 | ~10行 | **93%削減** |
| Zodスキーマ | ~120行 | ~5行 | **96%削減** |
| 実装コード | ~300行 | ~50行 | **83%削減** |
| **合計** | **~570行** | **~65行** | **89%削減** |

**結論**: Code実行の方が圧倒的にシンプル

---

### 2. JSON記述の比較（よくある5つのユースケース）

#### ケース1: クリップボードにコピー

```json
// アプローチA（宣言的）- 56文字
{
  "type": "copyText",
  "params": { "value": "コピー完了！" }
}

// アプローチB（Code）- 64文字
{
  "code": "navigator.clipboard.writeText('コピー完了！');"
}
```
**差**: +8文字（14%増加）

#### ケース2: ダークモード切り替え

```json
// アプローチA（宣言的）- 87文字
{
  "type": "toggleClass",
  "params": { "className": "dark-mode", "selector": "body" }
}

// アプローチB（Code）- 55文字
{
  "code": "document.body.classList.toggle('dark-mode');"
}
```
**差**: -32文字（37%削減）

#### ケース3: 外部API呼び出し

```json
// アプローチA（宣言的）- 185文字
{
  "type": "apiCall",
  "params": {
    "url": "https://api.example.com/data",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "data": { "key": "value" }
  }
}

// アプローチB（Code）- 162文字
{
  "code": "fetch('https://api.example.com/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'value' }) });"
}
```
**差**: -23文字（12%削減）

#### ケース4: ページ遷移

```json
// アプローチA（宣言的）- 59文字
{
  "type": "navigate",
  "params": { "url": "https://example.com" }
}

// アプローチB（Code）- 50文字
{
  "code": "location.href = 'https://example.com';"
}
```
**差**: -9文字（15%削減）

#### ケース5: 複雑な処理（条件分岐 + DOM操作）

```json
// アプローチA（宣言的）- 不可能 → customを使う必要がある
{
  "type": "custom",
  "params": {
    "code": "if (document.querySelectorAll('a').length > 10) { alert('リンクが多すぎます'); }"
  }
}

// アプローチB（Code）- 直接記述
{
  "code": "if (document.querySelectorAll('a').length > 10) { alert('リンクが多すぎます'); }"
}
```
**差**: 同じ

---

### 3. セキュリティレベルの影響

| シナリオ | アプローチA | アプローチB | ユーザー承認回数 |
|---------|-----------|-----------|---------------|
| 基本DOM操作（copyText等） | 🟡 Moderate | 🔴 Advanced | A: 1回、B: 毎回 |
| カスタムコード実行 | 🔴 Advanced | 🔴 Advanced | 同じ |

**実用例**:
- プラグインに10個のイベントがあり、全て`copyText`を使用
- アプローチA: 初回1回だけ承認
- アプローチB: 10回承認が必要

**結論**: アプローチAの方がUXが大幅に良い

---

### 4. Claude API生成の成功率（推定）

| タスク | アプローチA | アプローチB | 理由 |
|-------|-----------|-----------|------|
| シンプルな操作 | 95% | 85% | コード内のタイポ・構文エラーの可能性 |
| 複雑な操作 | 60% | 70% | 宣言的では表現できない処理がある |
| エラーハンドリング | 100% | 40% | try-catchを書き忘れる |
| 非同期処理 | 90% | 60% | awaitの書き忘れ |

**例**:

```json
// アプローチA: AIが生成しやすい
{
  "type": "copyText",
  "params": { "value": "..." }
}
// → フィールドの型が明確、バリデーション可能

// アプローチB: AIがバグを含みやすい
{
  "code": "navigator.clipboard.writeText('...');"
}
// → Promiseの処理忘れ、タイポ、構文エラーの可能性
// 正しくは: await navigator.clipboard.writeText('...');
```

**結論**: シンプルな操作ではアプローチAが10%高い成功率

---

### 5. エラー時の挙動

#### アプローチA: エンジン側でエラーハンドリング

```typescript
async executeAction(action: Action) {
  try {
    switch (action.type) {
      case 'copyText':
        await navigator.clipboard.writeText(action.params.value);
        if (action.notification) {
          showNotification(action.notification);
        }
        break;
      // ...
    }
  } catch (error) {
    console.error('Action failed:', action.type, error);
    showNotification('操作に失敗しました', 'error');
    // ユーザーにエラーを通知
  }
}
```

**メリット**:
- 全てのActionで統一されたエラーハンドリング
- ユーザーがtry-catchを書く必要がない
- エラーメッセージが分かりやすい（"copyText failed"等）

#### アプローチB: ユーザーが責任を負う

```typescript
async executeCode(code: string) {
  try {
    const fn = new Function('element', code);
    await fn(element);
  } catch (error) {
    console.error('Code execution failed:', error);
    // エラーメッセージが曖昧（どのコードが失敗したか不明）
  }
}
```

**デメリット**:
- ユーザーが全てtry-catchを書く必要がある
- エラーメッセージが技術的すぎる
- デバッグが困難

---

### 6. ブラウザ互換性対応

#### アプローチA: エンジン側でポリフィル

```typescript
async copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    // モダンブラウザ
    await navigator.clipboard.writeText(value);
  } else {
    // フォールバック（古いブラウザ）
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
```

**メリット**: ユーザーが互換性を気にする必要がない

#### アプローチB: ユーザーが全て実装

```json
{
  "code": "if (navigator.clipboard) { await navigator.clipboard.writeText('...'); } else { /* フォールバック実装 */ }"
}
```

**デメリット**: 全てのユーザーが同じフォールバックを実装する必要がある

---

### 7. 学習コスト

| 項目 | アプローチA | アプローチB |
|-----|-----------|-----------|
| 覚えるAction数 | 9種類 | 0種類 |
| JavaScript知識 | 不要（基本操作） | 必須 |
| ドキュメント量 | 多い | 少ない |
| 初心者の参入障壁 | 低い | 高い |

**結論**: アプローチBは学習コストが低いが、JavaScript知識が必須

---

### 8. 保守性・可読性

#### ユースケース: 1年後にプラグインを見返す

```json
// アプローチA: 一目で何をするか分かる
{
  "type": "click",
  "action": {
    "type": "copyText",
    "params": { "value": "{{location.href}}" },
    "notification": "URLをコピーしました"
  }
}

// アプローチB: コードを読まないと分からない
{
  "type": "click",
  "code": "await navigator.clipboard.writeText(location.href);",
  "notification": "URLをコピーしました"
}
```

**結論**: アプローチAの方が可読性が高い

---

### 9. 柔軟性

| シナリオ | アプローチA | アプローチB |
|---------|-----------|-----------|
| 基本操作 | ✅ 簡潔に記述可能 | ✅ 簡潔に記述可能 |
| 複雑なロジック | ❌ customが必要 | ✅ 直接記述可能 |
| 新しい操作の追加 | ❌ 型定義が必要 | ✅ 自由に記述可能 |

**結論**: アプローチBの方が柔軟性が高い

---

### 10. バリデーション

#### アプローチA: 事前バリデーション可能

```typescript
// Zodスキーマでバリデーション
const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('copyText'),
    params: z.object({
      value: z.string().min(1),  // 空文字列を防ぐ
    }),
  }),
  // ...
]);

// 実行前にエラーを検出
const result = ActionSchema.safeParse(action);
if (!result.success) {
  console.error('無効なAction:', result.error);
}
```

#### アプローチB: バリデーション不可能

```typescript
// 文字列なので構文エラーを事前検出できない
const code = "navigatr.clipboard.writeText('...');";  // タイポ
// → 実行時エラー
```

**結論**: アプローチAの方が安全

---

## 📈 総合評価

| 評価軸 | アプローチA（宣言的） | アプローチB（Code） | 勝者 |
|-------|---------------------|-------------------|-----|
| **コード量** | 570行 | 65行 | 🏆 B（89%削減） |
| **JSON記述量** | やや冗長 | やや簡潔 | 🏆 B |
| **セキュリティUX** | Moderate可能 | 常にAdvanced | 🏆 A |
| **AI生成成功率** | 95% | 85% | 🏆 A |
| **エラーハンドリング** | 統一的 | ユーザー任せ | 🏆 A |
| **ブラウザ互換性** | ポリフィル提供 | ユーザー任せ | 🏆 A |
| **学習コスト** | 9種類覚える | JS知識必須 | 引き分け |
| **可読性** | 高い | 低い | 🏆 A |
| **柔軟性** | 制限あり | 無制限 | 🏆 B |
| **バリデーション** | 可能 | 不可能 | 🏆 A |

**スコア**: A=6勝、B=3勝、引き分け=1

---

## 💡 推奨：ハイブリッドアプローチ

完全にどちらかではなく、**両方の良いところを組み合わせる**：

```typescript
type Action =
  // よく使う基本操作（Moderateレベル、AIが生成しやすい）
  | { type: 'copyText'; params: { value: string } }
  | { type: 'navigate'; params: { url: string } }
  | { type: 'toggleClass'; params: { className: string } }

  // 複雑な処理用（Advancedレベル、柔軟性）
  | { type: 'code'; code: string };
```

### メリット統合

| 機能 | 担当 |
|-----|------|
| 基本操作（コピー、遷移、クラス切替） | 宣言的Action |
| 複雑なロジック | code |
| セキュリティUX | 宣言的Action=Moderate、code=Advanced |
| AI生成 | 宣言的Actionを優先的に生成 |
| 柔軟性 | codeでカバー |

---

## 🎯 実用的な推奨構成

```typescript
type Action =
  | { type: 'copyText'; params: { value: string } }
  | { type: 'navigate'; params: { url: string } }
  | { type: 'toggleClass'; params: { className: string; selector?: string } }
  | { type: 'code'; code: string };
```

**4種類のみ**に絞り込み：

1. **copyText**: 頻出（Moderate）
2. **navigate**: 頻出（Moderate）
3. **toggleClass**: 頻出（Moderate）
4. **code**: 柔軟性（Advanced）

### 削除したAction

- addClass, removeClass → toggleClassで代用
- style → code（1行で書ける）
- toggle → code（数行で書ける）
- apiCall → code（fetchで書く）
- custom → codeに統合

---

## 📊 使用頻度予測

| Action | 予測使用率 | 理由 |
|--------|----------|------|
| copyText | 30% | URLコピー、テキストコピー |
| toggleClass | 25% | ダークモード、UI切替 |
| code | 20% | 複雑な処理 |
| navigate | 15% | ページ遷移 |
| その他（削除予定） | 10% | codeで代用可能 |

**結論**: 上位4つで90%をカバー

---

## まとめ

### アプローチAのみ（宣言的Action）
- ✅ 安全性が高い
- ✅ 初心者に優しい
- ❌ 柔軟性が低い
- ❌ コード量が多い

### アプローチBのみ（Code実行）
- ✅ 非常にシンプル
- ✅ 柔軟性が高い
- ❌ セキュリティUXが最悪
- ❌ エラーハンドリングが弱い

### ハイブリッド（推奨）
- ✅ バランスが良い
- ✅ 基本操作は安全・簡単
- ✅ 複雑な処理も可能
- ✅ コード量も大幅削減（9種類→4種類）

**最終推奨**: ハイブリッドアプローチ（基本Action 3つ + code）
