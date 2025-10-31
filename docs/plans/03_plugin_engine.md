# 03. プラグインエンジン

## 機能概要

プラグインのJSON定義を解釈し、DOM操作を実行するコアエンジンを実装します。階層的な要素の生成、複数操作の順次実行、条件付き実行、そしてエラーハンドリングを提供します。

## 実装内容

### 1. プラグインエンジンクラス

```typescript
class PluginEngine {
  private executedOperations: Set<string>;  // 実行済み操作ID

  constructor() {
    this.executedOperations = new Set();
  }

  /**
   * プラグインを実行
   */
  async executePlugin(plugin: Plugin): Promise<ExecutionResult> {
    const results: OperationResult[] = [];

    for (const operation of plugin.operations) {
      try {
        // 条件チェック
        if (operation.condition && !this.checkCondition(operation.condition)) {
          console.log(`Skipping operation ${operation.id}: condition not met`);
          continue;
        }

        // 操作実行
        const result = await this.executeOperation(operation);
        results.push(result);

        // 実行済みとしてマーク
        this.executedOperations.add(operation.id);
      } catch (error) {
        console.error(`Failed to execute operation ${operation.id}:`, error);
        results.push({
          operationId: operation.id,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      pluginId: plugin.id,
      success: results.every(r => r.success),
      results,
    };
  }

  /**
   * 単一操作を実行
   */
  private async executeOperation(operation: Operation): Promise<OperationResult> {
    // セレクターで対象要素を取得
    const targets = this.resolveSelector(operation.selector);

    if (targets.length === 0) {
      throw new Error(`No elements found for selector: ${operation.selector}`);
    }

    // 操作タイプに応じた処理
    switch (operation.type) {
      case 'insert':
        return this.handleInsert(targets, operation);
      case 'remove':
        return this.handleRemove(targets, operation);
      case 'hide':
        return this.handleHide(targets, operation);
      case 'show':
        return this.handleShow(targets, operation);
      case 'style':
        return this.handleStyle(targets, operation);
      case 'modify':
        return this.handleModify(targets, operation);
      case 'replace':
        return this.handleReplace(targets, operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * 条件をチェック
   */
  private checkCondition(condition: Condition): boolean {
    switch (condition.type) {
      case 'exists':
        return document.querySelector(condition.selector!) !== null;
      case 'notExists':
        return document.querySelector(condition.selector!) === null;
      case 'matches':
        // パターンマッチング実装
        return this.matchesPattern(condition.selector!, condition.pattern!);
      case 'custom':
        // カスタムコード実行（サンドボックス化）
        return this.evaluateCustomCondition(condition.code!);
      default:
        return true;
    }
  }

  /**
   * セレクターを解決して要素を取得
   */
  private resolveSelector(selector: string): HTMLElement[] {
    // 特殊セレクターの処理
    if (selector === 'self') {
      // コンテキストによる
      return [];
    }

    // 通常のCSSセレクター
    return Array.from(document.querySelectorAll(selector));
  }

  /**
   * 要素を生成（階層構造対応）
   */
  private createElement(elementDef: Element, parentContext?: HTMLElement): HTMLElement {
    const el = document.createElement(elementDef.tag);

    // 属性設定
    if (elementDef.attributes) {
      Object.entries(elementDef.attributes).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }

    // スタイル設定
    if (elementDef.style) {
      Object.assign(el.style, elementDef.style);
    }

    // テキスト/HTML設定
    if (elementDef.textContent) {
      el.textContent = elementDef.textContent;
    }
    if (elementDef.innerHTML) {
      el.innerHTML = elementDef.innerHTML;
    }

    // 🔥 子要素を再帰的に生成
    if (elementDef.children) {
      elementDef.children.forEach(childDef => {
        const childEl = this.createElement(childDef, el);
        el.appendChild(childEl);

        // 子要素のイベントも登録
        if (childDef.events) {
          this.attachEvents(childEl, childDef.events, el);
        }
      });
    }

    return el;
  }

  /**
   * イベントを要素に登録
   */
  private attachEvents(
    element: HTMLElement,
    events: Event[],
    parentContext: HTMLElement
  ): void {
    events.forEach(event => {
      element.addEventListener(event.type, (e) => {
        // 条件チェック
        if (event.condition && !this.checkCondition(event.condition)) {
          return;
        }

        // アクション実行
        this.executeAction(event.action, element, parentContext);
      });
    });
  }

  /**
   * insert操作
   */
  private handleInsert(targets: HTMLElement[], operation: Operation): OperationResult {
    if (!operation.element) {
      throw new Error('Insert operation requires element definition');
    }

    const insertedElements: HTMLElement[] = [];

    targets.forEach(target => {
      const newElement = this.createElement(operation.element!, target);

      // イベント登録
      if (operation.element!.events) {
        this.attachEvents(newElement, operation.element!.events, target);
      }

      // 挿入
      switch (operation.position) {
        case 'beforebegin':
          target.insertAdjacentElement('beforebegin', newElement);
          break;
        case 'afterbegin':
          target.insertAdjacentElement('afterbegin', newElement);
          break;
        case 'beforeend':
          target.insertAdjacentElement('beforeend', newElement);
          break;
        case 'afterend':
          target.insertAdjacentElement('afterend', newElement);
          break;
        default:
          target.appendChild(newElement);
      }

      insertedElements.push(newElement);
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: insertedElements.length,
    };
  }

  /**
   * remove操作
   */
  private handleRemove(targets: HTMLElement[], operation: Operation): OperationResult {
    targets.forEach(target => target.remove());

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }

  /**
   * hide操作
   */
  private handleHide(targets: HTMLElement[], operation: Operation): OperationResult {
    targets.forEach(target => {
      target.style.display = 'none';
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }

  /**
   * show操作
   */
  private handleShow(targets: HTMLElement[], operation: Operation): OperationResult {
    targets.forEach(target => {
      target.style.display = '';
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }

  /**
   * style操作
   */
  private handleStyle(targets: HTMLElement[], operation: Operation): OperationResult {
    if (!operation.style) {
      throw new Error('Style operation requires style definition');
    }

    targets.forEach(target => {
      Object.assign(target.style, operation.style);
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }

  /**
   * modify操作
   */
  private handleModify(targets: HTMLElement[], operation: Operation): OperationResult {
    targets.forEach(target => {
      if (operation.attributes) {
        Object.entries(operation.attributes).forEach(([key, value]) => {
          target.setAttribute(key, value);
        });
      }
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: targets.length,
    };
  }

  /**
   * replace操作
   */
  private handleReplace(targets: HTMLElement[], operation: Operation): OperationResult {
    if (!operation.element) {
      throw new Error('Replace operation requires element definition');
    }

    const replacedCount = targets.length;

    targets.forEach(target => {
      const newElement = this.createElement(operation.element!, target.parentElement!);

      if (operation.element!.events) {
        this.attachEvents(newElement, operation.element!.events, target.parentElement!);
      }

      target.replaceWith(newElement);
    });

    return {
      operationId: operation.id,
      success: true,
      affectedElements: replacedCount,
    };
  }

  /**
   * アクション実行（イベントハンドラー用）
   */
  private executeAction(
    action: Action,
    element: HTMLElement,
    parentContext: HTMLElement
  ): void {
    // 06_event_handling.mdで詳細実装
    // ここでは基本的な構造のみ
  }
}
```

