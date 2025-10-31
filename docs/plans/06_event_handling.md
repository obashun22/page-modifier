# 06. イベントハンドリング

## 機能概要

プラグインで定義されたイベント（click, hover等）のハンドリングと、事前定義アクション（copyText, toggle等）の実装を行います。イベントリスナーの適切な登録・削除、カスタムアクションの実行、およびセキュリティを考慮した実装を提供します。

## 実装内容

### 1. イベントマネージャー

```typescript
class EventManager {
  private listeners: Map<string, EventListenerEntry[]>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * イベントを要素に登録
   */
  attachEvents(
    element: HTMLElement,
    events: Event[],
    context: HTMLElement,
    pluginId: string
  ): void {
    events.forEach(eventDef => {
      const handler = this.createEventHandler(eventDef, element, context);

      // リスナー登録
      element.addEventListener(eventDef.type, handler);

      // 追跡のため保存
      const entry: EventListenerEntry = {
        element,
        type: eventDef.type,
        handler,
        pluginId,
      };

      const key = this.getElementKey(element);
      if (!this.listeners.has(key)) {
        this.listeners.set(key, []);
      }
      this.listeners.get(key)!.push(entry);
    });
  }

  /**
   * イベントハンドラーを作成
   */
  private createEventHandler(
    eventDef: Event,
    element: HTMLElement,
    context: HTMLElement
  ): EventListener {
    return (e: globalThis.Event) => {
      // 条件チェック
      if (eventDef.condition) {
        if (!this.checkCondition(eventDef.condition)) {
          return;
        }
      }

      // アクション実行
      this.executeAction(eventDef.action, element, context, e);
    };
  }

  /**
   * アクションを実行
   */
  private async executeAction(
    action: Action,
    element: HTMLElement,
    context: HTMLElement,
    event: globalThis.Event
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'copyText':
          await this.actionCopyText(action, element, context);
          break;
        case 'navigate':
          this.actionNavigate(action);
          break;
        case 'toggleClass':
          this.actionToggleClass(action, element, context);
          break;
        case 'addClass':
          this.actionAddClass(action, element, context);
          break;
        case 'removeClass':
          this.actionRemoveClass(action, element, context);
          break;
        case 'style':
          this.actionStyle(action, element, context);
          break;
        case 'toggle':
          this.actionToggle(action, element, context);
          break;
        case 'custom':
          await this.actionCustom(action, element, context, event);
          break;
        case 'apiCall':
          await this.actionApiCall(action, element, context);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
    }
  }

  /**
   * イベントリスナーを削除
   */
  detachEvents(element: HTMLElement): void {
    const key = this.getElementKey(element);
    const entries = this.listeners.get(key);

    if (entries) {
      entries.forEach(entry => {
        entry.element.removeEventListener(entry.type, entry.handler);
      });

      this.listeners.delete(key);
    }
  }

  /**
   * プラグインのイベントリスナーを全て削除
   */
  detachPluginEvents(pluginId: string): void {
    for (const [key, entries] of this.listeners.entries()) {
      const pluginEntries = entries.filter(e => e.pluginId === pluginId);

      pluginEntries.forEach(entry => {
        entry.element.removeEventListener(entry.type, entry.handler);
      });

      const remainingEntries = entries.filter(e => e.pluginId !== pluginId);
      if (remainingEntries.length === 0) {
        this.listeners.delete(key);
      } else {
        this.listeners.set(key, remainingEntries);
      }
    }
  }

  private getElementKey(element: HTMLElement): string {
    // 要素を一意に識別するキーを生成
    return `${element.tagName}-${element.id || ''}-${Date.now()}`;
  }

  private checkCondition(condition: Condition): boolean {
    // 03_plugin_engineと同じロジック
    return true; // placeholder
  }
}

interface EventListenerEntry {
  element: HTMLElement;
  type: string;
  handler: EventListener;
  pluginId: string;
}
```

### 2. 事前定義アクション実装

