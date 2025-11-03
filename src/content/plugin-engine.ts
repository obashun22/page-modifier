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
import { showNotification } from './notification-utils';

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
 * テンプレート変数を展開（MAIN Worldで評価）
 *
 * 例: "{{location.href}}" -> "https://example.com"
 *      "{{new Date().toLocaleDateString()}}" -> "2025/1/1"
 */
async function resolveTemplateVariables(template: string): Promise<string> {
  if (!template || typeof template !== 'string') return template;

  // {{...}} パターンを抽出
  const matches = Array.from(template.matchAll(/\{\{(.+?)\}\}/g));

  if (matches.length === 0) return template;

  let result = template;

  // 各テンプレート変数を順番に評価
  for (const match of matches) {
    const fullMatch = match[0];
    const expression = match[1];

    try {
      // MAIN Worldに評価を依頼
      const evaluatedValue = await evaluateTemplateInMainWorld(expression);
      result = result.replace(fullMatch, evaluatedValue);
    } catch (error) {
      console.warn(`[PluginEngine] Template variable evaluation failed: ${expression}`, error);
      // 失敗した場合は元のテンプレート変数をそのまま残す
    }
  }

  return result;
}

/**
 * MAIN Worldでテンプレート式を評価
 */
function evaluateTemplateInMainWorld(expression: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = `eval-${Date.now()}-${Math.random()}`;

    // レスポンスを受信
    const listener = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type !== 'EVAL_TEMPLATE_RESULT') return;
      if (event.data.requestId !== requestId) return;

      window.removeEventListener('message', listener);

      if (event.data.success) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error || 'Evaluation failed'));
      }
    };

    window.addEventListener('message', listener);

    // MAIN Worldにリクエスト送信
    window.postMessage({
      type: 'EVAL_TEMPLATE',
      requestId,
      expression,
    }, '*');

    // タイムアウト設定（5秒）
    setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error('Template evaluation timeout'));
    }, 5000);
  });
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

    // executeは別処理
    if (operation.type === 'execute') {
      const operationKey = `${this.currentPluginId}-${operation.id}`;

      // run: 'once'（デフォルト）の場合、1度だけ実行
      if (operation.run !== 'always' && this.executedOperations.has(operationKey)) {
        console.log(`[PluginEngine] Skipping execute ${operation.id}: already executed`);
        return {
          operationId: operation.id,
          success: true,
          elementsAffected: 0,
        };
      }

      await this.handleExecuteScript(operation);

      // run: 'once'の場合のみ実行済みマークを付ける
      if (operation.run !== 'always') {
        this.executedOperations.add(operationKey);
      }

      return {
        operationId: operation.id,
        success: true,
        elementsAffected: 0,
      };
    }

    // セレクターで対象要素を取得
    if (!operation.selector) {
      throw new Error(`Operation ${operation.id} requires selector field`);
    }

    const targets = this.resolveSelector(operation.selector);

    if (targets.length === 0) {
      throw new Error(`No elements found for selector: ${operation.selector}`);
    }

    let elementsAffected = 0;

    // 操作タイプに応じた処理
    switch (operation.type) {
      case 'insert':
        elementsAffected = await this.handleInsert(targets, operation);
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
        elementsAffected = await this.handleReplace(targets, operation);
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
  private async createElement(elementDef: Element, _parentContext?: HTMLElement): Promise<HTMLElement> {
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

    // テキスト/HTML設定（テンプレート変数展開）
    if (elementDef.textContent) {
      el.textContent = await resolveTemplateVariables(elementDef.textContent);
    }
    if (elementDef.innerHTML) {
      // XSS警告: innerHTMLは潜在的なセキュリティリスク
      console.warn('[PluginEngine] Using innerHTML - ensure content is trusted');
      el.innerHTML = await resolveTemplateVariables(elementDef.innerHTML);
    }

    // 子要素を再帰的に生成
    if (elementDef.children) {
      for (const childDef of elementDef.children) {
        const childEl = await this.createElement(childDef, el);
        el.appendChild(childEl);

        // 子要素のイベントも登録
        if (childDef.events) {
          this.attachEvents(childEl, childDef.events, el);
        }
      }
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
    this.eventManager.attachEvents(element, events, this.currentPluginId, async (event, eventObject) => {
      // 条件チェック
      if (event.condition && !this.checkCondition(event.condition)) {
        return;
      }

      // アクション実行
      await this.executeAction(event.action, element, parentContext, eventObject as any);
    });
  }

  /**
   * アクションを実行
   */
  private async executeAction(
    action: Action,
    element: HTMLElement,
    parentContext: HTMLElement,
    event?: UIEvent
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'copyText':
          await this.actionCopyText(action, element, parentContext);
          break;
        case 'navigate':
          await this.actionNavigate(action);
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
          await this.actionApiCall(action);
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
  private async handleInsert(targets: HTMLElement[], operation: Operation): Promise<number> {
    if (!operation.element) {
      throw new Error('Insert operation requires element definition');
    }

    let count = 0;

    for (const target of targets) {
      // 重複チェック（同じoperation IDを持つ要素が既に存在するか）
      if (this.isDuplicateInsert(target, operation.id)) {
        console.warn(`[PluginEngine] Duplicate insert detected for operation ${operation.id}`);
        continue;
      }

      const newElement = await this.createElement(operation.element!, target);

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
    }

    return count;
  }

  /**
   * 重複挿入チェック
   */
  private isDuplicateInsert(_target: HTMLElement, operationId: string): boolean {
    // documentレベルで既に同じoperation IDを持つ要素が存在するかチェック
    // これにより、afterend/beforebegin等で挿入された兄弟要素も検出可能
    return document.querySelector(`[data-plugin-operation="${operationId}"]`) !== null;
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
  private async handleReplace(targets: HTMLElement[], operation: Operation): Promise<number> {
    if (!operation.element) {
      throw new Error('Replace operation requires element definition');
    }

    let count = 0;

    for (const target of targets) {
      const newElement = await this.createElement(operation.element!, target.parentElement || undefined);

      // イベント登録
      if (operation.element!.events) {
        this.attachEvents(newElement, operation.element!.events, target.parentElement as HTMLElement);
      }

      target.replaceWith(newElement);
      count++;
    }

    return count;
  }

  // ==================== アクションハンドラー ====================

  /**
   * テキストをコピー
   */
  private async actionCopyText(action: Action, element: HTMLElement, parentContext: HTMLElement): Promise<void> {
    let text: string;

    if (action.value) {
      // 固定値を使用（テンプレート変数展開）
      text = await resolveTemplateVariables(action.value);
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
  private async actionNavigate(action: Action): Promise<void> {
    if (!action.url) {
      console.error('[PluginEngine] Navigate action requires url');
      return;
    }

    // テンプレート変数展開
    const url = await resolveTemplateVariables(action.url);

    // セキュリティチェック: javascript:スキームを禁止
    if (url.toLowerCase().startsWith('javascript:')) {
      console.error('[PluginEngine] javascript: URLs are not allowed');
      showNotification('セキュリティ上の理由により、このURLは開けません', 3000, 'error');
      return;
    }

    window.location.href = url;
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
  private async actionCustom(action: Action, _element: HTMLElement, event?: UIEvent): Promise<void> {
    if (!action.code) return;

    // セキュリティレベルの確認
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    
    if (settings.settings?.securityLevel !== 'advanced') {
      console.warn('[PluginEngine] Custom JS requires security level "advanced"');
      showNotification(
        'カスタムJSの実行にはセキュリティレベル「Advanced」が必要です',
        5000,
        'error'
      );
      throw new Error('Security level "advanced" required for custom JS execution');
    }

    try {
      // リクエストIDを生成
      const requestId = `custom-js-${Date.now()}-${Math.random()}`;

      // MAIN Worldにメッセージを送信
      // 注意: postMessage()はシリアライズ可能なデータのみ送信可能
      window.postMessage(
        {
          type: 'EXECUTE_CUSTOM_JS',
          requestId,
          code: action.code,
          selector: action.selector,
          context: {
            event: event
              ? {
                  type: event.type,
                  // HTMLElementはクローン不可能なので、基本情報のみ送信
                  target: event.target ? {
                    tagName: (event.target as HTMLElement).tagName,
                    id: (event.target as HTMLElement).id,
                    className: (event.target as HTMLElement).className,
                  } : null,
                }
              : null,
          },
        },
        '*'
      );

      // MAIN Worldからのレスポンスを待つ
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('Custom JS execution timeout'));
        }, 5000);

        const handler = (messageEvent: MessageEvent) => {
          if (messageEvent.source !== window) return;

          const response = messageEvent.data;

          if (response.type === 'CUSTOM_JS_RESULT' && response.requestId === requestId) {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);

            if (response.success) {
              console.log('[PluginEngine] Custom JS executed successfully');
              if (action.notification) {
                showNotification(action.notification, 3000, 'success');
              }
              resolve();
            } else {
              console.error('[PluginEngine] Custom JS execution failed:', response.error);
              showNotification(
                `カスタムコードの実行に失敗しました: ${response.error}`,
                5000,
                'error'
              );
              reject(new Error(response.error));
            }
          }
        };

        window.addEventListener('message', handler);
      });
    } catch (error) {
      console.error('[PluginEngine] Custom action execution failed:', error);
      showNotification('カスタムコードの実行に失敗しました', 3000, 'error');
      throw error;
    }
  }

  /**
   * 外部API呼び出し
   */
  private async actionApiCall(action: Action): Promise<void> {
    if (!action.url) {
      console.error('[PluginEngine] apiCall requires url');
      return;
    }

    // テンプレート変数展開
    const url = await resolveTemplateVariables(action.url);

    // セキュリティチェック: HTTPSのみ許可
    if (!url.toLowerCase().startsWith('https://')) {
      console.error('[PluginEngine] Only HTTPS URLs are allowed');
      showNotification('セキュリティ上の理由により、HTTPS以外のURLは使用できません', 3000, 'error');
      return;
    }

    fetch(url, {
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

  /**
   * カスタムスクリプトを実行（execute operation）
   */
  private async handleExecuteScript(operation: Operation): Promise<void> {
    if (!operation.code) {
      throw new Error('execute operation requires code field');
    }

    console.log(`[PluginEngine] Executing script: ${operation.id}`);

    // actionCustomと同じロジックでスクリプト実行
    await this.actionCustom(
      { type: 'custom', code: operation.code },
      document.body
    );

    console.log(`[PluginEngine] Script executed: ${operation.id}`);
  }
}

/**
 * Storage Manager
 * Main WorldからのストレージリクエストをChrome Storage APIに橋渡し
 */
interface StorageRequest {
  type: 'STORAGE_REQUEST';
  requestId: string;
  operation: 'get' | 'set' | 'remove' | 'clear';
  scope: 'page' | 'global';
  key?: string;
  value?: any;
}

interface StorageResponse {
  type: 'STORAGE_RESPONSE';
  requestId: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * ストレージキー名を生成
 */
function generateStorageKey(scope: 'page' | 'global', key?: string): string {
  if (scope === 'global') {
    return key ? `global:${key}` : 'global:';
  } else {
    const domain = location.hostname;
    return key ? `page:${domain}:${key}` : `page:${domain}:`;
  }
}

/**
 * ストレージリクエストを処理
 */
async function handleStorageRequest(request: StorageRequest): Promise<StorageResponse> {
  try {
    const { operation, scope, key, value } = request;

    switch (operation) {
      case 'get': {
        if (!key) {
          throw new Error('get operation requires key');
        }
        const storageKey = generateStorageKey(scope, key);
        const result = await chrome.storage.local.get(storageKey);
        return {
          type: 'STORAGE_RESPONSE',
          requestId: request.requestId,
          success: true,
          result: result[storageKey],
        };
      }

      case 'set': {
        if (!key) {
          throw new Error('set operation requires key');
        }
        const storageKey = generateStorageKey(scope, key);
        await chrome.storage.local.set({ [storageKey]: value });
        return {
          type: 'STORAGE_RESPONSE',
          requestId: request.requestId,
          success: true,
        };
      }

      case 'remove': {
        if (!key) {
          throw new Error('remove operation requires key');
        }
        const storageKey = generateStorageKey(scope, key);
        await chrome.storage.local.remove(storageKey);
        return {
          type: 'STORAGE_RESPONSE',
          requestId: request.requestId,
          success: true,
        };
      }

      case 'clear': {
        // スコープに応じて該当するキーを全削除
        const prefix = generateStorageKey(scope);
        const allKeys = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(allKeys).filter(k => k.startsWith(prefix));
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
        return {
          type: 'STORAGE_RESPONSE',
          requestId: request.requestId,
          success: true,
        };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    return {
      type: 'STORAGE_RESPONSE',
      requestId: request.requestId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Main Worldからのストレージリクエストを受信
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'STORAGE_REQUEST') return;

  const request = event.data as StorageRequest;
  console.log(`[PluginEngine Storage] Received request: ${request.operation} (${request.scope})`);

  const response = await handleStorageRequest(request);
  window.postMessage(response, '*');
});

console.log('[PluginEngine Storage] Storage message handler initialized');
