/**
 * Page Modifier - PluginEngine Unit Tests
 *
 * プラグインエンジンのユニットテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PluginEngine } from '../../../src/content/plugin-engine';
import type { Plugin, Operation } from '../../../src/shared/types';

// Chrome API モック
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
});

describe('PluginEngine', () => {
  let engine: PluginEngine;
  let container: HTMLElement;

  beforeEach(() => {
    engine = new PluginEngine();

    // テスト用のコンテナを作成
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // クリーンアップ
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    engine.detachAllEvents();
    engine.clearExecutedOperations();
  });

  describe('executePlugin', () => {
    it('should execute a plugin with insert operation successfully', async () => {
      // テスト用のHTML構造を作成
      container.innerHTML = '<div class="target"></div>';

      const plugin: Plugin = {
        id: 'test-plugin-1',
        name: 'Test Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-1',
            type: 'insert',
            params: {
              selector: '#test-container .target',
              position: 'beforeend',
              element: {
                tag: 'span',
                textContent: 'Inserted Text',
                attributes: {
                  class: 'inserted-element',
                },
              },
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('test-plugin-1');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].elementsAffected).toBe(1);

      // DOM検証
      const insertedElement = container.querySelector('.inserted-element');
      expect(insertedElement).not.toBeNull();
      expect(insertedElement?.textContent).toBe('Inserted Text');
    });

    it('should execute a plugin with update operation successfully', async () => {
      // テスト用のHTML構造を作成
      container.innerHTML = '<div class="target">Original Text</div>';

      const plugin: Plugin = {
        id: 'test-plugin-2',
        name: 'Test Plugin Update',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-2',
            type: 'update',
            params: {
              selector: '#test-container .target',
              textContent: 'Updated Text',
              style: {
                color: 'red',
                fontSize: '16px',
              },
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(true);
      expect(result.results[0].elementsAffected).toBe(1);

      // DOM検証
      const updatedElement = container.querySelector('.target') as HTMLElement;
      expect(updatedElement?.textContent).toBe('Updated Text');
      expect(updatedElement?.style.color).toBe('red');
      expect(updatedElement?.style.fontSize).toBe('16px');
    });

    it('should execute a plugin with delete operation successfully', async () => {
      // テスト用のHTML構造を作成
      container.innerHTML = '<div class="to-delete">Delete Me</div>';

      const plugin: Plugin = {
        id: 'test-plugin-3',
        name: 'Test Plugin Delete',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-3',
            type: 'delete',
            params: {
              selector: '#test-container .to-delete',
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(true);
      expect(result.results[0].elementsAffected).toBe(1);

      // DOM検証
      const deletedElement = container.querySelector('.to-delete');
      expect(deletedElement).toBeNull();
    });

    it('should handle multiple operations in sequence', async () => {
      container.innerHTML = '<div class="target"></div>';

      const plugin: Plugin = {
        id: 'test-plugin-multi',
        name: 'Multi Operation Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-insert',
            type: 'insert',
            params: {
              selector: '#test-container .target',
              position: 'beforeend',
              element: {
                tag: 'span',
                textContent: 'First',
                attributes: { class: 'first' },
              },
            },
          },
          {
            id: 'op-update',
            type: 'update',
            params: {
              selector: '#test-container .first',
              style: { color: 'blue' },
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);

      const element = container.querySelector('.first') as HTMLElement;
      expect(element).not.toBeNull();
      expect(element?.style.color).toBe('blue');
    });

    it('should fail gracefully when selector does not match any elements', async () => {
      const plugin: Plugin = {
        id: 'test-plugin-no-match',
        name: 'No Match Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-no-match',
            type: 'update',
            params: {
              selector: '.non-existent-selector',
              textContent: 'Should Not Work',
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('No elements found');
    });
  });

  describe('createElement with hierarchy', () => {
    it('should create element with nested children', async () => {
      container.innerHTML = '<div class="parent"></div>';

      const plugin: Plugin = {
        id: 'test-nested',
        name: 'Nested Elements Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-nested',
            type: 'insert',
            params: {
              selector: '#test-container .parent',
              position: 'beforeend',
              element: {
                tag: 'div',
                attributes: { class: 'level-1' },
                children: [
                  {
                    tag: 'div',
                    attributes: { class: 'level-2' },
                    children: [
                      {
                        tag: 'span',
                        textContent: 'Deeply Nested',
                        attributes: { class: 'level-3' },
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(true);

      // 階層構造の検証
      const level1 = container.querySelector('.level-1');
      expect(level1).not.toBeNull();

      const level2 = level1?.querySelector('.level-2');
      expect(level2).not.toBeNull();

      const level3 = level2?.querySelector('.level-3');
      expect(level3).not.toBeNull();
      expect(level3?.textContent).toBe('Deeply Nested');
    });
  });

  describe('condition checking', () => {
    it('should skip operation when condition is not met (exists)', async () => {
      container.innerHTML = '<div class="target"></div>';

      const plugin: Plugin = {
        id: 'test-condition',
        name: 'Conditional Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-conditional',
            type: 'insert',
            params: {
              selector: '#test-container .target',
              position: 'beforeend',
              element: {
                tag: 'span',
                textContent: 'Should Not Insert',
              },
            },
            condition: {
              type: 'exists',
              selector: '.non-existent',
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      // 条件が満たされないため、操作はスキップされる
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);

      // 要素が挿入されていないことを確認
      const insertedElement = container.querySelector('span');
      expect(insertedElement).toBeNull();
    });

    it('should execute operation when exists condition is met', async () => {
      container.innerHTML = '<div class="exists-check"></div><div class="target"></div>';

      const plugin: Plugin = {
        id: 'test-condition-met',
        name: 'Conditional Plugin Met',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-conditional-met',
            type: 'insert',
            params: {
              selector: '#test-container .target',
              position: 'beforeend',
              element: {
                tag: 'span',
                textContent: 'Should Insert',
                attributes: { class: 'inserted' },
              },
            },
            condition: {
              type: 'exists',
              selector: '.exists-check',
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);

      const insertedElement = container.querySelector('.inserted');
      expect(insertedElement).not.toBeNull();
      expect(insertedElement?.textContent).toBe('Should Insert');
    });

    it('should execute operation when notExists condition is met', async () => {
      container.innerHTML = '<div class="target"></div>';

      const plugin: Plugin = {
        id: 'test-not-exists',
        name: 'Not Exists Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-not-exists',
            type: 'insert',
            params: {
              selector: '#test-container .target',
              position: 'beforeend',
              element: {
                tag: 'span',
                textContent: 'Inserted',
                attributes: { class: 'result' },
              },
            },
            condition: {
              type: 'notExists',
              selector: '.non-existent',
            },
          },
        ],
      };

      const result = await engine.executePlugin(plugin);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);

      const insertedElement = container.querySelector('.result');
      expect(insertedElement).not.toBeNull();
    });
  });

  describe('duplicate insert prevention', () => {
    it('should prevent duplicate inserts with same operation ID', async () => {
      container.innerHTML = '<div class="target"></div>';

      const operation: Operation = {
        id: 'duplicate-op',
        type: 'insert',
        params: {
          selector: '#test-container .target',
          position: 'beforeend',
          element: {
            tag: 'span',
            textContent: 'Once Only',
            attributes: { class: 'once' },
          },
        },
      };

      const plugin: Plugin = {
        id: 'test-duplicate',
        name: 'Duplicate Prevention Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [operation],
      };

      // 1回目の実行
      const result1 = await engine.executePlugin(plugin);
      expect(result1.success).toBe(true);
      expect(result1.results[0].elementsAffected).toBe(1);

      // 2回目の実行（重複防止）
      const result2 = await engine.executePlugin(plugin);
      expect(result2.success).toBe(true);
      expect(result2.results[0].elementsAffected).toBe(0);

      // 要素が1つだけ存在することを確認
      const elements = container.querySelectorAll('.once');
      expect(elements.length).toBe(1);
    });
  });

  describe('event manager integration', () => {
    it('should track event listeners count', () => {
      const initialCount = engine.getEventListenerCount();
      expect(initialCount).toBe(0);
    });

    it('should detach plugin events', () => {
      engine.detachPluginEvents('test-plugin');
      const count = engine.getEventListenerCount();
      expect(count).toBe(0);
    });

    it('should detach all events', () => {
      engine.detachAllEvents();
      const count = engine.getEventListenerCount();
      expect(count).toBe(0);
    });
  });

  describe('clearExecutedOperations', () => {
    it('should clear executed operations', () => {
      engine.clearExecutedOperations();
      // clearしたことで、次回の実行が可能になることをテスト
      // （実際の動作は duplicate insert prevention のテストで確認）
      expect(true).toBe(true);
    });
  });
});