```typescript
class ActionHandlers {
  /**
   * copyText: テキストをクリップボードにコピー
   */
  async copyText(action: Action, element: HTMLElement, context: HTMLElement): Promise<void> {
    let text: string;

    if (action.value) {
      // 固定値
      text = action.value;

      // プレースホルダー置換
      text = text.replace('{{location.href}}', location.href);
      text = text.replace('{{document.title}}', document.title);
    } else if (action.selector) {
      // セレクターで対象を取得
      const target = this.resolveTarget(action.selector, element, context);
      if (!target) {
        throw new Error(`Target not found: ${action.selector}`);
      }

      text = target.textContent || '';
    } else {
      text = element.textContent || '';
    }

    // クリップボードにコピー
    await navigator.clipboard.writeText(text);

    // 通知表示
    if (action.notification) {
      this.showNotification(action.notification);
    }
  }

  /**
   * navigate: ページ遷移
   */
  navigate(action: Action): void {
    if (!action.url) {
      throw new Error('Navigate action requires url');
    }

    // セキュリティチェック
    if (action.url.startsWith('javascript:')) {
      console.error('javascript: URLs are not allowed');
      return;
    }

    window.location.href = action.url;
  }

  /**
   * toggleClass: クラスを切り替え
   */
  toggleClass(action: Action, element: HTMLElement, context: HTMLElement): void {
    if (!action.className) {
      throw new Error('toggleClass requires className');
    }

    const target = this.resolveTarget(action.selector || 'self', element, context);
    if (target) {
      target.classList.toggle(action.className);
    }
  }

  /**
   * addClass: クラスを追加
   */
  addClass(action: Action, element: HTMLElement, context: HTMLElement): void {
    if (!action.className) {
      throw new Error('addClass requires className');
    }

    const target = this.resolveTarget(action.selector || 'self', element, context);
    if (target) {
      target.classList.add(action.className);
    }
  }

  /**
   * removeClass: クラスを削除
   */
  removeClass(action: Action, element: HTMLElement, context: HTMLElement): void {
    if (!action.className) {
      throw new Error('removeClass requires className');
    }

    const target = this.resolveTarget(action.selector || 'self', element, context);
    if (target) {
      target.classList.remove(action.className);
    }
  }

  /**
   * style: スタイルを適用
   */
  style(action: Action, element: HTMLElement, context: HTMLElement): void {
    if (!action.style) {
      throw new Error('style action requires style object');
    }

    const target = this.resolveTarget(action.selector || 'self', element, context);
    if (target) {
      Object.assign(target.style, action.style);
    }
  }

  /**
   * toggle: 表示/非表示を切り替え
   */
  toggle(action: Action, element: HTMLElement, context: HTMLElement): void {
    const target = this.resolveTarget(action.selector || 'self', element, context);
    if (target) {
      if (target.style.display === 'none') {
        target.style.display = '';
      } else {
        target.style.display = 'none';
      }
    }
  }

  /**
   * custom: カスタムコード実行
   */
  async custom(
    action: Action,
    element: HTMLElement,
    context: HTMLElement,
    event: globalThis.Event
  ): Promise<void> {
    if (!action.code) {
      throw new Error('custom action requires code');
    }

    // サンドボックス化して実行
    const sandbox = this.createSandbox(element, context, event);

    try {
      const fn = new Function('sandbox', `
        with (sandbox) {
          ${action.code}
        }
      `);

      await fn(sandbox);
    } catch (error) {
      console.error('Custom code execution failed:', error);
      throw error;
    }
  }

  /**
   * apiCall: 外部API呼び出し
   */
  async apiCall(action: Action, element: HTMLElement, context: HTMLElement): Promise<void> {
    if (!action.url) {
      throw new Error('apiCall requires url');
    }

    // セキュリティチェック
    if (!action.url.startsWith('https://')) {
      console.error('Only HTTPS URLs are allowed');
      return;
    }

    // Background経由でfetch
    const response = await chrome.runtime.sendMessage({
      type: 'API_CALL',
      url: action.url,
      method: action.method || 'GET',
      data: action.data,
    });

    console.log('API response:', response);

    // 通知表示
    if (action.notification) {
      this.showNotification(action.notification);
    }
  }

  /**
   * サンドボックス環境を作成
   */
  private createSandbox(
    element: HTMLElement,
    context: HTMLElement,
    event: globalThis.Event
  ): any {
    return {
      // 許可されたAPI
      console,
      element,
      context,
      event,
      document: {
        querySelector: document.querySelector.bind(document),
        querySelectorAll: document.querySelectorAll.bind(document),
      },
      window: {
        location: {
          href: window.location.href,
        },
      },
      // ユーティリティ
      alert: window.alert.bind(window),
      // 制限されたAPI（アクセス不可）
      fetch: undefined,
      XMLHttpRequest: undefined,
      eval: undefined,
    };
  }

  /**
   * ターゲット要素を解決
   */
  private resolveTarget(
    selector: string,
    element: HTMLElement,
    context: HTMLElement
  ): HTMLElement | null {
    // SelectorResolverを使用（03_plugin_engine参照）
    if (selector === 'self') return element;
    if (selector === 'parent') return element.parentElement;
    if (selector.startsWith('ancestor(')) {
      // ancestor解決ロジック
    }

    return document.querySelector(selector);
  }

  /**
   * 通知を表示
   */
  private showNotification(message: string): void {
    // トースト通知を表示
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#238636',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: '1000000',
      fontSize: '14px',
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}
```

