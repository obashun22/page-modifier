/**
 * Page Modifier - Custom Error Classes
 *
 * アプリケーション固有のエラークラス定義
 */

/**
 * ベースエラークラス
 */
export class PageModifierError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;

    // Error.captureStackTrace が存在する場合（V8エンジン）
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * エラー情報をオブジェクトとして返す
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * プラグイン関連エラー
 */
export class PluginError extends PageModifierError {
  constructor(
    message: string,
    public readonly pluginId?: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, { ...details, pluginId });
  }
}

/**
 * プラグイン実行エラー
 */
export class PluginExecutionError extends PluginError {
  constructor(
    message: string,
    pluginId: string,
    public readonly operationId?: string,
    details?: Record<string, unknown>
  ) {
    super(message, pluginId, 'PLUGIN_EXECUTION_ERROR', {
      ...details,
      operationId,
    });
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends PageModifierError {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string[]; message: string }>,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { ...details, errors });
  }
}

/**
 * ストレージエラー
 */
export class StorageError extends PageModifierError {
  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message, code || 'STORAGE_ERROR', details);
  }
}

/**
 * API通信エラー
 */
export class APIError extends PageModifierError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'API_ERROR', { ...details, statusCode, endpoint });
  }
}

/**
 * セレクターエラー
 */
export class SelectorError extends PageModifierError {
  constructor(
    message: string,
    public readonly selector?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SELECTOR_ERROR', { ...details, selector });
  }
}

/**
 * DOM操作エラー
 */
export class DOMError extends PageModifierError {
  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message, code || 'DOM_ERROR', details);
  }
}

/**
 * セキュリティエラー
 */
export class SecurityError extends PageModifierError {
  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message, code || 'SECURITY_ERROR', details);
  }
}

/**
 * エラーがPageModifierErrorのインスタンスかチェック
 */
export function isPageModifierError(error: unknown): error is PageModifierError {
  return error instanceof PageModifierError;
}

/**
 * エラーから安全にメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * エラーハンドリングヘルパー
 */
export class ErrorHandler {
  /**
   * エラーをユーザーフレンドリーなメッセージに変換
   */
  static toUserMessage(error: unknown): string {
    if (error instanceof PluginExecutionError) {
      return `プラグイン「${error.pluginId}」の実行中にエラーが発生しました: ${error.message}`;
    }

    if (error instanceof ValidationError) {
      const errorList = error.errors
        .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
        .join('\n');
      return `入力内容に問題があります:\n${errorList}`;
    }

    if (error instanceof APIError) {
      if (error.statusCode === 401) {
        return 'APIキーが無効です。設定画面で正しいAPIキーを入力してください。';
      }
      if (error.statusCode === 429) {
        return 'APIのリクエスト制限に達しました。しばらく待ってから再試行してください。';
      }
      return `API通信エラーが発生しました: ${error.message}`;
    }

    if (error instanceof StorageError) {
      return `データの保存・読み込み中にエラーが発生しました: ${error.message}`;
    }

    if (error instanceof SelectorError) {
      return `要素の選択中にエラーが発生しました: ${error.message}`;
    }

    if (error instanceof SecurityError) {
      return `セキュリティ上の理由で操作がブロックされました: ${error.message}`;
    }

    if (error instanceof PageModifierError) {
      return error.message;
    }

    if (error instanceof Error) {
      return `予期しないエラーが発生しました: ${error.message}`;
    }

    return '予期しないエラーが発生しました';
  }

  /**
   * エラーをログ出力用にフォーマット
   */
  static format(error: unknown): string {
    if (isPageModifierError(error)) {
      return JSON.stringify(error.toJSON(), null, 2);
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}\n${error.stack}`;
    }

    return String(error);
  }
}
