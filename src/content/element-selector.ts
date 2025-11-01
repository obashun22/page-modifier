/**
 * Page Modifier - Element Selector
 *
 * 要素選択機能
 */

export class ElementSelector {
  private isActive: boolean = false;
  private overlay: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private message: HTMLElement | null = null;
  private callback: ((selector: string, elementInfo: any) => void) | null = null;

  /**
   * セレクターモードを開始
   */
  activate(callback: (selector: string, elementInfo: any) => void): void {
    if (this.isActive) return;

    this.isActive = true;
    this.callback = callback;

    // オーバーレイ作成
    this.createOverlay();
    this.createTooltip();

    // イベントリスナー登録
    this.attachEventListeners();

    // ページにメッセージ表示
    this.showInstructionMessage();

    console.log('[Element Selector] Activated');
  }

  /**
   * セレクターモードを終了
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.callback = null;

    // イベントリスナー削除
    this.detachEventListeners();

    // オーバーレイ削除
    this.removeOverlay();
    this.removeTooltip();

    // メッセージ削除
    this.removeInstructionMessage();

    console.log('[Element Selector] Deactivated');
  }

  /**
   * ホバー時のハイライト
   */
  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isActive) return;

    // オーバーレイ・ツールチップ・メッセージ自身は無視
    const target = e.target as HTMLElement;
    if (
      target.dataset.pluginOverlay ||
      target.dataset.pluginTooltip ||
      target.dataset.pluginMessage ||
      target.closest('[data-plugin-overlay]') ||
      target.closest('[data-plugin-tooltip]') ||
      target.closest('[data-plugin-message]')
    ) {
      return;
    }

    // ハイライト更新
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
    if (
      target.dataset.pluginOverlay ||
      target.dataset.pluginTooltip ||
      target.dataset.pluginMessage ||
      target.closest('[data-plugin-overlay]') ||
      target.closest('[data-plugin-tooltip]') ||
      target.closest('[data-plugin-message]')
    ) {
      return;
    }

    // セレクター生成
    const selector = this.generateSelector(target);

    // 要素情報収集
    const elementInfo = this.getElementInfo(target, selector);

    // コールバック実行
    if (this.callback) {
      this.callback(selector, elementInfo);
    }

    // モード終了
    this.deactivate();
  };


  /**
   * ハイライト表示を更新
   */
  private updateHighlight(element: HTMLElement): void {
    if (!this.overlay || !this.tooltip) return;

    const rect = element.getBoundingClientRect();

    // オーバーレイ位置更新
    Object.assign(this.overlay.style, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: 'block',
    });

    // ツールチップ更新
    this.updateTooltip(element, rect);
  }

  /**
   * ツールチップ更新
   */
  private updateTooltip(element: HTMLElement, rect: DOMRect): void {
    if (!this.tooltip) return;

    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className
      ? `.${Array.from(element.classList).join('.')}`
      : '';

    this.tooltip.textContent = `${tagName}${id}${classes}`;

    // ツールチップ位置
    const tooltipTop = rect.top + window.scrollY - 30;
    const tooltipLeft = rect.left + window.scrollX;

    Object.assign(this.tooltip.style, {
      top: `${tooltipTop}px`,
      left: `${tooltipLeft}px`,
      display: 'block',
    });
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
      zIndex: '999998',
      display: 'none',
      boxSizing: 'border-box',
    });

    document.body.appendChild(this.overlay);
  }

  /**
   * ツールチップ作成
   */
  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.dataset.pluginTooltip = 'true';
    Object.assign(this.tooltip.style, {
      position: 'absolute',
      backgroundColor: '#1f2328',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      zIndex: '999999',
      display: 'none',
      whiteSpace: 'nowrap',
    });

    document.body.appendChild(this.tooltip);
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
   * ツールチップ削除
   */
  private removeTooltip(): void {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  /**
   * 説明メッセージを表示
   */
  private showInstructionMessage(): void {
    this.message = document.createElement('div');
    this.message.dataset.pluginMessage = 'true';
    this.message.innerHTML = `
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
        pointer-events: none;
      ">
        📍 要素を選択してください（キャンセルするには要素選択ボタンを再度クリック）
      </div>
    `;

    document.body.appendChild(this.message);
  }

  /**
   * 説明メッセージを削除
   */
  private removeInstructionMessage(): void {
    if (this.message) {
      this.message.remove();
      this.message = null;
    }
  }

  /**
   * イベントリスナー登録
   */
  private attachEventListeners(): void {
    document.addEventListener('mousemove', this.onMouseMove, { passive: true });
    document.addEventListener('click', this.onClick, { capture: true });
  }

  /**
   * イベントリスナー削除
   */
  private detachEventListeners(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('click', this.onClick, { capture: true });
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
      const selector = `#${id}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    // ユニークなクラス
    if (element.className && typeof element.className === 'string') {
      const classes = Array.from(element.classList)
        .map((cls) => `.${CSS.escape(cls)}`)
        .join('');

      if (classes && document.querySelectorAll(classes).length === 1) {
        return classes;
      }

      // タグ + クラス
      const tagWithClasses = `${element.tagName.toLowerCase()}${classes}`;
      if (document.querySelectorAll(tagWithClasses).length === 1) {
        return tagWithClasses;
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

      // IDがあればそこで停止
      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }

      // クラスがあれば追加
      if (current.className && typeof current.className === 'string') {
        const classes = Array.from(current.classList)
          .map((cls) => `.${CSS.escape(cls)}`)
          .join('');
        if (classes) {
          selector += classes;
        }
      }

      // nth-childを追加（同じタグの兄弟が複数ある場合）
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(
          (el) => el.tagName === current!.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * 要素情報を取得
   */
  private getElementInfo(element: HTMLElement, selector: string): any {
    return {
      selector,
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: element.textContent?.trim().slice(0, 100) || undefined,
      attributes: Array.from(element.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {} as Record<string, string>),
    };
  }
}