## 実装ステップ

### Phase 1: イベントマネージャー実装

- [ ] src/content/event-manager.ts作成
- [ ] EventManagerクラスの骨組み
- [ ] attachEvents実装
- [ ] detachEvents実装

### Phase 2: アクションハンドラー実装

- [ ] src/content/actions/index.ts作成
- [ ] copyText実装
- [ ] navigate実装
- [ ] toggleClass/addClass/removeClass実装
- [ ] style実装
- [ ] toggle実装

### Phase 3: カスタムアクション実装

- [ ] custom実装（サンドボックス化）
- [ ] サンドボックス環境の構築
- [ ] 許可されたAPIの定義

### Phase 4: API呼び出し実装

- [ ] apiCall実装
- [ ] Background経由のfetch
- [ ] セキュリティ検証

### Phase 5: ユーティリティ実装

- [ ] 通知表示機能
- [ ] ターゲット要素解決
- [ ] プレースホルダー置換

### Phase 6: テスト実装

- [ ] 各アクションのユニットテスト
- [ ] イベントリスナーのクリーンアップテスト
- [ ] サンドボックスのセキュリティテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型安全性 | ^5.6.0 |
| Clipboard API | コピー機能 | - |
| Chrome Extension API | メッセージング | - |

## ファイル構成

```
src/
└── content/
    ├── event-manager.ts          # イベント管理
    └── actions/
        ├── index.ts              # エクスポート
        ├── copy-text.ts
        ├── navigate.ts
        ├── class-actions.ts
        ├── style-actions.ts
        ├── custom.ts
        └── api-call.ts
```

## 依存関係

**前提条件:**
- 01_plugin_schema完了
- 03_plugin_engine完了

**この機能を使用する機能:**
- 03_plugin_engine
- 04_operations

## テスト観点

- [ ] イベントリスナーが正しく登録される
- [ ] イベントが発火時にアクションが実行される
- [ ] copyTextが正しく動作する
- [ ] カスタムコードがサンドボックス内で実行される
- [ ] イベントリスナーが適切に削除される
- [ ] 通知が正しく表示される

## セキュリティ考慮事項

1. **カスタムコード実行**
   - サンドボックス化
   - 危険なAPIへのアクセス制限

2. **API呼び出し**
   - HTTPSのみ許可
   - Background経由で実行

3. **XSS対策**
   - 不正なURLの検証
   - javascript:スキームの禁止

## 注意点・制約事項

1. **イベントリスナーの管理**
   - メモリリーク防止
   - 適切なクリーンアップ

2. **サンドボックスの制限**
   - Function constructorの使用
   - withステートメントの使用（非推奨だが制限のため）

3. **パフォーマンス**
   - 大量のイベントリスナー登録時の最適化

## 次のステップ

✅ イベントハンドリング実装完了後
→ **07_content_script.md**: Content Scriptのメイン実装
