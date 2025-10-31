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
 * ドメインがパターンにマッチするか判定
 *
 * ワイルドカード（*）をサポート
 *
 * @param domain - 判定対象のドメイン
 * @param pattern - マッチパターン
 * @returns マッチする場合true
 *
 * @example
 * matchesDomain('github.com', 'github.com') // => true
 * matchesDomain('github.com', '*.com') // => true
 * matchesDomain('api.github.com', '*.github.com') // => true
 * matchesDomain('example.org', '*.com') // => false
 */
export function matchesDomain(domain: string, pattern: string): boolean {
  // 完全一致
  if (domain === pattern) {
    return true;
  }

  // ワイルドカードパターンを正規表現に変換
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // ドットをエスケープ
    .replace(/\*/g, '.*');  // *を.*に変換

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(domain);
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
 * プラグインを優先度順にソート
 *
 * @param plugins - プラグインの配列
 * @returns 優先度順（降順）にソートされたプラグイン配列
 */
export function sortPluginsByPriority(plugins: Plugin[]): Plugin[] {
  return [...plugins].sort((a, b) => b.priority - a.priority);
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
