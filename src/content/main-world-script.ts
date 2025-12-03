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

import { createLogger } from '../utils/logger';

const logger = createLogger('[MAIN World]');

interface CustomJSRequest {
  type: 'EXECUTE_CUSTOM_JS';
  requestId: string;
  code: string;
  selector?: string;
  context: {
    event?: unknown;
  };
}

interface CustomJSResponse {
  type: 'CUSTOM_JS_RESULT';
  requestId: string;
  success: boolean;
  result?: unknown;
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
  value?: unknown;
}

interface StorageResponse {
  type: 'STORAGE_RESPONSE';
  requestId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

interface CSPCheckRequest {
  type: 'CHECK_CSP';
  requestId: string;
}

interface CSPCheckResponse {
  type: 'CSP_CHECK_RESULT';
  requestId: string;
  allowsEval: boolean;
}

interface ChromeAPIRequest {
  type: 'CHROME_API_REQUEST';
  requestId: string;
  api: string;
  method: string;
  args: unknown[];
}

interface ChromeAPIResponse {
  type: 'CHROME_API_RESPONSE';
  requestId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

logger.info('Script loaded');

// Content Scriptからのメッセージを受信
window.addEventListener('message', (event) => {
  // 同じwindowからのメッセージのみ受け付ける
  if (event.source !== window) return;

  const message = event.data;

  if (message.type === 'EVAL_TEMPLATE') {
    const request = message as EvalTemplateRequest;
    logger.info('Evaluating template:', request.expression);

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
      logger.warn('Template evaluation failed:', error);

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
    logger.info('Executing custom JS:', request.requestId);

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

      // イベントオブジェクトを再構成
      // Content Scriptから送られてきた最小限の情報をもとに、実際のDOM要素を使ってeventを作り直す
      let reconstructedEvent = message.context.event;
      if (reconstructedEvent && element) {
        // 実際のDOM要素を使って完全なeventオブジェクトを作成
        reconstructedEvent = {
          ...reconstructedEvent,
          target: element,        // 実際のDOM要素
          currentTarget: element, // 実際のDOM要素
        };
      }

      // カスタムコードを実行
      // thisを要素にバインドするため、Functionコンストラクタで関数を生成
      const func = new Function(
        'event',
        'sandbox',
        `
        with (sandbox) {
          ${message.code}
        }
      `
      );

      // thisを要素にバインドして実行
      const result = element
        ? func.call(element, reconstructedEvent, sandbox)
        : func(reconstructedEvent, sandbox);

      // 成功を返す
      const response: CustomJSResponse = {
        type: 'CUSTOM_JS_RESULT',
        requestId: message.requestId,
        success: true,
        result: result,
      };

      window.postMessage(response, '*');
    } catch (error) {
      logger.error('Custom JS execution failed:', error);

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
  } else if (message.type === 'CHECK_CSP') {
    const request = message as CSPCheckRequest;
    logger.info('Checking CSP...');

    let allowsEval = false;
    try {
      // MAIN Worldで試験的にFunctionコンストラクタを実行
      new Function('return 1')();
      allowsEval = true;
      logger.info('CSP allows eval');
    } catch (error) {
      logger.info('CSP blocks eval:', error);
      allowsEval = false;
    }

    const response: CSPCheckResponse = {
      type: 'CSP_CHECK_RESULT',
      requestId: request.requestId,
      allowsEval: allowsEval,
    };

    window.postMessage(response, '*');
  }
});

/**
 * PluginStorage API
 * Main WorldからContent Script経由でchrome.storage.localにアクセスするためのAPI
 */
const createStorageAPI = (scope: 'page' | 'global') => {
  const sendStorageRequest = (operation: string, key?: string, value?: unknown): Promise<any> => {
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
    async set(key: string, value: unknown): Promise<void> {
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

/**
 * Chrome API Proxy
 * Main WorldからContent Script経由でChrome Extension APIにアクセスするためのプロキシ
 */
const createChromeAPIProxy = (api: string) => {
  return new Proxy(
    {},
    {
      get: (_target, method: string) => {
        return (...args: unknown[]) => {
          return new Promise((resolve, reject) => {
            const requestId = `chrome_${Date.now()}_${Math.random()}`;

            const request: ChromeAPIRequest = {
              type: 'CHROME_API_REQUEST',
              requestId,
              api,
              method,
              args,
            };

            // レスポンスハンドラーを登録
            const handleResponse = (event: MessageEvent) => {
              if (event.source !== window) return;
              const response = event.data as ChromeAPIResponse;
              if (response.type === 'CHROME_API_RESPONSE' && response.requestId === requestId) {
                window.removeEventListener('message', handleResponse);
                if (response.success) {
                  resolve(response.result);
                } else {
                  reject(new Error(response.error || 'Chrome API call failed'));
                }
              }
            };

            window.addEventListener('message', handleResponse);

            // タイムアウト設定（5秒）
            setTimeout(() => {
              window.removeEventListener('message', handleResponse);
              reject(new Error('Chrome API call timeout'));
            }, 5000);

            // Content Scriptにリクエスト送信
            window.postMessage(request, '*');
          });
        };
      },
    }
  );
};

// グローバルAPIをエクスポート
(window as any).pluginStorage = {
  page: createStorageAPI('page'),
  global: createStorageAPI('global'),
};

// Chrome API Proxyをエクスポート
(window as any).chrome = (window as any).chrome || {};
(window as any).chrome.runtime = createChromeAPIProxy('runtime');

logger.info('pluginStorage API initialized');
logger.info('chrome.runtime API proxy initialized');
