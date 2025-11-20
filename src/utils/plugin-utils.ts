/**
 * Page Modifier - Plugin Utility Functions
 *
 * プラグイン操作のユーティリティ関数
 */

import type { Plugin } from '../shared/types';

/**
 * プラグインIDを生成
 *
 * @param name - プラグイン名
 * @returns 生成されたプラグインID
 *
 * @example
 * generatePluginId('Copy Button') // => 'copy-button'
 */
export function generatePluginId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * バージョンを比較
 *
 * @param v1 - バージョン1（semver形式）
 * @param v2 - バージョン2（semver形式）
 * @returns v1 > v2 なら1、v1 < v2 なら-1、v1 === v2 なら0
 *
 * @example
 * compareVersions('1.2.3', '1.2.0') // => 1
 * compareVersions('1.0.0', '2.0.0') // => -1
 * compareVersions('1.0.0', '1.0.0') // => 0
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Match Patternの構成要素
 */
interface ParsedMatchPattern {
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
 * ドメインがMatch Patternにマッチするか判定
 *
 * Chrome Extension Match Pattern仕様に準拠:
 * - <scheme>://<host>/<path> 形式をサポート
 * - 後方互換性のため、ドメイン名のみの指定も許可（https://で補完）
 *
 * @param url - 判定対象のURL（完全なURLまたはドメイン名）
 * @param pattern - Match Pattern（Chrome Extension形式 or ドメイン名のみ）
 * @returns マッチする場合true
 *
 * @example
 * // Match Pattern形式
 * matchesDomain('https://github.com/user/repo', 'https://github.com/*') // => true
 * matchesDomain('https://api.github.com/', '*://*.github.com/*') // => true
 * matchesDomain('http://example.com', 'https://example.com/*') // => false (scheme不一致)
 *
 * // 後方互換（ドメイン名のみ）
 * matchesDomain('https://github.com', 'github.com') // => true
 * matchesDomain('https://api.github.com', '*.github.com') // => true
 */
export function matchesDomain(url: string, pattern: string): boolean {
  // 後方互換: ドメイン名のみの場合（スキームが含まれていない）
  if (!pattern.includes('://')) {
    return matchesDomainLegacy(url, pattern);
  }

  // Match Pattern形式
  const parsed = parseMatchPattern(pattern);
  if (!parsed) {
    console.warn(`[matchesDomain] Invalid match pattern: ${pattern}`);
    return false;
  }

  // URLをパース
  let urlObj: URL;
  try {
    // 完全なURLの場合
    urlObj = new URL(url);
  } catch {
    // ドメイン名のみの場合（後方互換）
    try {
      urlObj = new URL(`https://${url}`);
    } catch {
      return false;
    }
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
 * 旧形式（ドメイン名のみ）のパターンマッチング（後方互換性用）
 *
 * @param url - 判定対象のURL（完全なURLまたはドメイン名）
 * @param pattern - ドメインパターン（ワイルドカード対応）
 * @returns マッチする場合true
 *
 * @example
 * matchesDomainLegacy('https://github.com', 'github.com') // => true
 * matchesDomainLegacy('https://api.github.com', '*.github.com') // => true
 * matchesDomainLegacy('github.com', '*.com') // => true
 */
function matchesDomainLegacy(url: string, pattern: string): boolean {
  // URLからホスト名を抽出
  let hostname: string;
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
  } catch {
    // URLでない場合はドメイン名として扱う
    hostname = url;
  }

  // 完全一致
  if (hostname === pattern) {
    return true;
  }

  // *.example.com形式の場合、特別処理
  if (pattern.startsWith('*.')) {
    const baseDomain = pattern.substring(2); // '*.example.com' -> 'example.com'
    // サブドメインのみにマッチ（ベースドメイン自体は含まない）
    return hostname.endsWith(`.${baseDomain}`) && hostname !== baseDomain;
  }

  // その他のワイルドカードパターンを正規表現に変換
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // ドットをエスケープ
    .replace(/\*/g, '.*');  // *を.*に変換

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(hostname);
}

/**
 * プラグインが指定ドメインに適用可能か判定
 *
 * @param plugin - プラグイン
 * @param domain - 判定対象のドメイン
 * @returns 適用可能な場合true
 */
export function isPluginApplicable(plugin: Plugin, domain: string): boolean {
  return plugin.targetDomains.some((pattern) => matchesDomain(domain, pattern));
}

/**
 * プラグインの表示名を取得
 *
 * @param plugin - プラグイン
 * @returns 表示名（name または id）
 */
export function getPluginDisplayName(plugin: Plugin): string {
  return plugin.name || plugin.id;
}

/**
 * プラグインの概要文字列を生成
 *
 * @param plugin - プラグイン
 * @returns 概要文字列
 *
 * @example
 * getPluginSummary(plugin)
 * // => "Copy Button v1.0.0 (3 operations, github.com)"
 */
export function getPluginSummary(plugin: Plugin): string {
  const name = getPluginDisplayName(plugin);
  const opsCount = plugin.operations.length;
  const domains = plugin.targetDomains.slice(0, 2).join(', ');
  const moreDomainsText = plugin.targetDomains.length > 2 ? ` +${plugin.targetDomains.length - 2}` : '';

  return `${name} v${plugin.version} (${opsCount} operations, ${domains}${moreDomainsText})`;
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

/**
 * タイムスタンプ付きのユニークIDを生成
 *
 * @param prefix - プレフィックス（省略可）
 * @returns ユニークID
 *
 * @example
 * generateUniqueId() // => '1699876543210-abc123'
 * generateUniqueId('op') // => 'op-1699876543210-abc123'
 */
export function generateUniqueId(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const id = `${timestamp}-${random}`;

  return prefix ? `${prefix}-${id}` : id;
}
