/**
 * Page Modifier - Plugin Storage Manager
 *
 * chrome.storage APIを使用したプラグイン管理
 */

import { validatePlugin } from '../shared/validator';
import { isPluginApplicable } from '../utils/plugin-utils';
import type { Plugin } from '../shared/types';
import type {
  PluginData,
  Settings,
  DomainMappings,
} from '../shared/storage-types';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/storage-types';

/**
 * プラグインストレージマネージャー
 *
 * プラグインの保存・読み込み・管理を行う
 */
export class PluginStorage {
  /**
   * プラグインを保存
   *
   * @param plugin - 保存するプラグイン
   * @throws バリデーションエラー
   */
  async savePlugin(plugin: Plugin): Promise<void> {
    // バリデーション
    const validation = validatePlugin(plugin);
    if (!validation.success) {
      throw new Error(`Plugin validation failed: ${JSON.stringify(validation.errors)}`);
    }

    const now = Date.now();
    const plugins = await this.getPluginsMap();

    // 既存プラグインがあれば更新日時のみ更新
    const existingData = plugins[plugin.id];
    const pluginData: PluginData = existingData
      ? {
          ...existingData,
          plugin,
          updatedAt: now,
        }
      : {
          plugin,
          enabled: true,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        };

    plugins[plugin.id] = pluginData;

    await chrome.storage.local.set({
      [STORAGE_KEYS.PLUGINS]: plugins,
    });

    // ドメインマッピングを更新
    await this.updateDomainMappings(plugin.id, plugin.targetDomains);
  }

  /**
   * プラグインを取得（ID指定）
   */
  async getPlugin(id: string): Promise<PluginData | null> {
    const plugins = await this.getPluginsMap();
    return plugins[id] || null;
  }

  /**
   * 全プラグインを取得
   */
  async getAllPlugins(): Promise<PluginData[]> {
    const plugins = await this.getPluginsMap();
    return Object.values(plugins);
  }

  /**
   * 有効なプラグインのみ取得
   */
  async getEnabledPlugins(): Promise<PluginData[]> {
    const all = await this.getAllPlugins();
    return all.filter((data) => data.enabled);
  }

  /**
   * ドメインに適用されるプラグインを取得
   *
   * @param domain - 対象ドメイン
   * @returns 適用可能な有効プラグイン
   */
  async getPluginsForDomain(domain: string): Promise<PluginData[]> {
    const enabled = await this.getEnabledPlugins();
    return enabled
      .filter((data) => isPluginApplicable(data.plugin, domain))
      .sort((a, b) => b.plugin.priority - a.plugin.priority);
  }

  /**
   * プラグインを更新
   */
  async updatePlugin(id: string, updates: Partial<Plugin>): Promise<void> {
    const pluginData = await this.getPlugin(id);
    if (!pluginData) {
      throw new Error(`Plugin not found: ${id}`);
    }

    const updatedPlugin = {
      ...pluginData.plugin,
      ...updates,
    };

    await this.savePlugin(updatedPlugin);
  }

  /**
   * プラグインを削除
   */
  async deletePlugin(id: string): Promise<void> {
    const plugins = await this.getPluginsMap();
    delete plugins[id];

    await chrome.storage.local.set({
      [STORAGE_KEYS.PLUGINS]: plugins,
    });

    // ドメインマッピングから削除
    const mappings = await this.getDomainMappings();
    Object.keys(mappings).forEach((domain) => {
      mappings[domain] = mappings[domain].filter((pluginId) => pluginId !== id);
      if (mappings[domain].length === 0) {
        delete mappings[domain];
      }
    });

    await chrome.storage.local.set({
      [STORAGE_KEYS.DOMAIN_MAPPINGS]: mappings,
    });
  }

  /**
   * プラグインの有効/無効を切り替え
   */
  async togglePlugin(id: string, enabled: boolean): Promise<void> {
    const pluginData = await this.getPlugin(id);
    if (!pluginData) {
      throw new Error(`Plugin not found: ${id}`);
    }

    pluginData.enabled = enabled;
    pluginData.updatedAt = Date.now();

    const plugins = await this.getPluginsMap();
    plugins[id] = pluginData;

    await chrome.storage.local.set({
      [STORAGE_KEYS.PLUGINS]: plugins,
    });
  }

  /**
   * プラグインの使用記録を更新
   */
  async recordPluginUsage(id: string): Promise<void> {
    const pluginData = await this.getPlugin(id);
    if (!pluginData) return;

    pluginData.usageCount++;
    pluginData.lastUsedAt = Date.now();

    const plugins = await this.getPluginsMap();
    plugins[id] = pluginData;

    await chrome.storage.local.set({
      [STORAGE_KEYS.PLUGINS]: plugins,
    });
  }

  /**
   * プラグインをインポート
   *
   * @param json - プラグインJSON文字列
   * @returns インポートされたプラグイン
   */
  async importPlugin(json: string): Promise<Plugin> {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    const validation = validatePlugin(data);
    if (!validation.success) {
      throw new Error(`Invalid plugin: ${JSON.stringify(validation.errors)}`);
    }

    await this.savePlugin(validation.data!);
    return validation.data!;
  }

  /**
   * プラグインをエクスポート
   *
   * @param id - プラグインID
   * @returns プラグインJSON文字列
   */
  async exportPlugin(id: string): Promise<string> {
    const pluginData = await this.getPlugin(id);
    if (!pluginData) {
      throw new Error(`Plugin not found: ${id}`);
    }

    return JSON.stringify(pluginData.plugin, null, 2);
  }

  /**
   * 全プラグインをエクスポート
   */
  async exportAllPlugins(): Promise<string> {
    const all = await this.getAllPlugins();
    const plugins = all.map((data) => data.plugin);
    return JSON.stringify(plugins, null, 2);
  }

  /**
   * 設定を取得
   */
  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  /**
   * 設定を更新
   */
  async updateSettings(updates: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };

    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: updated,
    });
  }

  /**
   * ドメインマッピングを更新
   */
  async updateDomainMappings(pluginId: string, domains: string[]): Promise<void> {
    const mappings = await this.getDomainMappings();

    // 既存のマッピングから削除
    Object.keys(mappings).forEach((domain) => {
      mappings[domain] = mappings[domain].filter((id) => id !== pluginId);
      if (mappings[domain].length === 0) {
        delete mappings[domain];
      }
    });

    // 新しいマッピングを追加
    domains.forEach((domain) => {
      if (!mappings[domain]) {
        mappings[domain] = [];
      }
      if (!mappings[domain].includes(pluginId)) {
        mappings[domain].push(pluginId);
      }
    });

    await chrome.storage.local.set({
      [STORAGE_KEYS.DOMAIN_MAPPINGS]: mappings,
    });
  }

  /**
   * ストレージをクリア
   */
  async clear(): Promise<void> {
    await chrome.storage.local.clear();
  }

  // ==================== Private Methods ====================

  /**
   * プラグインマップを取得
   */
  private async getPluginsMap(): Promise<Record<string, PluginData>> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PLUGINS);
    return result[STORAGE_KEYS.PLUGINS] || {};
  }

  /**
   * ドメインマッピングを取得
   */
  private async getDomainMappings(): Promise<DomainMappings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.DOMAIN_MAPPINGS);
    return result[STORAGE_KEYS.DOMAIN_MAPPINGS] || {};
  }
}

// シングルトンインスタンス
export const pluginStorage = new PluginStorage();
