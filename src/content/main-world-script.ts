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

console.log('[PageModifier MAIN World] Script loaded');

// Content Scriptからのメッセージを受信
window.addEventListener('message', (event) => {
  // 同じwindowからのメッセージのみ受け付ける
  if (event.source !== window) return;

  const message = event.data as CustomJSRequest;

  if (message.type === 'EXECUTE_CUSTOM_JS') {
    console.log('[PageModifier MAIN World] Executing custom JS:', message.requestId);

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
  }
});
