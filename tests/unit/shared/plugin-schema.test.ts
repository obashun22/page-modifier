/**
 * Plugin Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { PluginSchema } from '../../../src/shared/plugin-schema';

describe('PluginSchema', () => {
  describe('Valid plugins', () => {
    it('should validate a plugin with Match Pattern (full format)', () => {
      const validPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['https://example.com/*'],
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'hide',
            selector: '.element',
          },
        ],
      };

      const result = PluginSchema.safeParse(validPlugin);
      expect(result.success).toBe(true);
    });

    it('should validate a plugin with domain name (legacy format)', () => {
      const validPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'hide',
            selector: '.element',
          },
        ],
      };

      const result = PluginSchema.safeParse(validPlugin);
      expect(result.success).toBe(true);
    });

    it('should validate multiple Match Patterns', () => {
      const validPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: [
          'https://github.com/*',
          '*://*.github.com/*',
          'example.com', // 後方互換
        ],
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'hide',
            selector: '.element',
          },
        ],
      };

      const result = PluginSchema.safeParse(validPlugin);
      expect(result.success).toBe(true);
    });

    it('should validate wildcard patterns', () => {
      const validPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['*://*/*'], // すべてのHTTP/HTTPSサイト
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'hide',
            selector: '.element',
          },
        ],
      };

      const result = PluginSchema.safeParse(validPlugin);
      expect(result.success).toBe(true);
    });

    it('should validate a plugin with insert operation', () => {
      const pluginWithInsert = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Insert Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            description: '',
            type: 'insert',
            selector: '.container',
            position: 'beforeend',
            element: {
              tag: 'div',
              textContent: 'Hello World',
            },
          },
        ],
      };

      const result = PluginSchema.safeParse(pluginWithInsert);
      expect(result.success).toBe(true);
    });

    it('should validate recursive element structure', () => {
      const pluginWithChildren = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        name: 'Nested Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174005',
            description: '',
            type: 'insert',
            selector: 'body',
            element: {
              tag: 'div',
              attributes: {
                class: 'parent',
              },
              children: [
                {
                  tag: 'span',
                  textContent: 'Child 1',
                },
                {
                  tag: 'span',
                  textContent: 'Child 2',
                },
              ],
            },
          },
        ],
      };

      const result = PluginSchema.safeParse(pluginWithChildren);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid plugins', () => {
    it('should reject invalid Match Pattern (wildcard in middle)', () => {
      const invalidPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['https://www.*.com/*'], // ワイルドカードが中央にある
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'hide',
            selector: '.element',
          },
        ],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });

    it('should reject invalid Match Pattern (invalid scheme)', () => {
      const invalidPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['ftp://example.com/*'], // 無効なスキーム
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'hide',
            selector: '.element',
          },
        ],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });

    it('should reject empty targetDomains', () => {
      const invalidPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: [],
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'hide',
            selector: '.element',
          },
        ],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });

    it('should reject invalid version format', () => {
      const invalidPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: 'invalid',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });

    it('should reject invalid operation type', () => {
      const invalidPlugin = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            description: '',
            type: 'invalid-type',
            selector: '.container',
          },
        ],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidPlugin = {
        id: 'test-plugin',
        // name missing
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });
  });
});
