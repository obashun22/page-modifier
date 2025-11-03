/**
 * Page Modifier - Content Script
 *
 * Webページに注入されるメインスクリプト
 * プラグインの自動実行、動的コンテンツの監視、Background Workerとの通信を担当
 */

import { PluginEngine } from './plugin-engine';
import { ElementSelector } from './element-selector';
import type { Plugin } from '../shared/types';
import { extractDomain } from '../utils/plugin-utils';
import { SecurityAnalyzer } from '../shared/security-analyzer';
import { canExecutePlugin } from '../shared/plugin-security-checker';
import type { SecurityLevel } from '../shared/storage-types';

/**
 * Content Scriptメインクラス
 */
class ContentScript {
  private pluginEngine: PluginEngine;
  private elementSelector: ElementSelector;
  private observer: MutationObserver | null = null;
  private activePlugins: Map<string, Plugin> = new Map();
  private initialized = false;

  constructor() {
    this.pluginEngine = new PluginEngine();
    this.elementSelector = new ElementSelector();
  }

  /**
   * 初期化
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.warn('[PageModifier] Content script already initialized');
      return;
    }

    console.log('[PageModifier] Content script initializing...');

    // DOM読み込み完了を待つ
    if (document.readyState === 'loading') {
      await new Promise<void>((resolve) => {
        document.addEventListener('DOMContentLoaded', () => resolve());
      });
    }

    // 現在のドメインを取得
    const domain = extractDomain(location.href);
    console.log(`[PageModifier] Current domain: ${domain}`);

    // 該当ドメインのプラグインを取得
    const plugins = await this.fetchPluginsForDomain(domain);
    console.log(`[PageModifier] Found ${plugins.length} plugins for domain`);

    // プラグインを実行
    if (plugins.length > 0) {
      await this.executePlugins(plugins);
    }

    // MutationObserver開始（動的コンテンツ監視）
    this.startObserving();

    // メッセージリスナー登録
    this.setupMessageListeners();

    this.initialized = true;
    console.log('[PageModifier] Content script initialized');
  }

  /**
   * ドメインに対応するプラグインを取得
   */
  private async fetchPluginsForDomain(domain: string): Promise<Plugin[]> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PLUGINS_FOR_DOMAIN',
        domain,
      });

      return response?.plugins || [];
    } catch (error) {
      console.error('[PageModifier] Failed to fetch plugins:', error);
      return [];
    }
  }

  /**
   * プラグインを実行
   */
  private async executePlugins(plugins: Plugin[]): Promise<void> {
    // 現在のセキュリティレベルを取得
    const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const securityLevel: SecurityLevel = settingsResponse.settings?.securityLevel || 'safe';

    // プラグインは古い順に実行（配列の逆順 = 最も古いプラグインから）
    for (const plugin of plugins.slice().reverse()) {
      // 自動適用フラグチェック
      if (!plugin.autoApply) {
        console.log(`[PageModifier] Skipping plugin ${plugin.id}: autoApply is false`);
        continue;
      }

      // セキュリティレベルチェック
      if (!canExecutePlugin(plugin, securityLevel)) {
        const analyzer = new SecurityAnalyzer();
        const analysis = analyzer.analyze(plugin);
        console.warn(
          `[PageModifier] Plugin ${plugin.id} requires ${analysis.level} security level, ` +
          `but current level is ${securityLevel}. Disabling plugin.`
        );

        // プラグインを自動的に無効化
        chrome.runtime.sendMessage({
          type: 'TOGGLE_PLUGIN',
          pluginId: plugin.id,
          enabled: false,
        }).catch((error) => {
          console.error(`[PageModifier] Failed to disable plugin ${plugin.id}:`, error);
        });

        continue;
      }

      // プラグイン実行
      try {
        console.log(`[PageModifier] Executing plugin: ${plugin.name} (${plugin.id})`);
        const result = await this.pluginEngine.executePlugin(plugin);

        if (result.success) {
          console.log(`[PageModifier] ✅ Plugin ${plugin.id} executed successfully`);
          this.activePlugins.set(plugin.id, plugin);

          // 使用記録を通知
          chrome.runtime.sendMessage({
            type: 'RECORD_PLUGIN_USAGE',
            pluginId: plugin.id,
          }).catch(() => {
            // エラーは無視（重要でない）
          });
        } else {
          console.error(`[PageModifier] ❌ Plugin ${plugin.id} failed:`, result);
        }
      } catch (error) {
        console.error(`[PageModifier] Failed to execute plugin ${plugin.id}:`, error);

        // セキュリティ関連のエラーの場合、プラグインを無効化
        if (error instanceof Error && error.message.includes('advanced')) {
          console.warn(`[PageModifier] Security error for plugin ${plugin.id}. Disabling plugin.`);
          chrome.runtime.sendMessage({
            type: 'TOGGLE_PLUGIN',
            pluginId: plugin.id,
            enabled: false,
          }).catch((err) => {
            console.error(`[PageModifier] Failed to disable plugin ${plugin.id}:`, err);
          });
        }
      }
    }
  }

  /**
   * MutationObserverで動的コンテンツを監視
   *
   * SPA等で動的にコンテンツが追加された場合に、プラグインを再実行
   */
  private startObserving(): void {
    // スロットリング用のタイマー
    let timeoutId: number | null = null;

    this.observer = new MutationObserver((mutations) => {
      // 大量の変更が発生した場合は、スロットリングして処理
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        this.handleMutations(mutations);
        timeoutId = null;
      }, 500); // 500ms後に処理
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('[PageModifier] MutationObserver started');
  }

  /**
   * DOM変更を処理
   */
  private handleMutations(mutations: MutationRecord[]): void {
    // プラグインによって挿入されたノード以外の新しいノードがあるかチェック
    let hasNewNodes = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // 追加されたノードをチェック
        for (const node of mutation.addedNodes) {
          // テキストノードは無視
          if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }

          const element = node as HTMLElement;

          // プラグインが挿入した要素かチェック
          // 1. data-plugin-operation属性を持つ要素
          // 2. data-plugin-operation属性を持つ要素の子孫
          const isPluginElement =
            element.hasAttribute('data-plugin-operation') ||
            element.querySelector('[data-plugin-operation]') !== null;

          if (!isPluginElement) {
            // プラグインによって挿入されたものではない新しいノード
            hasNewNodes = true;
            break;
          }
        }

        if (hasNewNodes) {
          break;
        }
      }
    }

    if (!hasNewNodes) {
      return;
    }

    // アクティブなプラグインを再実行
    // （新しく追加された要素に対してプラグインを適用）
    if (this.activePlugins.size > 0) {
      console.log('[PageModifier] DOM changed, re-executing plugins...');
      const plugins = Array.from(this.activePlugins.values());
      this.executePlugins(plugins).catch((error) => {
        console.error('[PageModifier] Failed to re-execute plugins:', error);
      });
    }
  }

  /**
   * メッセージリスナー登録
   */
  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      console.log('[PageModifier] Received message:', message);

      switch (message.type) {
        case 'EXECUTE_PLUGIN':
          this.handleExecutePlugin(message.plugin)
            .then((result) => sendResponse({ success: true, result }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true; // 非同期応答

        case 'RELOAD_PLUGINS':
          this.handleReloadPlugins()
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
          return true; // 非同期応答

        case 'CLEAR_PLUGINS':
          this.handleClearPlugins();
          sendResponse({ success: true });
          break;

        case 'START_ELEMENT_SELECTION':
          this.handleStartElementSelection();
          sendResponse({ success: true });
          break;

        case 'STOP_ELEMENT_SELECTION':
          this.handleStopElementSelection();
          sendResponse({ success: true });
          break;

        default:
          console.warn('[PageModifier] Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }

      return false;
    });
  }

  /**
   * プラグインを手動実行
   */
  private async handleExecutePlugin(plugin: Plugin): Promise<any> {
    console.log(`[PageModifier] Manually executing plugin: ${plugin.id}`);
    const result = await this.pluginEngine.executePlugin(plugin);

    if (result.success) {
      this.activePlugins.set(plugin.id, plugin);
    }

    return result;
  }

  /**
   * プラグインをリロード
   */
  private async handleReloadPlugins(): Promise<void> {
    // プラグインの変更を反映するため、ページをリロード
    location.reload();
  }

  /**
   * プラグインをクリア
   */
  private handleClearPlugins(): void {
    console.log('[PageModifier] Clearing plugins...');
    this.activePlugins.clear();
    this.pluginEngine.clearExecutedOperations();
  }

  /**
   * 要素選択モードを開始
   */
  private handleStartElementSelection(): void {
    console.log('[PageModifier] Starting element selection mode...');

    this.elementSelector.activate((selector, elementInfo) => {
      console.log('[PageModifier] Element selected:', selector, elementInfo);

      // Side Panelに選択結果を送信
      chrome.runtime.sendMessage({
        type: 'ELEMENT_SELECTED',
        selector,
        ...elementInfo,
      }).catch((error) => {
        console.error('[PageModifier] Failed to send element selection:', error);
      });
    });
  }

  /**
   * 要素選択モードを停止
   */
  private handleStopElementSelection(): void {
    console.log('[PageModifier] Stopping element selection mode...');
    this.elementSelector.deactivate();
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.elementSelector.deactivate();
    this.activePlugins.clear();
    this.initialized = false;
    console.log('[PageModifier] Content script destroyed');
  }
}

// Content Scriptのインスタンスを作成・初期化
const contentScript = new ContentScript();

// ページ読み込み後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript.init().catch((error) => {
      console.error('[PageModifier] Failed to initialize:', error);
    });
  });
} else {
  contentScript.init().catch((error) => {
    console.error('[PageModifier] Failed to initialize:', error);
  });
}

// Background Workerに準備完了を通知
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch((error) => {
  console.log('[PageModifier] Could not send ready message:', error);
});

export {};
