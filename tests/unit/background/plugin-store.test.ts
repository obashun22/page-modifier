/**
 * Page Modifier - PluginStorage Unit Tests
 *
 * プラグインストレージマネージャーのユニットテスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginStorage } from '../../../src/background/plugin-store';
import { createTestPlugin } from '../../fixtures/test-plugin';
import type { PluginData } from '../../../src/shared/storage-types';
describe('PluginStorage', () => {
  let storage: PluginStorage;
  let mockStorageData: Record<string, any>;
  beforeEach(() => {
    storage = new PluginStorage();
    mockStorageData = {};
    // Chrome Storage APIのモック
    vi.spyOn(chrome.storage.local, 'get').mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorageData[keys] });
      } else if (Array.isArray(keys)) {
        const result: Record<string, any> = {};
        keys.forEach((key) => {
          result[key] = mockStorageData[key];
        });
        return Promise.resolve(result);
      } else if (keys && typeof keys === 'object') {
        const result: Record<string, any> = {};
        Object.keys(keys).forEach((key) => {
          result[key] = mockStorageData[key] !== undefined ? mockStorageData[key] : keys[key];
        });
        return Promise.resolve(result);
      }
      return Promise.resolve(mockStorageData);
    });
    vi.spyOn(chrome.storage.local, 'set').mockImplementation((items) => {
      Object.assign(mockStorageData, items);
      return Promise.resolve();
    });
    vi.spyOn(chrome.storage.local, 'clear').mockImplementation(() => {
      mockStorageData = {};
      return Promise.resolve();
    });
  });
  describe('savePlugin', () => {
    it('should save a new plugin', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      const saved = await storage.getPlugin('550e8400-e29b-41d4-a716-446655440001');
      expect(saved).not.toBeNull();
      expect(saved?.plugin.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(saved?.plugin.name).toBe('Test Plugin');
      expect(saved?.enabled).toBe(true);
    });
    it('should update an existing plugin', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      const updatedPlugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Updated Plugin',
        version: '1.1.0',
      });
      await storage.savePlugin(updatedPlugin);
      const saved = await storage.getPlugin('550e8400-e29b-41d4-a716-446655440002');
      expect(saved?.plugin.name).toBe('Updated Plugin');
      expect(saved?.plugin.version).toBe('1.1.0');
    });
    it('should throw validation error for invalid plugin', async () => {
      const invalidPlugin = {
        id: 'test',
        // 必須フィールドが欠けている
      } as any;
      await expect(storage.savePlugin(invalidPlugin)).rejects.toThrow();
    });
    it('should add new plugin at the beginning of the array', async () => {
      const plugin1 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Plugin 1',
      });
      const plugin2 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Plugin 2',
      });
      await storage.savePlugin(plugin1);
      await storage.savePlugin(plugin2);
      const all = await storage.getAllPlugins();
      expect(all[0].plugin.id).toBe('550e8400-e29b-41d4-a716-446655440004'); // 最新が先頭
      expect(all[1].plugin.id).toBe('550e8400-e29b-41d4-a716-446655440003');
    });
  });
  describe('getPlugin', () => {
    it('should return plugin by ID', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      const retrieved = await storage.getPlugin('550e8400-e29b-41d4-a716-446655440005');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.plugin.id).toBe('550e8400-e29b-41d4-a716-446655440005');
    });
    it('should return null for non-existent plugin', async () => {
      const retrieved = await storage.getPlugin('non-existent');
      expect(retrieved).toBeNull();
    });
  });
  describe('getAllPlugins', () => {
    it('should return all plugins', async () => {
      const plugin1 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440006',
        name: 'Plugin 1',
      });
      const plugin2 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440007',
        name: 'Plugin 2',
        targetDomains: ['test.com'],
      });
      await storage.savePlugin(plugin1);
      await storage.savePlugin(plugin2);
      const all = await storage.getAllPlugins();
      expect(all).toHaveLength(2);
    });
    it('should return empty array when no plugins exist', async () => {
      const all = await storage.getAllPlugins();
      expect(all).toEqual([]);
    });
  });
  describe('getEnabledPlugins', () => {
    it('should return only enabled plugins', async () => {
      const plugin1 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440008',
        name: 'Plugin 1',
      });
      const plugin2 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440009',
        name: 'Plugin 2',
        targetDomains: ['test.com'],
      });
      await storage.savePlugin(plugin1);
      await storage.savePlugin(plugin2);
      await storage.togglePlugin('550e8400-e29b-41d4-a716-446655440008', false);
      const enabled = await storage.getEnabledPlugins();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].plugin.id).toBe('550e8400-e29b-41d4-a716-446655440009');
    });
  });
  describe('getPluginsForUrl', () => {
    it('should return plugins applicable to URL', async () => {
      const plugin1 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-44665544000a',
        name: 'Plugin 1',
        targetDomains: ['example.com'],
      });
      const plugin2 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-44665544000b',
        name: 'Plugin 2',
        targetDomains: ['test.com'],
      });
      await storage.savePlugin(plugin1);
      await storage.savePlugin(plugin2);
      const plugins = await storage.getPluginsForUrl('https://example.com/page');
      expect(plugins).toHaveLength(1);
      expect(plugins[0].plugin.id).toBe('550e8400-e29b-41d4-a716-44665544000a');
    });
  });
  describe('deletePlugin', () => {
    it('should delete a plugin', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-44665544000c',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      await storage.deletePlugin('550e8400-e29b-41d4-a716-44665544000c');
      const retrieved = await storage.getPlugin('550e8400-e29b-41d4-a716-44665544000c');
      expect(retrieved).toBeNull();
    });
    it('should not throw error when deleting non-existent plugin', async () => {
      await expect(storage.deletePlugin('non-existent')).resolves.not.toThrow();
    });
  });
  describe('togglePlugin', () => {
    it('should toggle plugin enabled status', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-44665544000d',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      await storage.togglePlugin('550e8400-e29b-41d4-a716-44665544000d', false);
      let retrieved = await storage.getPlugin('550e8400-e29b-41d4-a716-44665544000d');
      expect(retrieved?.enabled).toBe(false);
      await storage.togglePlugin('550e8400-e29b-41d4-a716-44665544000d', true);
      retrieved = await storage.getPlugin('550e8400-e29b-41d4-a716-44665544000d');
      expect(retrieved?.enabled).toBe(true);
    });
    it('should throw error when toggling non-existent plugin', async () => {
      await expect(storage.togglePlugin('non-existent', true)).rejects.toThrow();
    });
  });
  describe('importPlugin', () => {
    it('should import plugin from JSON string', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-44665544000e',
        name: 'Test Plugin',
      });
      const json = JSON.stringify(plugin);
      const imported = await storage.importPlugin(json);
      expect(imported.id).toBe('550e8400-e29b-41d4-a716-44665544000e');
      expect(imported.name).toBe('Test Plugin');
      const retrieved = await storage.getPlugin('550e8400-e29b-41d4-a716-44665544000e');
      expect(retrieved).not.toBeNull();
    });
    it('should throw error for invalid JSON', async () => {
      await expect(storage.importPlugin('invalid json')).rejects.toThrow();
    });
    it('should throw error for invalid plugin data', async () => {
      const invalidData = { id: 'test' };
      const json = JSON.stringify(invalidData);
      await expect(storage.importPlugin(json)).rejects.toThrow();
    });
  });
  describe('exportPlugin', () => {
    it('should export plugin to JSON string', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-44665544000f',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      const json = await storage.exportPlugin('550e8400-e29b-41d4-a716-44665544000f');
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('550e8400-e29b-41d4-a716-44665544000f');
      expect(parsed.name).toBe('Test Plugin');
    });
    it('should throw error when exporting non-existent plugin', async () => {
      await expect(storage.exportPlugin('non-existent')).rejects.toThrow();
    });
  });
  describe('exportAllPlugins', () => {
    it('should export all plugins to JSON string', async () => {
      const plugin1 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Plugin 1',
      });
      const plugin2 = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Plugin 2',
        targetDomains: ['test.com'],
      });
      await storage.savePlugin(plugin1);
      await storage.savePlugin(plugin2);
      const json = await storage.exportAllPlugins();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });
  });
  describe('recordPluginUsage', () => {
    it('should increment usage count', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      await storage.recordPluginUsage('550e8400-e29b-41d4-a716-446655440012');
      const retrieved = await storage.getPlugin('550e8400-e29b-41d4-a716-446655440012');
      expect(retrieved?.usageCount).toBe(1);
      expect(retrieved?.lastUsedAt).toBeDefined();
    });
    it('should not throw error when recording usage for non-existent plugin', async () => {
      await expect(storage.recordPluginUsage('non-existent')).resolves.not.toThrow();
    });
  });
  describe('getSettings', () => {
    it('should return default settings when none exist', async () => {
      const settings = await storage.getSettings();
      expect(settings).toBeDefined();
      expect(settings.pluginsEnabled).toBeDefined();
    });
    it('should return saved settings', async () => {
      await storage.updateSettings({ apiKey: 'test-key' });
      const settings = await storage.getSettings();
      expect(settings.apiKey).toBe('test-key');
    });
  });
  describe('updateSettings', () => {
    it('should update settings', async () => {
      await storage.updateSettings({ apiKey: 'new-key', pluginsEnabled: false });
      const settings = await storage.getSettings();
      expect(settings.apiKey).toBe('new-key');
      expect(settings.pluginsEnabled).toBe(false);
    });
    it('should merge with existing settings', async () => {
      await storage.updateSettings({ apiKey: 'key-1' });
      await storage.updateSettings({ pluginsEnabled: false });
      const settings = await storage.getSettings();
      expect(settings.apiKey).toBe('key-1');
      expect(settings.pluginsEnabled).toBe(false);
    });
  });
  describe('clear', () => {
    it('should clear all storage', async () => {
      const plugin = createTestPlugin({
        id: '550e8400-e29b-41d4-a716-446655440013',
        name: 'Test Plugin',
      });
      await storage.savePlugin(plugin);
      await storage.updateSettings({ apiKey: 'test-key' });
      await storage.clear();
      const plugins = await storage.getAllPlugins();
      expect(plugins).toEqual([]);
      const settings = await storage.getSettings();
      // デフォルト設定が返される
      expect(settings).toBeDefined();
    });
  });
  describe('migration from old storage format', () => {
    it('should migrate from Record format to Array format', async () => {
      // 旧形式のデータを直接設定
      const oldFormatData: Record<string, PluginData> = {
        'plugin-1': {
          plugin: createTestPlugin({
            id: '550e8400-e29b-41d4-a716-446655440014',
            name: 'Plugin 1',
          }),
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0,
        },
      };
      mockStorageData['plugins'] = oldFormatData;
      const plugins = await storage.getAllPlugins();
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins).toHaveLength(1);
      expect(plugins[0].plugin.id).toBe('550e8400-e29b-41d4-a716-446655440014');
    });
  });
});
