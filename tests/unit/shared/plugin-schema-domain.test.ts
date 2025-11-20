/**
 * Plugin Schema - Domain Conversion Tests
 *
 * シンプルなドメイン表記からMatch Patternへの変換テスト
 */

import { describe, it, expect } from 'vitest';
import { PluginSchema } from '../../../src/shared/plugin-schema';

describe('PluginSchema - Domain Conversion', () => {
  const createTestPlugin = (targetDomains: string[]) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Plugin',
    version: '1.0.0',
    targetDomains,
    enabled: true,
    operations: [
      {
        id: '650e8400-e29b-41d4-a716-446655440001',
        description: 'Test operation',
        type: 'insert' as const,
        params: {
          selector: 'body',
          position: 'afterbegin' as const,
          element: {
            tag: 'div',
          },
        },
      },
    ],
  });

  describe('シンプル表記の保存', () => {
    it('通常のドメイン名はそのまま保存される: example.com', () => {
      const plugin = createTestPlugin(['example.com']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual(['example.com']);
    });

    it('サブドメイン含む表記はそのまま保存される: *.example.com', () => {
      const plugin = createTestPlugin(['*.example.com']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual(['*.example.com']);
    });

    it('全サイト指定はそのまま保存される: *', () => {
      const plugin = createTestPlugin(['*']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual(['*']);
    });

    it('パス指定付きドメインはそのまま保存される: example.com/api/*', () => {
      const plugin = createTestPlugin(['example.com/api/*']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual(['example.com/api/*']);
    });
  });

  describe('既存のMatch Pattern形式', () => {
    it('既存のMatch Pattern形式はそのまま保持する: https://example.com/*', () => {
      const plugin = createTestPlugin(['https://example.com/*']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual(['https://example.com/*']);
    });

    it('既存のMatch Pattern形式（サブドメイン）はそのまま保持する', () => {
      const plugin = createTestPlugin(['https://*.example.com/*']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual(['https://*.example.com/*']);
    });

    it('<all_urls>はそのまま保持する', () => {
      const plugin = createTestPlugin(['<all_urls>']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual(['<all_urls>']);
    });
  });

  describe('複数ドメイン', () => {
    it('複数のシンプル表記をそのまま保存する', () => {
      const plugin = createTestPlugin(['github.com', 'gitlab.com', '*.google.com']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual([
        'github.com',
        'gitlab.com',
        '*.google.com',
      ]);
    });

    it('シンプル表記とMatch Pattern形式の混在をそのまま保存する', () => {
      const plugin = createTestPlugin(['example.com', 'https://test.com/*']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual([
        'example.com',
        'https://test.com/*',
      ]);
    });
  });

  describe('実際のユースケース', () => {
    it('GitHub関連のドメイン指定', () => {
      const plugin = createTestPlugin(['github.com', '*.github.com']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual([
        'github.com',
        '*.github.com',
      ]);
    });

    it('Google系サービスのドメイン指定', () => {
      const plugin = createTestPlugin(['*.google.com', '*.youtube.com']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual([
        '*.google.com',
        '*.youtube.com',
      ]);
    });
  });

  describe('エラーケース', () => {
    it('空文字列はエラーになる', () => {
      const plugin = createTestPlugin(['']);

      expect(() => PluginSchema.parse(plugin)).toThrow();
    });

    it('targetDomainsが空配列の場合はエラーになる', () => {
      const plugin = createTestPlugin([]);

      expect(() => PluginSchema.parse(plugin)).toThrow('少なくとも1つのMatch Patternを指定してください');
    });
  });
});
