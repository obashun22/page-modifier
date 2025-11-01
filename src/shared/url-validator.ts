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
