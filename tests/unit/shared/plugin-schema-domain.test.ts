/**
 * Plugin Schema - Domain Pattern Tests
 *
 * ドメインパターンのバリデーションテスト
 */

import { describe, it, expect } from 'vitest';
import { PluginSchema } from '../../../src/shared/plugin-schema';

describe('PluginSchema - Domain Pattern', () => {
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

  describe('ドメインパターンのバリデーション', () => {
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

  describe('不正な形式のエラー', () => {
    it('Match Pattern形式（https://...）はエラーになる', () => {
      const plugin = createTestPlugin(['https://example.com/*']);

      expect(() => PluginSchema.parse(plugin)).toThrow();
    });

    it('<all_urls>形式はエラーになる', () => {
      const plugin = createTestPlugin(['<all_urls>']);

      expect(() => PluginSchema.parse(plugin)).toThrow();
    });

    it('プロトコル付きドメインはエラーになる', () => {
      const plugin = createTestPlugin(['http://example.com']);

      expect(() => PluginSchema.parse(plugin)).toThrow();
    });
  });

  describe('複数ドメイン', () => {
    it('複数のドメインパターンをそのまま保存する', () => {
      const plugin = createTestPlugin(['github.com', 'gitlab.com', '*.google.com']);
      const result = PluginSchema.parse(plugin);

      expect(result.targetDomains).toEqual([
        'github.com',
        'gitlab.com',
        '*.google.com',
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

      expect(() => PluginSchema.parse(plugin)).toThrow('少なくとも1つのドメインパターンを指定してください');
    });
  });
});
