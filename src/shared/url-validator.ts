/**
 * Page Modifier - URL Validator
 *
 * URLの検証とセキュリティチェック
 */

/**
 * 検証結果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * URLバリデーター
 *
 * URLの安全性を検証
 */
export class URLValidator {
  private allowedProtocols = ['https:', 'http:'];
  private blockedDomains: string[] = [
    // 既知の悪意あるドメイン（例）
    // 実際の運用では外部ブロックリストAPIを使用することを推奨
  ];

  /**
   * URLを検証
   */
  validate(url: string, options?: ValidationOptions): ValidationResult {
    try {
      const urlObj = new URL(url);

      // javascript:スキーム禁止
      if (urlObj.protocol.toLowerCase() === 'javascript:') {
        return {
          valid: false,
          error: 'javascript: URLs are not allowed',
        };
      }

      // data:スキーム禁止（オプション）
      if (options?.blockDataUrls && urlObj.protocol.toLowerCase() === 'data:') {
        return {
          valid: false,
          error: 'data: URLs are not allowed',
        };
      }

      // プロトコルチェック
      if (!this.allowedProtocols.includes(urlObj.protocol)) {
        return {
          valid: false,
          error: `Unsupported protocol: ${urlObj.protocol}`,
        };
      }

      // HTTPSのみ許可（オプション）
      if (options?.httpsOnly && urlObj.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Only HTTPS URLs are allowed',
        };
      }

      // ブロックリストチェック
      if (this.isBlockedDomain(urlObj.hostname)) {
        return {
          valid: false,
          error: 'Blocked domain',
        };
      }

      // 許可リストチェック（オプション）
      if (options?.allowedDomains && options.allowedDomains.length > 0) {
        if (!this.isAllowedDomain(urlObj.hostname, options.allowedDomains)) {
          return {
            valid: false,
            error: 'Domain not in allowed list',
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid URL format',
      };
    }
  }

  /**
   * ブロックされたドメインかチェック
   */
  private isBlockedDomain(hostname: string): boolean {
    return this.blockedDomains.some((blocked) => hostname.endsWith(blocked));
  }

  /**
   * 許可されたドメインかチェック
   */
  private isAllowedDomain(hostname: string, allowedDomains: string[]): boolean {
    return allowedDomains.some((allowed) => {
      // ワイルドカードサポート
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return hostname.endsWith(domain) || hostname === domain.slice(1);
      }
      return hostname === allowed || hostname.endsWith(`.${allowed}`);
    });
  }

  /**
   * ブロックドメインを追加
   */
  addBlockedDomain(domain: string): void {
    if (!this.blockedDomains.includes(domain)) {
      this.blockedDomains.push(domain);
    }
  }

  /**
   * ブロックドメインを削除
   */
  removeBlockedDomain(domain: string): void {
    const index = this.blockedDomains.indexOf(domain);
    if (index > -1) {
      this.blockedDomains.splice(index, 1);
    }
  }

  /**
   * ブロックドメインリストを取得
   */
  getBlockedDomains(): string[] {
    return [...this.blockedDomains];
  }
}

/**
 * 検証オプション
 */
export interface ValidationOptions {
  /**
   * HTTPSのみ許可
   */
  httpsOnly?: boolean;

  /**
   * data: URLをブロック
   */
  blockDataUrls?: boolean;

  /**
   * 許可するドメインのリスト（指定した場合、これらのドメインのみ許可）
   */
  allowedDomains?: string[];
}

/**
 * グローバルなURLバリデーターインスタンス
 */
export const urlValidator = new URLValidator();

// ==================== ドメインパターンマッチング ====================

/**
 * Match Patternの構成要素
 */
export interface ParsedMatchPattern {
  scheme: string;  // 'http', 'https', '*', 'file'
  host: string;    // 'example.com', '*.example.com', '*'
  path: string;    // '/*', '/path/*'
}

/**
 * Match Pattern文字列をパース
 *
 * Chrome Extension Match Pattern形式をサポート
 * 形式: <scheme>://<host>/<path>
 *
 * @param pattern - Match Pattern文字列
 * @returns パース結果（失敗時はnull）
 *
 * @example
 * parseMatchPattern('https://example.com/*') // => { scheme: 'https', host: 'example.com', path: '/*' }
 * parseMatchPattern('*://*.github.com/*') // => { scheme: '*', host: '*.github.com', path: '/*' }
 */
