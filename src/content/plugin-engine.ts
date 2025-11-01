/**
 * Page Modifier - Plugin Engine
 *
 * プラグインのJSON定義を解釈してDOM操作を実行するコアエンジン
 */

import type {
  Plugin,
  Operation,
  Element,
  Event,
  Action,
  Condition,
} from '../shared/types';
import { EventManager } from './event-manager';
import { showNotification, replacePlaceholders } from './notification-utils';

/** 操作結果 */
interface OperationResult {
  operationId: string;
  success: boolean;
  error?: string;
  elementsAffected?: number;
}

/** プラグイン実行結果 */
interface ExecutionResult {
  pluginId: string;
  success: boolean;
  results: OperationResult[];
}

/**
 * プラグインエンジン
 *
 * プラグイン定義に基づいてDOM操作を実行
 */
export class PluginEngine {
  private executedOperations: Set<string> = new Set();
  private eventManager: EventManager = new EventManager();
  private currentPluginId: string = '';

  /**
   * プラグインを実行
   */
  async executePlugin(plugin: Plugin): Promise<ExecutionResult> {
    console.log(`[PluginEngine] Executing plugin: ${plugin.name} (${plugin.id})`);

    this.currentPluginId = plugin.id;
    const results: OperationResult[] = [];

    for (const operation of plugin.operations) {
      try {
        // 条件チェック
        if (operation.condition && !this.checkCondition(operation.condition)) {
          console.log(`[PluginEngine] Skipping operation ${operation.id}: condition not met`);
          continue;
        }

        // 操作実行
        const result = await this.executeOperation(operation);
        results.push(result);

        // 実行済みとしてマーク
        this.executedOperations.add(operation.id);
      } catch (error) {
        console.error(`[PluginEngine] Failed to execute operation ${operation.id}:`, error);
        results.push({
          operationId: operation.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const success = results.every((r) => r.success);
    console.log(`[PluginEngine] Plugin ${plugin.id} execution ${success ? 'succeeded' : 'failed'}`);

    return {
      pluginId: plugin.id,
      success,
      results,
    };
  }

  /**
   * 単一操作を実行
   */
  private async executeOperation(operation: Operation): Promise<OperationResult> {
    console.log(`[PluginEngine] Executing operation: ${operation.id} (${operation.type})`);

    // セレクターで対象要素を取得
    const targets = this.resolveSelector(operation.selector);

    if (targets.length === 0) {
      throw new Error(`No elements found for selector: ${operation.selector}`);
    }

    let elementsAffected = 0;

    // 操作タイプに応じた処理
    switch (operation.type) {
      case 'insert':
        elementsAffected = this.handleInsert(targets, operation);
        break;
      case 'remove':
        elementsAffected = this.handleRemove(targets);
        break;
      case 'hide':
        elementsAffected = this.handleHide(targets);
        break;
      case 'show':
        elementsAffected = this.handleShow(targets);
        break;
      case 'style':
        elementsAffected = this.handleStyle(targets, operation);
        break;
      case 'modify':
        elementsAffected = this.handleModify(targets, operation);
        break;
      case 'replace':
        elementsAffected = this.handleReplace(targets, operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }

    return {
      operationId: operation.id,
      success: true,
      elementsAffected,
    };
  }

  /**
   * 条件をチェック
   */
  private checkCondition(condition: Condition): boolean {
    switch (condition.type) {
      case 'exists':
        return condition.selector ? document.querySelector(condition.selector) !== null : false;
      case 'notExists':
        return condition.selector ? document.querySelector(condition.selector) === null : false;
      case 'matches':
        return this.matchesPattern(condition.selector!, condition.pattern!);
      case 'custom':
        return this.evaluateCustomCondition(condition.code!);
      default:
        return true;
    }
  }

  /**
   * パターンマッチング
   */
  private matchesPattern(selector: string, pattern: string): boolean {
    const element = document.querySelector(selector);
    if (!element) return false;

    // テキストコンテンツのパターンマッチ
    const text = element.textContent || '';
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  }

  /**
   * カスタム条件コードを評価（サンドボックス化）
   */
  private evaluateCustomCondition(code: string): boolean {
    try {
      // 安全なコンテキストで実行
      const func = new Function('document', `return (${code})`);
      return Boolean(func(document));
    } catch (error) {
      console.error('[PluginEngine] Custom condition evaluation failed:', error);
      return false;
    }
  }

  /**
   * セレクターを解決して要素を取得
   */
  private resolveSelector(selector: string): HTMLElement[] {
    // TODO: 特殊セレクター（parent, ancestor等）のサポートは後で実装
    // 現時点では通常のCSSセレクターのみ対応
    const elements = document.querySelectorAll<HTMLElement>(selector);
    return Array.from(elements);
  }

  /**
   * 要素を生成（階層構造対応）
   */
  private createElement(elementDef: Element, _parentContext?: HTMLElement): HTMLElement {
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
      // XSS警告: innerHTMLは潜在的なセキュリティリスク
      console.warn('[PluginEngine] Using innerHTML - ensure content is trusted');
      el.innerHTML = elementDef.innerHTML;
    }

    // 子要素を再帰的に生成
    if (elementDef.children) {
      elementDef.children.forEach((childDef) => {
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
    // EventManagerを使用してイベントリスナーを追跡
    this.eventManager.attachEvents(element, events, this.currentPluginId, (event, eventObject) => {
      // 条件チェック
      if (event.condition && !this.checkCondition(event.condition)) {
        return;
      }

      // アクション実行
      this.executeAction(event.action, element, parentContext, eventObject as any);
    });
  }

  /**
   * アクションを実行
   */
  private executeAction(
    action: Action,
    element: HTMLElement,
    parentContext: HTMLElement,
    event?: UIEvent
  ): void {
    try {
      switch (action.type) {
        case 'copyText':
          this.actionCopyText(action, element, parentContext);
          break;
        case 'navigate':
          this.actionNavigate(action);
          break;
        case 'toggleClass':
          this.actionToggleClass(action, element);
          break;
        case 'addClass':
          this.actionAddClass(action, element);
          break;
        case 'removeClass':
          this.actionRemoveClass(action, element);
          break;
        case 'style':
          this.actionStyle(action, element);
          break;
        case 'toggle':
          this.actionToggle(action, element);
          break;
        case 'custom':
          this.actionCustom(action, element, event);
          break;
        case 'apiCall':
          this.actionApiCall(action);
          break;
        default:
          console.warn(`[PluginEngine] Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error('[PluginEngine] Action execution failed:', error);
    }
  }

  // ==================== 操作ハンドラー ====================

  /**
   * insert操作: 要素を挿入
   */
  private handleInsert(targets: HTMLElement[], operation: Operation): number {
    if (!operation.element) {
      throw new Error('Insert operation requires element definition');
    }

    let count = 0;

    targets.forEach((target) => {
      // 重複チェック（同じoperation IDを持つ要素が既に存在するか）
      if (this.isDuplicateInsert(target, operation.id)) {
        console.warn(`[PluginEngine] Duplicate insert detected for operation ${operation.id}`);
        return;
      }

      const newElement = this.createElement(operation.element!, target);

      // data属性で追跡可能にする
      newElement.dataset.pluginOperation = operation.id;

      // イベント登録
      if (operation.element!.events) {
        this.attachEvents(newElement, operation.element!.events, target);
      }

      // 挿入
      const position = operation.position || 'beforeend';
      target.insertAdjacentElement(position, newElement);
      count++;
    });

    return count;
  }

  /**
   * 重複挿入チェック
   */
  private isDuplicateInsert(target: HTMLElement, operationId: string): boolean {
    return target.querySelector(`[data-plugin-operation="${operationId}"]`) !== null;
  }

  /**
   * remove操作: 要素を削除
   */
  private handleRemove(targets: HTMLElement[]): number {
    targets.forEach((target) => target.remove());
    return targets.length;
  }

  /**
   * hide操作: 要素を非表示
   */
  private handleHide(targets: HTMLElement[]): number {
    targets.forEach((target) => {
      target.style.display = 'none';
    });
    return targets.length;
  }

  /**
   * show操作: 要素を表示
   */
  private handleShow(targets: HTMLElement[]): number {
    targets.forEach((target) => {
      target.style.display = '';
    });
    return targets.length;
  }

  /**
   * style操作: スタイルを適用
   */
  private handleStyle(targets: HTMLElement[], operation: Operation): number {
    if (!operation.style) {
      throw new Error('Style operation requires style definition');
    }

    targets.forEach((target) => {
      Object.assign(target.style, operation.style);
    });

    return targets.length;
  }

  /**
   * modify操作: 属性/コンテンツを変更
   */
  private handleModify(targets: HTMLElement[], operation: Operation): number {
    targets.forEach((target) => {
      if (operation.attributes) {
        Object.entries(operation.attributes).forEach(([key, value]) => {
          target.setAttribute(key, value);
        });
      }
    });

    return targets.length;
  }

  /**
   * replace操作: 要素を置換
   */
  private handleReplace(targets: HTMLElement[], operation: Operation): number {
    if (!operation.element) {
      throw new Error('Replace operation requires element definition');
    }

    let count = 0;

    targets.forEach((target) => {
      const newElement = this.createElement(operation.element!, target.parentElement || undefined);

      // イベント登録
      if (operation.element!.events) {
        this.attachEvents(newElement, operation.element!.events, target.parentElement as HTMLElement);
      }

      target.replaceWith(newElement);
      count++;
    });

    return count;
  }

  // ==================== アクションハンドラー ====================

  /**
   * テキストをコピー
   */
  private actionCopyText(action: Action, element: HTMLElement, parentContext: HTMLElement): void {
    let text: string;

    if (action.value) {
      // 固定値を使用
      text = action.value;

      // プレースホルダー置換
      text = replacePlaceholders(text);
    } else if (action.selector) {
      // セレクターで対象を取得
      const targetEl = this.resolveActionSelector(action.selector, element, parentContext)[0];
      if (!targetEl) {
        console.error(`[PluginEngine] Target not found: ${action.selector}`);
        return;
      }
      text = targetEl.textContent || '';
    } else {
      // 要素自身のテキスト
      text = element.textContent || '';
    }

    // クリップボードにコピー
    navigator.clipboard.writeText(text).then(() => {
      console.log('[PluginEngine] Text copied to clipboard');

      // 通知表示
      if (action.notification) {
        showNotification(action.notification);
      }
    }).catch((error) => {
      console.error('[PluginEngine] Failed to copy text:', error);
      showNotification('コピーに失敗しました', 3000, 'error');
    });
  }

  /**
   * ページ遷移
   */
  private actionNavigate(action: Action): void {
    if (!action.url) {
      console.error('[PluginEngine] Navigate action requires url');
      return;
    }

    // セキュリティチェック: javascript:スキームを禁止
    if (action.url.toLowerCase().startsWith('javascript:')) {
      console.error('[PluginEngine] javascript: URLs are not allowed');
      showNotification('セキュリティ上の理由により、このURLは開けません', 3000, 'error');
      return;
    }

    window.location.href = action.url;
  }

  /**
   * クラスを切り替え
   */
  private actionToggleClass(action: Action, element: HTMLElement): void {
    if (action.className) {
      element.classList.toggle(action.className);
    }
  }

  /**
   * クラスを追加
   */
  private actionAddClass(action: Action, element: HTMLElement): void {
    if (action.className) {
      element.classList.add(action.className);
    }
  }

  /**
   * クラスを削除
   */
  private actionRemoveClass(action: Action, element: HTMLElement): void {
    if (action.className) {
      element.classList.remove(action.className);
    }
  }

  /**
   * スタイルを適用
   */
  private actionStyle(action: Action, element: HTMLElement): void {
    if (action.style) {
      Object.assign(element.style, action.style);
    }
  }

  /**
   * 表示/非表示を切り替え
   */
  private actionToggle(action: Action, element: HTMLElement): void {
    const target = action.selector
      ? this.resolveActionSelector(action.selector, element, element.parentElement as HTMLElement)[0]
      : element;

    if (target) {
      target.style.display = target.style.display === 'none' ? '' : 'none';
    }
  }

  /**
   * カスタムJS実行（サンドボックス化）
   */
  private actionCustom(action: Action, element: HTMLElement, event?: UIEvent): void {
    if (!action.code) return;

    try {
      // サンドボックス環境を構築
      const sandbox = {
        // 許可されたAPI
        console,
        element,
        event,
        // グローバルオブジェクト
        Array,
        Object,
        String,
        Number,
        Boolean,
        Date,
        Math,
        JSON,
        Promise,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        // Document API
        document: {
          querySelector: document.querySelector.bind(document),
          querySelectorAll: document.querySelectorAll.bind(document),
          getElementById: document.getElementById.bind(document),
          getElementsByClassName: document.getElementsByClassName.bind(document),
          getElementsByTagName: document.getElementsByTagName.bind(document),
          createElement: document.createElement.bind(document),
          createTextNode: document.createTextNode.bind(document),
        },
        // Navigator API (制限付き)
        navigator: {
          clipboard: navigator.clipboard,
          userAgent: navigator.userAgent,
        },
        // Window API (制限付き)
        window: {
          location: {
            href: window.location.href,
            hostname: window.location.hostname,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
          },
        },
        // 制限されたAPI（アクセス不可）
        fetch: undefined,
        XMLHttpRequest: undefined,
        eval: undefined,
      };

      // withステートメントでサンドボックス内実行
      const func = new Function('sandbox', `
        with (sandbox) {
          ${action.code}
        }
      `);

      func(sandbox);
    } catch (error) {
      console.error('[PluginEngine] Custom action execution failed:', error);
      showNotification('カスタムコードの実行に失敗しました', 3000, 'error');
    }
  }

  /**
   * 外部API呼び出し
   */
  private actionApiCall(action: Action): void {
    if (!action.url) {
      console.error('[PluginEngine] apiCall requires url');
      return;
    }

    // セキュリティチェック: HTTPSのみ許可
    if (!action.url.toLowerCase().startsWith('https://')) {
      console.error('[PluginEngine] Only HTTPS URLs are allowed');
      showNotification('セキュリティ上の理由により、HTTPS以外のURLは使用できません', 3000, 'error');
      return;
    }

    fetch(action.url, {
      method: action.method || 'GET',
      headers: action.headers,
      body: action.data ? JSON.stringify(action.data) : undefined,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('[PluginEngine] API response:', data);

        // 通知表示
        if (action.notification) {
          showNotification(action.notification);
        }
      })
      .catch((error) => {
        console.error('[PluginEngine] API call failed:', error);
        showNotification('API呼び出しに失敗しました', 3000, 'error');
      });
  }

  /**
   * アクション用セレクター解決
   */
  private resolveActionSelector(
    selector: string,
    _element: HTMLElement,
    parentContext: HTMLElement
  ): HTMLElement[] {
    // 特殊セレクター対応
    if (selector === 'parent') {
      return parentContext ? [parentContext] : [];
    }
    if (selector.startsWith('parent')) {
      // "parent > .class" のような形式
      const childSelector = selector.replace(/^parent\s*>\s*/, '');
      if (parentContext) {
        const child = parentContext.querySelector<HTMLElement>(childSelector);
        return child ? [child] : [];
      }
      return [];
    }

    // 通常のセレクター
    return this.resolveSelector(selector);
  }

  /**
   * 実行済み操作をクリア
   */
  clearExecutedOperations(): void {
    this.executedOperations.clear();
  }

  /**
   * プラグインのイベントリスナーを削除
   */
  detachPluginEvents(pluginId: string): void {
    this.eventManager.detachPluginEvents(pluginId);
  }

  /**
   * 全てのイベントリスナーを削除
   */
  detachAllEvents(): void {
    this.eventManager.detachAllEvents();
  }

  /**
   * イベントマネージャーの統計情報を取得（デバッグ用）
   */
  getEventListenerCount(): number {
    return this.eventManager.getListenerCount();
  }
}
