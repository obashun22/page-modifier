# 05. 要素セレクター

## 機能概要

ユーザーがWebページ上の要素を視覚的に選択できる機能を実装します。ホバー/クリックによる要素選択、最適なCSSセレクターの自動生成、ビジュアルハイライト表示、およびセレクターの編集・テスト機能を提供します。

## 実装内容

### 1. 要素セレクターモード

```typescript
class ElementSelector {
  private isActive: boolean = false;
  private hoveredElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private callback: ((selector: string, element: HTMLElement) => void) | null = null;

  /**
   * セレクターモードを開始
   */
  activate(callback: (selector: string, element: HTMLElement) => void): void {
    this.isActive = true;
    this.callback = callback;

    // オーバーレイ作成
    this.createOverlay();

    // イベントリスナー登録
    this.attachEventListeners();

    // ページにメッセージ表示
    this.showInstructionMessage();
  }

  /**
   * セレクターモードを終了
   */
  deactivate(): void {
    this.isActive = false;
    this.callback = null;

    // イベントリスナー削除
    this.detachEventListeners();

    // オーバーレイ削除
    this.removeOverlay();

    // メッセージ削除
    this.removeInstructionMessage();
  }

  /**
   * ホバー時のハイライト
   */
  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isActive) return;

    // オーバーレイ自身は無視
    const target = e.target as HTMLElement;
    if (target.dataset.pluginOverlay) return;

    // ハイライト更新
    this.hoveredElement = target;
    this.updateHighlight(target);
  };

  /**
   * クリック時の選択
   */
  private onClick = (e: MouseEvent): void => {
    if (!this.isActive) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (target.dataset.pluginOverlay) return;

    // 要素選択
    this.selectedElement = target;

    // セレクター生成
    const selector = this.generateSelector(target);

    // コールバック実行
    if (this.callback) {
      this.callback(selector, target);
    }

    // モード終了
    this.deactivate();
  };

  /**
   * ハイライト表示を更新
   */
  private updateHighlight(element: HTMLElement): void {
    if (!this.overlay) return;

    const rect = element.getBoundingClientRect();

    Object.assign(this.overlay.style, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: 'block',
    });

    // 要素情報を表示
    this.showElementInfo(element);
  }

  /**
   * オーバーレイ作成
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.dataset.pluginOverlay = 'true';
    Object.assign(this.overlay.style, {
      position: 'absolute',
      border: '2px solid #0969da',
      backgroundColor: 'rgba(9, 105, 218, 0.1)',
      pointerEvents: 'none',
      zIndex: '999999',
      display: 'none',
    });

    document.body.appendChild(this.overlay);
  }

  /**
   * オーバーレイ削除
   */
  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /**
   * 最適なCSSセレクターを生成
   */
  private generateSelector(element: HTMLElement): string {
    // 優先順位:
    // 1. ID
    // 2. ユニークなクラス
    // 3. data属性
    // 4. 構造的なパス

    // ID
    if (element.id) {
      const id = CSS.escape(element.id);
      if (document.querySelectorAll(`#${id}`).length === 1) {
        return `#${id}`;
      }
    }

    // ユニークなクラス
    if (element.className) {
      const classes = Array.from(element.classList)
        .map(cls => `.${CSS.escape(cls)}`)
        .join('');

      if (classes && document.querySelectorAll(classes).length === 1) {
        return classes;
      }
    }

    // data属性
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        const selector = `[${attr.name}="${CSS.escape(attr.value)}"]`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    // 構造的パス
    return this.generatePathSelector(element);
  }

  /**
   * 構造的パスセレクターを生成
   */
  private generatePathSelector(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      // nth-childを追加
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * 要素情報を表示
   */
  private showElementInfo(element: HTMLElement): void {
    // ツールチップとして要素情報を表示
    // tagName, id, classes, dimensions等
  }

  /**
   * 説明メッセージを表示
   */
  private showInstructionMessage(): void {
    const message = document.createElement('div');
    message.dataset.pluginMessage = 'true';
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2328;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000000;
        font-family: system-ui, sans-serif;
        font-size: 14px;
      ">
        📍 要素を選択してください（ESCでキャンセル）
      </div>
    `;

    document.body.appendChild(message);
  }

  /**
   * 説明メッセージを削除
   */
  private removeInstructionMessage(): void {
    const message = document.querySelector('[data-plugin-message]');
    if (message) {
      message.remove();
    }
  }

  /**
   * イベントリスナー登録
   */
  private attachEventListeners(): void {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('click', this.onClick, { capture: true });
    document.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * イベントリスナー削除
   */
  private detachEventListeners(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('click', this.onClick, { capture: true });
    document.removeEventListener('keydown', this.onKeyDown);
  }

  /**
   * キーボードイベント
   */
  private onKeyDown = (e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.deactivate();
    }
  };
}
```

### 2. セレクターバリデーター

```typescript
class SelectorValidator {
  /**
   * セレクターの妥当性を検証
   */
  validate(selector: string): ValidationResult {
    try {
      // 構文チェック
      document.querySelector(selector);

      // マッチ数チェック
      const matches = document.querySelectorAll(selector);

      return {
        valid: true,
        matchCount: matches.length,
        selector,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        selector,
      };
    }
  }

  /**
   * セレクターの最適化
   */
  optimize(selector: string): string {
    // 不要な部分を削除して最適化
    // 例: body > div:nth-child(1) > div:nth-child(2) > .target
    //  → .target （ユニークな場合）

    const parts = selector.split(' > ');

    for (let i = parts.length - 1; i >= 0; i--) {
      const testSelector = parts.slice(i).join(' > ');
      const matches = document.querySelectorAll(testSelector);

      if (matches.length === 1) {
        return testSelector;
      }
    }

    return selector;
  }
}
```

### 3. メッセージパッシング

```typescript
// Content Script → Side Panel
chrome.runtime.sendMessage({
  type: 'ELEMENT_SELECTED',
  selector: '.my-element',
  elementInfo: {
    tag: 'div',
    id: 'content',
    classes: ['container', 'main'],
    dimensions: { width: 1200, height: 800 },
  },
});

// Side Panel → Content Script
chrome.tabs.sendMessage(tabId, {
  type: 'START_ELEMENT_SELECTION',
});
```

## 実装ステップ

### Phase 1: 基本クラス実装

- [ ] src/content/element-selector.ts作成
- [ ] ElementSelectorクラスの骨組み
- [ ] オーバーレイ表示機能

### Phase 2: イベント処理実装

- [ ] マウスムーブでのハイライト
- [ ] クリックでの選択
- [ ] ESCキーでのキャンセル

### Phase 3: セレクター生成実装

- [ ] ID/クラスベースの生成
- [ ] data属性ベースの生成
- [ ] 構造的パスの生成
- [ ] セレクター最適化

### Phase 4: UI実装

- [ ] ハイライトオーバーレイのスタイル
- [ ] 要素情報ツールチップ
- [ ] 説明メッセージ表示

### Phase 5: メッセージパッシング

- [ ] Side Panelとの通信
- [ ] 選択結果の送信
- [ ] モード切り替えの制御

### Phase 6: バリデーション実装

- [ ] SelectorValidatorクラス作成
- [ ] セレクター検証
- [ ] セレクター最適化

### Phase 7: テスト実装

- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] 実際のページでの動作確認

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型安全性 | ^5.6.0 |
| DOM API | 要素操作 | - |
| Chrome Extension API | メッセージング | - |

## ファイル構成

```
src/
└── content/
    ├── element-selector.ts       # メインセレクター
    ├── selector-generator.ts     # セレクター生成
    └── selector-validator.ts     # セレクター検証
```

## 依存関係

**前提条件:**
- 00_project_setup完了

**この機能を使用する機能:**
- 07_content_script
- 09_chat_ui（選択モードの起動）

## テスト観点

- [ ] 要素のホバーでハイライトが表示される
- [ ] クリックで要素が選択される
- [ ] ESCでモードがキャンセルされる
- [ ] 生成されたセレクターが正しく動作する
- [ ] ユニークなセレクターが生成される
- [ ] オーバーレイが正しく削除される

## セキュリティ考慮事項

1. **CSS.escape使用**
   - セレクター生成時にエスケープ処理

2. **イベント伝播の制御**
   - ページの動作を阻害しない

## 注意点・制約事項

1. **z-indexの管理**
   - オーバーレイが最前面に表示される

2. **パフォーマンス**
   - マウスムーブイベントの最適化
   - スロットリング実装

3. **セレクターの精度**
   - 動的コンテンツへの対応
   - 一意性の保証

## 次のステップ

✅ 要素セレクター実装完了後
→ **06_event_handling.md**: イベント処理とアクション実行の実装
→ **09_chat_ui.md**: Chat UIからの要素選択モード起動