export function parseMatchPattern(pattern: string): ParsedMatchPattern | null {
  // 特殊パターン: <all_urls>
  if (pattern === '<all_urls>') {
    return { scheme: '*', host: '*', path: '/*' };
  }

  // 基本形式: <scheme>://<host>/<path>
  const match = pattern.match(/^(\*|https?|file):\/\/([^/]+)(\/.*)?$/);
  if (!match) {
    return null;
  }

  const scheme = match[1];
  const host = match[2];
  const path = match[3] || '/*';

  // ホスト部分のバリデーション
  if (host !== '*') {
    // ワイルドカードは先頭のみ許可
    if (host.includes('*')) {
      if (!host.startsWith('*.')) {
        return null; // ワイルドカードが先頭以外にある、または直後にピリオドがない
      }
    }
  }

  return { scheme, host, path };
}

/**
 * ドメインパターンをChrome Extension Match Patternに変換
 *
 * @param domainPattern - ドメインパターン
 * @returns Match Pattern形式の文字列
 *
 * @example
 * convertToMatchPattern('*') // => '<all_urls>'
 * convertToMatchPattern('example.com') // => 'https://example.com/*'
 * convertToMatchPattern('*.example.com') // => 'https://*.example.com/*'
 * convertToMatchPattern('example.com/api/*') // => 'https://example.com/api/*'
 */
export function convertToMatchPattern(domainPattern: string): string {
  // 全サイト指定
  if (domainPattern === '*') {
    return '<all_urls>';
  }

  // ドメインパターンをMatch Patternに変換
  let pattern = 'https://' + domainPattern;

  // 末尾に/*がなければ追加
  if (!pattern.endsWith('/*')) {
    pattern = pattern + '/*';
  }

  return pattern;
}

/**
 * URLがドメインパターンにマッチするか判定
 *
 * ドメインパターンをChrome Extension Match Pattern形式に変換してマッチング
 *
 * @param url - 判定対象のURL
 * @param domainPattern - ドメインパターン（"example.com", "*.github.com", "*"）
 * @returns マッチする場合true
 *
 * @example
 * matchesDomain('https://github.com/user/repo', 'github.com') // => true
 * matchesDomain('https://api.github.com/', '*.github.com') // => true
 * matchesDomain('https://example.com', '*') // => true
 */
export function matchesDomain(url: string, domainPattern: string): boolean {
  // ドメインパターンをMatch Patternに変換
  const matchPattern = convertToMatchPattern(domainPattern);

  // Match Pattern形式でマッチング
  const parsed = parseMatchPattern(matchPattern);
  if (!parsed) {
    return false;
  }

  // URLをパース
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return false;
  }

  // スキームマッチング
  if (parsed.scheme !== '*') {
    if (urlObj.protocol !== `${parsed.scheme}:`) {
      return false;
    }
  } else {
    // '*'はhttp/httpsのみにマッチ
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
  }

  // ホストマッチング
  if (parsed.host !== '*') {
    if (parsed.host.startsWith('*.')) {
      // ワイルドカードサブドメイン: *.example.com
      // サブドメインのみにマッチ（ベースドメイン自体は含まない）
      const baseDomain = parsed.host.substring(2); // '*.example.com' -> 'example.com'
      if (!urlObj.hostname.endsWith(`.${baseDomain}`)) {
        return false;
      }
    } else {
      // 完全一致
      if (urlObj.hostname !== parsed.host) {
        return false;
      }
    }
  }

  // パスマッチング
  if (parsed.path !== '/*') {
    const pathPattern = parsed.path
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // 正規表現特殊文字をエスケープ
      .replace(/\*/g, '.*');  // *を.*に変換

    const regex = new RegExp(`^${pathPattern}$`);
    if (!regex.test(urlObj.pathname)) {
      return false;
    }
  }

  return true;
}

/**
 * URLからドメインを抽出
 *
 * @param url - URL文字列
 * @returns ドメイン部分（抽出失敗時は空文字列）
 *
 * @example
 * extractDomain('https://github.com/user/repo') // => 'github.com'
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}
