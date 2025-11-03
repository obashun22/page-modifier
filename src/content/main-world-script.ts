/**
 * Page Modifier - MAIN World Script
 *
 * このスクリプトはページコンテキスト（MAIN World）で実行され、
 * Content ScriptのCSP制限を回避して任意のJavaScriptコードを実行します。
 *
 * セキュリティ上の注意:
 * - このスクリプトはページのJavaScriptと同じコンテキストで実行されます
 * - XSS脆弱性のあるページでは危険です
 * - セキュリティレベル「advanced」でのみ使用されます
 */

interface CustomJSRequest {
  type: 'EXECUTE_CUSTOM_JS';
  requestId: string;
  code: string;
  selector?: string;
  context: {
    event?: any;
  };
}

interface CustomJSResponse {
  type: 'CUSTOM_JS_RESULT';
  requestId: string;
  success: boolean;
  result?: any;
  error?: string;
}

interface EvalTemplateRequest {
  type: 'EVAL_TEMPLATE';
  requestId: string;
  expression: string;
}

interface EvalTemplateResponse {
  type: 'EVAL_TEMPLATE_RESULT';
  requestId: string;
  success: boolean;
  result?: string;
  error?: string;
}

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

console.log('[PageModifier MAIN World] Script loaded');

// Content Scriptからのメッセージを受信
window.addEventListener('message', (event) => {
  // 同じwindowからのメッセージのみ受け付ける
  if (event.source !== window) return;

  const message = event.data;

  if (message.type === 'EVAL_TEMPLATE') {
    const request = message as EvalTemplateRequest;
    console.log('[PageModifier MAIN World] Evaluating template:', request.expression);

    try {
      // テンプレート式を評価
      const result = Function('"use strict"; return (' + request.expression + ')')();

      // 成功を返す
      const response: EvalTemplateResponse = {
        type: 'EVAL_TEMPLATE_RESULT',
        requestId: request.requestId,
        success: true,
        result: String(result),
      };

      window.postMessage(response, '*');
    } catch (error) {
      console.warn('[PageModifier MAIN World] Template evaluation failed:', error);

      // エラーを返す
      const response: EvalTemplateResponse = {
        type: 'EVAL_TEMPLATE_RESULT',
        requestId: request.requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      window.postMessage(response, '*');
    }
  } else if (message.type === 'EXECUTE_CUSTOM_JS') {
    const request = message as CustomJSRequest;
    console.log('[PageModifier MAIN World] Executing custom JS:', request.requestId);

    try {
      // セキュリティサンドボックスの作成
      const sandbox = {
        document: document,
        window: window,
        console: console,
        // 危険なAPIは含めない（localStorage, fetch, XMLHttpRequest等）
      };

      // 要素を取得
      const element = message.selector
        ? document.querySelector(message.selector)
        : null;

      // カスタムコードを実行
      const func = new Function(
        'element',
        'event',
        'sandbox',
        `
        with (sandbox) {
          ${message.code}
        }
      `
      );

      const result = func(element, message.context.event, sandbox);

      // 成功を返す
      const response: CustomJSResponse = {
        type: 'CUSTOM_JS_RESULT',
        requestId: message.requestId,
        success: true,
        result: result,
      };

      window.postMessage(response, '*');
    } catch (error) {
      console.error('[PageModifier MAIN World] Custom JS execution failed:', error);

      // エラーを返す
      const response: CustomJSResponse = {
        type: 'CUSTOM_JS_RESULT',
        requestId: message.requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      window.postMessage(response, '*');
    }
  } else if (message.type === 'STORAGE_RESPONSE') {
    // ストレージレスポンスは下記のPluginStorage APIが処理する
  }
});

/**
 * PluginStorage API
 * Main WorldからContent Script経由でchrome.storage.localにアクセスするためのAPI
 */
const createStorageAPI = (scope: 'page' | 'global') => {
  const sendStorageRequest = (operation: string, key?: string, value?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const requestId = `storage_${Date.now()}_${Math.random()}`;

      const request: StorageRequest = {
        type: 'STORAGE_REQUEST',
        requestId,
        operation: operation as any,
        scope,
        key,
        value,
      };

      // レスポンスハンドラーを登録
      const handleResponse = (event: MessageEvent) => {
        if (event.source !== window) return;
        const response = event.data as StorageResponse;
        if (response.type === 'STORAGE_RESPONSE' && response.requestId === requestId) {
          window.removeEventListener('message', handleResponse);
          if (response.success) {
            resolve(response.result);
          } else {
            reject(new Error(response.error || 'Storage operation failed'));
          }
        }
      };

      window.addEventListener('message', handleResponse);

      // タイムアウト設定（5秒）
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        reject(new Error('Storage operation timeout'));
      }, 5000);

      // Content Scriptにリクエスト送信
      window.postMessage(request, '*');
    });
  };

  return {
    async get(key: string): Promise<any> {
      return sendStorageRequest('get', key);
    },
    async set(key: string, value: any): Promise<void> {
      await sendStorageRequest('set', key, value);
    },
    async remove(key: string): Promise<void> {
      await sendStorageRequest('remove', key);
    },
    async clear(): Promise<void> {
      await sendStorageRequest('clear');
    },
  };
};

// グローバルAPIをエクスポート
(window as any).pluginStorage = {
  page: createStorageAPI('page'),
  global: createStorageAPI('global'),
};

console.log('[PageModifier MAIN World] pluginStorage API initialized');
