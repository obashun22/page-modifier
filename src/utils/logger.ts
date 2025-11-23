/**
 * Page Modifier - Logger Utility
 *
 * 環境変数ベースのロギングユーティリティ
 * 開発環境のみログ出力し、本番環境ではエラーとワーニングのみ出力
 */

/** ログレベル */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** ロガー設定 */
interface LoggerConfig {
  /** 開発モードかどうか */
  isDev: boolean;
  /** プレフィックス */
  prefix: string;
  /** 最小ログレベル */
  minLevel: LogLevel;
}

/** デフォルト設定 */
const DEFAULT_CONFIG: LoggerConfig = {
  isDev: import.meta.env?.DEV ?? false,
  prefix: '[PageModifier]',
  minLevel: 'debug',
};

/** ログレベルの優先度 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ログレベルが有効かチェック
 */
function shouldLog(level: LogLevel, config: LoggerConfig): boolean {
  // 本番環境ではwarn/errorのみ
  if (!config.isDev && level !== 'warn' && level !== 'error') {
    return false;
  }

  // 最小ログレベルと比較
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.minLevel];
}

/**
 * ロガークラス
 */
class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * デバッグログ
   */
  debug(...args: unknown[]): void {
    if (shouldLog('debug', this.config)) {
      console.log(`${this.config.prefix} [DEBUG]`, ...args);
    }
  }

  /**
   * 情報ログ
   */
  info(...args: unknown[]): void {
    if (shouldLog('info', this.config)) {
      console.log(`${this.config.prefix} [INFO]`, ...args);
    }
  }

  /**
   * 警告ログ
   */
  warn(...args: unknown[]): void {
    if (shouldLog('warn', this.config)) {
      console.warn(`${this.config.prefix} [WARN]`, ...args);
    }
  }

  /**
   * エラーログ
   */
  error(...args: unknown[]): void {
    if (shouldLog('error', this.config)) {
      console.error(`${this.config.prefix} [ERROR]`, ...args);
    }
  }

  /**
   * 設定を更新
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * グループ開始
   */
  group(label: string): void {
    if (this.config.isDev) {
      console.group(`${this.config.prefix} ${label}`);
    }
  }

  /**
   * グループ終了
   */
  groupEnd(): void {
    if (this.config.isDev) {
      console.groupEnd();
    }
  }

  /**
   * 時間計測開始
   */
  time(label: string): void {
    if (this.config.isDev) {
      console.time(`${this.config.prefix} ${label}`);
    }
  }

  /**
   * 時間計測終了
   */
  timeEnd(label: string): void {
    if (this.config.isDev) {
      console.timeEnd(`${this.config.prefix} ${label}`);
    }
  }
}

/** デフォルトロガーインスタンス */
export const logger = new Logger();

/**
 * カスタムプレフィックス付きロガーを作成
 *
 * @param prefix - カスタムプレフィックス
 * @returns ロガーインスタンス
 *
 * @example
 * const pluginLogger = createLogger('[PluginEngine]');
 * pluginLogger.info('Plugin executed');
 */
export function createLogger(prefix: string): Logger {
  return new Logger({ ...DEFAULT_CONFIG, prefix });
}
