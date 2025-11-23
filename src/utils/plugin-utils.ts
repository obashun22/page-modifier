/**
 * Page Modifier - Plugin Utility Functions
 *
 * プラグイン操作のユーティリティ関数
 */

import type { Plugin } from '../shared/types';
import {
  parseMatchPattern,
  convertToMatchPattern,
  matchesDomain as matchesDomainImpl,
  extractDomain as extractDomainImpl,
} from '../shared/url-validator';

// url-validatorから関数を再エクスポート
export { parseMatchPattern, convertToMatchPattern };

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
 * URLがドメインパターンにマッチするか判定
 * （url-validatorの関数のラッパー）
 */
export function matchesDomain(url: string, domainPattern: string): boolean {
  return matchesDomainImpl(url, domainPattern);
}

/**
 * プラグインが指定URL/ドメインに適用可能か判定
 *
 * @param plugin - プラグイン
 * @param urlOrDomain - 判定対象のURL（完全なURL形式）またはドメイン
 * @returns 適用可能な場合true
 */
export function isPluginApplicable(plugin: Plugin, urlOrDomain: string): boolean {
  // URLかドメイン名かを判定し、URLでなければhttps://を付与してURL形式にする
  let url = urlOrDomain;

  // URLでない場合（スキームがない場合）はhttps://を付与
  if (!urlOrDomain.includes('://')) {
    url = `https://${urlOrDomain}`;
  }

  return plugin.targetDomains.some((pattern) => matchesDomain(url, pattern));
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
 * （url-validatorの関数のラッパー）
 */
export function extractDomain(url: string): string {
  return extractDomainImpl(url);
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

/**
 * プラグインがカスタムコード実行を含むか判定
 *
 * 以下のいずれかが含まれる場合にtrueを返す：
 * - execute操作
 * - イベントハンドラー（events配列）
 * - カスタム条件（condition.type === 'custom'）
 *
 * @param plugin - プラグイン
 * @returns カスタムコード実行を含む場合true
 *
 * @example
 * hasCustomCodeExecution(plugin) // => true (execute操作がある場合)
 */
export function hasCustomCodeExecution(plugin: Plugin): boolean {
  for (const operation of plugin.operations) {
    // execute操作をチェック
    if (operation.type === 'execute') {
      return true;
    }

    // カスタム条件をチェック
    if (operation.condition?.type === 'custom') {
      return true;
    }

    // insert操作の要素にイベントがあるかチェック
    if (operation.type === 'insert') {
      if (hasEventsInElement(operation.params.element)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 要素（およびその子要素）にイベントハンドラーが含まれるか再帰的にチェック
 *
 * @param element - チェック対象の要素
 * @returns イベントハンドラーが含まれる場合true
 */
function hasEventsInElement(element: { events?: unknown[]; condition?: { type?: string }; children?: unknown[] }): boolean {
  // eventsプロパティが存在し、配列で、要素がある場合
  if (element.events && Array.isArray(element.events) && element.events.length > 0) {
    return true;
  }

  // イベント内のカスタム条件もチェック
  if (element.events && Array.isArray(element.events)) {
    for (const event of element.events) {
      const typedEvent = event as { condition?: { type?: string } };
      if (typedEvent.condition?.type === 'custom') {
        return true;
      }
    }
  }

  // 子要素を再帰的にチェック
  if (element.children && Array.isArray(element.children)) {
    for (const child of element.children) {
      const typedChild = child as { events?: unknown[]; condition?: { type?: string }; children?: unknown[] };
      if (hasEventsInElement(typedChild)) {
        return true;
      }
    }
  }

  return false;
}