### 2. 実行結果の型定義

```typescript
interface ExecutionResult {
  pluginId: string;
  success: boolean;
  results: OperationResult[];
  timestamp?: number;
}

interface OperationResult {
  operationId: string;
  success: boolean;
  affectedElements?: number;
  error?: string;
}
```

### 3. セレクター解決ロジック

```typescript
class SelectorResolver {
  /**
   * 拡張セレクターを解決
   */
  static resolve(selector: string, contextElement?: HTMLElement): HTMLElement[] {
    // 特殊セレクターの処理
    if (selector === 'self' && contextElement) {
      return [contextElement];
    }

    if (selector === 'parent' && contextElement) {
      return contextElement.parentElement ? [contextElement.parentElement] : [];
    }

    if (selector.startsWith('ancestor(')) {
      // ancestor(.class) → 最も近い祖先要素
      const match = selector.match(/^ancestor\((.+?)\)(.*)$/);
      if (match && contextElement) {
        const [, ancestorSelector, rest] = match;
        const ancestor = contextElement.closest(ancestorSelector);
        if (!ancestor) return [];

        if (rest) {
          // ancestor(.class) > .child
          return Array.from(ancestor.querySelectorAll(rest.trim()));
        }
        return [ancestor as HTMLElement];
      }
    }

    if (selector.startsWith('parent >') && contextElement?.parentElement) {
      // parent > .child
      const childSelector = selector.replace(/^parent\s*>\s*/, '');
      return Array.from(contextElement.parentElement.querySelectorAll(childSelector));
    }

    if (selector === 'next' && contextElement) {
      return contextElement.nextElementSibling ? [contextElement.nextElementSibling as HTMLElement] : [];
    }

    if (selector === 'prev' && contextElement) {
      return contextElement.previousElementSibling ? [contextElement.previousElementSibling as HTMLElement] : [];
    }

    // 通常のCSSセレクター
    return Array.from(document.querySelectorAll(selector));
  }
}
```

