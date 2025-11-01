/**
 * Page Modifier - Background Service Worker
 *
 * バックグラウンドタスク、ストレージ管理、メッセージパッシングを担当
 */

import { pluginStorage } from './plugin-store';
import { DEFAULT_SETTINGS } from '../shared/storage-types';

console.log('[PageModifier] Service Worker loaded');

// Action (toolbar icon) click event - Open side panel
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[PageModifier] Action clicked, opening side panel');

  if (tab.id) {
    try {
      // Chrome 114以降でサポート
      await chrome.sidePanel.open({ tabId: tab.id });
      console.log('[PageModifier] Side panel opened');
    } catch (error) {
      console.error('[PageModifier] Failed to open side panel:', error);
    }
  }
});

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[PageModifier] Extension installed', details);

  // Initialize default settings
  pluginStorage.updateSettings(DEFAULT_SETTINGS).catch((error) => {
    console.error('[PageModifier] Failed to initialize settings:', error);
  });

  // サンプルプラグインの読み込み（開発用）
  if (details.reason === 'install') {
    console.log('[PageModifier] First install - loading sample plugins');
    // TODO: サンプルプラグインの自動読み込み（オプション）
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[PageModifier] Message received:', message.type);

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
      console.warn('[PageModifier] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return false;
});

// ==================== Message Handlers ====================

/**
 * Content Script準備完了通知
 */
function handleContentScriptReady(sender: chrome.runtime.MessageSender): void {
  console.log('[PageModifier] Content script ready:', sender.tab?.url);
}

/**
 * ドメインに対応するプラグインを取得
 */
async function handleGetPluginsForDomain(domain: string): Promise<any[]> {
  const pluginDataList = await pluginStorage.getPluginsForDomain(domain);
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
async function handleUpdateSettings(settings: any): Promise<void> {
  await pluginStorage.updateSettings(settings);
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
