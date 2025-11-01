/**
 * Plugin Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { PluginSchema } from '../../../src/shared/plugin-schema';

describe('PluginSchema', () => {
  describe('Valid plugins', () => {
    it('should validate a minimal valid plugin', () => {
      const validPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        autoApply: true,
        priority: 500,
        operations: [
          {
            id: 'op-1',
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
        id: 'insert-plugin',
        name: 'Insert Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        autoApply: true,
        priority: 500,
        operations: [
          {
            id: 'op-1',
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
        id: 'nested-plugin',
        name: 'Nested Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        autoApply: true,
        priority: 500,
        operations: [
          {
            id: 'op-1',
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
    it('should reject invalid version format', () => {
      const invalidPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: 'invalid',
        targetDomains: ['example.com'],
        autoApply: true,
        priority: 500,
        operations: [],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });

    it('should reject invalid operation type', () => {
      const invalidPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        autoApply: true,
        priority: 500,
        operations: [
          {
            id: 'op-1',
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
        autoApply: true,
        priority: 500,
        operations: [],
      };

      const result = PluginSchema.safeParse(invalidPlugin);
      expect(result.success).toBe(false);
    });
  });
});
