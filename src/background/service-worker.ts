/**
 * Page Modifier - Background Service Worker
 *
 * バックグラウンドタスク、ストレージ管理、メッセージパッシングを担当
 */

import { pluginStorage } from './plugin-store';
import { DEFAULT_SETTINGS } from '../shared/storage-types';
import type { Settings } from '../shared/storage-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('[ServiceWorker]');

logger.info('Service Worker loaded');

// Action (toolbar icon) click event - Open side panel
chrome.action.onClicked.addListener(async (tab) => {
  logger.info('Action clicked, opening side panel');

  if (tab.id) {
    try {
      // Chrome 114以降でサポート
      await chrome.sidePanel.open({ tabId: tab.id });
      logger.info('Side panel opened');
    } catch (error) {
      logger.error('Failed to open side panel:', error);
    }
  }
});

// Install event
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Extension installed', details);

  // Initialize default settings
  pluginStorage.updateSettings(DEFAULT_SETTINGS).catch((error) => {
    logger.error('Failed to initialize settings:', error);
  });

  // MAIN World Scriptを登録（カスタムJS実行用）
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: 'page-modifier-main-world',
        matches: ['<all_urls>'],
        js: ['assets/main-world-script.js'],
        world: 'MAIN',
        runAt: 'document_start',
      },
    ]);
    logger.info('MAIN World Script registered');
  } catch (error) {
    logger.error('Failed to register MAIN World Script:', error);
  }

  // サンプルプラグインの読み込み（開発用）
  if (details.reason === 'install') {
    logger.info('First install - loading sample plugins');
    // TODO: サンプルプラグインの自動読み込み（オプション）
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Message received:', message.type);

  // メッセージタイプに応じた処理
  switch (message.type) {
    case 'CONTENT_SCRIPT_READY':
      handleContentScriptReady(sender);
      sendResponse({ success: true });
      break;

    case 'GET_PLUGINS_FOR_DOMAIN':
      handleGetPluginsForDomain(message.domain)
        .then((plugins) => sendResponse({ success: true, plugins }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'GET_PLUGINS_FOR_URL':
      handleGetPluginsForUrl(message.url)
        .then((plugins) => sendResponse({ success: true, plugins }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'RECORD_PLUGIN_USAGE':
      handleRecordPluginUsage(message.pluginId)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'SAVE_PLUGIN':
      handleSavePlugin(message.plugin)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'GET_ALL_PLUGINS':
      handleGetAllPlugins()
        .then((plugins) => sendResponse({ success: true, plugins }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'DELETE_PLUGIN':
      handleDeletePlugin(message.pluginId)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'TOGGLE_PLUGIN':
      handleTogglePlugin(message.pluginId, message.enabled)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'GET_SETTINGS':
      handleGetSettings()
        .then((settings) => sendResponse({ success: true, settings }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'UPDATE_SETTINGS':
      handleUpdateSettings(message.settings)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'IMPORT_PLUGIN':
      handleImportPlugin(message.json)
        .then((plugin) => sendResponse({ success: true, plugin }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    case 'EXPORT_PLUGIN':
      handleExportPlugin(message.pluginId)
        .then((json) => sendResponse({ success: true, json }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同期応答

    default:
      logger.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return false;
});

// ==================== Message Handlers ====================

/**
 * Content Script準備完了通知
 */
function handleContentScriptReady(sender: chrome.runtime.MessageSender): void {
  logger.debug('Content script ready:', sender.tab?.url);
}

/**
 * ドメインに対応するプラグインを取得
 */
async function handleGetPluginsForDomain(domain: string): Promise<any[]> {
  const pluginDataList = await pluginStorage.getPluginsForDomain(domain);
  return pluginDataList.map((data) => data.plugin);
}

/**
 * URLに対応するプラグインを取得
 */
async function handleGetPluginsForUrl(url: string): Promise<any[]> {
  const pluginDataList = await pluginStorage.getPluginsForUrl(url);
  return pluginDataList.map((data) => data.plugin);
}

/**
 * プラグイン使用記録
 */
async function handleRecordPluginUsage(pluginId: string): Promise<void> {
  await pluginStorage.recordPluginUsage(pluginId);
}

/**
 * プラグインを保存
 */
async function handleSavePlugin(plugin: any): Promise<void> {
  await pluginStorage.savePlugin(plugin);

  // 全てのタブにリロード通知
  notifyAllTabs('RELOAD_PLUGINS');
}

/**
 * 全プラグインを取得
 */
async function handleGetAllPlugins(): Promise<any[]> {
  const pluginDataList = await pluginStorage.getAllPlugins();
  return pluginDataList;
}

/**
 * プラグインを削除
 */
async function handleDeletePlugin(pluginId: string): Promise<void> {
  await pluginStorage.deletePlugin(pluginId);

  // 全てのタブにリロード通知
  notifyAllTabs('RELOAD_PLUGINS');
}

/**
 * プラグインの有効/無効を切り替え
 */
async function handleTogglePlugin(pluginId: string, enabled: boolean): Promise<void> {
  await pluginStorage.togglePlugin(pluginId, enabled);

  // 全てのタブにリロード通知
  notifyAllTabs('RELOAD_PLUGINS');
}

/**
 * 設定を取得
 */
async function handleGetSettings(): Promise<any> {
  return await pluginStorage.getSettings();
}

/**
 * 設定を更新
 */
async function handleUpdateSettings(newSettings: Settings): Promise<void> {
  logger.debug('handleUpdateSettings called with:', newSettings);

  // 現在の設定を取得
  const currentSettings = await pluginStorage.getSettings();
  logger.debug('Current settings:', currentSettings);

  // 設定を更新
  await pluginStorage.updateSettings(newSettings);
  logger.info('Settings updated');
}

/**
 * プラグインをインポート
 */
async function handleImportPlugin(json: string): Promise<any> {
  const plugin = await pluginStorage.importPlugin(json);

  // 全てのタブにリロード通知
  notifyAllTabs('RELOAD_PLUGINS');

  return plugin;
}

/**
 * プラグインをエクスポート
 */
async function handleExportPlugin(pluginId: string): Promise<string> {
  return await pluginStorage.exportPlugin(pluginId);
}

/**
 * 全てのタブに通知
 */
function notifyAllTabs(messageType: string): void {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: messageType }).catch(() => {
          // エラーは無視（Content Scriptが読み込まれていない可能性）
        });
      }
    });
  });
}

export {};