## 実装ステップ

### Phase 1: 基本クラス実装

- [ ] src/content/plugin-engine.ts作成
- [ ] PluginEngineクラスの骨組み
- [ ] ExecutionResult型定義

### Phase 2: 操作ハンドラー実装

- [ ] handleInsert実装
- [ ] handleRemove実装
- [ ] handleHide/Show実装
- [ ] handleStyle実装
- [ ] handleModify実装
- [ ] handleReplace実装

### Phase 3: 要素生成実装

- [ ] createElement実装（再帰対応）
- [ ] 属性・スタイル設定
- [ ] textContent/innerHTML処理
- [ ] 子要素の再帰生成

### Phase 4: セレクター解決実装

- [ ] SelectorResolverクラス作成
- [ ] 特殊セレクター対応
  - [ ] self, parent
  - [ ] ancestor()
  - [ ] next, prev
  - [ ] parent > child
- [ ] 通常セレクターのフォールバック

### Phase 5: 条件処理実装

- [ ] checkCondition実装
- [ ] exists/notExists判定
- [ ] パターンマッチング
- [ ] カスタム条件評価

### Phase 6: エラーハンドリング

- [ ] try-catch実装
- [ ] エラーメッセージの整形
- [ ] 部分的失敗の許容

### Phase 7: 最適化

- [ ] 重複操作の防止
- [ ] パフォーマンス最適化
- [ ] メモリリーク対策

### Phase 8: テスト実装

- [ ] ユニットテスト作成
- [ ] 階層構造のテスト
- [ ] エラーケースのテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型安全性 | ^5.6.0 |
| DOM API | DOM操作 | - |

## ファイル構成

```
src/
├── content/
│   ├── plugin-engine.ts          # メインエンジン
│   ├── selector-resolver.ts      # セレクター解決
│   └── element-creator.ts        # 要素生成（分離案）
└── shared/
    └── execution-types.ts        # 実行結果型定義
```

## 依存関係

**前提条件:**
- 00_project_setup完了
- 01_plugin_schema完了

**依存する機能:**
- 01_plugin_schema（Plugin型、Operation型等）

**この機能を使用する機能:**
- 07_content_script
- 06_event_handling（アクション実行）

## テスト観点

- [ ] 単純な要素挿入が正常に動作する
- [ ] 階層的な要素が正しく生成される
- [ ] 複数操作が順次実行される
- [ ] 条件付き実行が正しく動作する
- [ ] セレクターが見つからない場合のエラーハンドリング
- [ ] 特殊セレクター（parent, ancestor等）が動作する
- [ ] スタイル・属性が正しく適用される
- [ ] 要素の削除・置換が正常に動作する
- [ ] 同じ操作を複数回実行しても問題ない

## セキュリティ考慮事項

1. **XSS対策**
   - innerHTML使用時のサニタイズ
   - textContentの優先使用

2. **カスタムコード実行**
   - サンドボックス化（Function constructor）
   - アクセス可能APIの制限

3. **セレクター検証**
   - 不正なセレクターの検出
   - DOMクロバリング対策

## 注意点・制約事項

1. **再帰の深さ制限**
   - 子要素の階層は最大10階層まで推奨
   - 無限再帰の防止

2. **パフォーマンス**
   - querySelectorAllの多用に注意
   - 大量の要素操作時のバッチ処理

3. **タイミング**
   - DOMContentLoaded後の実行が基本
   - 動的コンテンツはMutationObserverで対応（07_content_script）

4. **エラーハンドリング**
   - 一部の操作が失敗しても続行
   - エラー情報を詳細に記録

5. **メモリ管理**
   - 作成した要素への参照管理
   - イベントリスナーのクリーンアップ

## 使用例

```typescript
const engine = new PluginEngine();

const plugin: Plugin = {
  id: 'test-plugin',
  name: 'Test',
  version: '1.0.0',
  targetDomains: ['example.com'],
  autoApply: true,
  priority: 100,
  operations: [
    {
      id: 'op-1',
      type: 'insert',
      selector: '.container',
      position: 'beforeend',
      element: {
        tag: 'button',
        textContent: 'Click Me',
        style: {
          background: 'blue',
          color: 'white',
        },
        events: [
          {
            type: 'click',
            action: {
              type: 'custom',
              code: 'alert("Clicked!")',
            },
          },
        ],
      },
    },
  ],
};

const result = await engine.executePlugin(plugin);
console.log('Execution result:', result);
```

## 次のステップ

✅ プラグインエンジン実装完了後
→ **04_operations.md**: 各種操作の詳細実装
→ **06_event_handling.md**: イベント処理とアクション実行の詳細実装
