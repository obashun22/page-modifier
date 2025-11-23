/**
 * Page Modifier - EventManager Unit Tests
 *
 * イベントマネージャーのユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventManager } from '../../../src/content/event-manager';
import type { Event as PluginEvent } from '../../../src/shared/types';

describe('EventManager', () => {
  let manager: EventManager;
  let container: HTMLElement;

  beforeEach(() => {
    manager = new EventManager();

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
    manager.detachAllEvents();
  });

  describe('attachEvents', () => {
    it('should attach event listeners to an element', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button, events, 'test-plugin', executeAction);

      // イベントがトリガーされることを確認
      button.click();

      expect(executeAction).toHaveBeenCalledTimes(1);
      expect(executeAction).toHaveBeenCalledWith(
        events[0],
        expect.any(Event)
      );
    });

    it('should attach multiple event listeners to an element', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
        {
          type: 'mouseenter',
          code: 'console.log("mouse entered")',
        },
        {
          type: 'mouseleave',
          code: 'console.log("mouse left")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button, events, 'test-plugin', executeAction);

      // 各イベントをトリガー
      button.click();
      button.dispatchEvent(new MouseEvent('mouseenter'));
      button.dispatchEvent(new MouseEvent('mouseleave'));

      expect(executeAction).toHaveBeenCalledTimes(3);
    });

    it('should track listener count', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
        {
          type: 'mouseenter',
          code: 'console.log("mouse entered")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button, events, 'test-plugin', executeAction);

      expect(manager.getListenerCount()).toBe(2);
    });

    it('should attach events for multiple elements', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      const events1: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("button1 clicked")',
        },
      ];

      const events2: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("button2 clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button1, events1, 'test-plugin', executeAction);
      manager.attachEvents(button2, events2, 'test-plugin', executeAction);

      expect(manager.getListenerCount()).toBe(2);

      button1.click();
      button2.click();

      expect(executeAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('detachEvents', () => {
    it('should detach all event listeners from an element', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button, events, 'test-plugin', executeAction);

      // イベントリスナーを削除
      manager.detachEvents(button);

      expect(manager.getListenerCount()).toBe(0);

      // イベントをトリガーしても実行されない
      button.click();
      expect(executeAction).not.toHaveBeenCalled();
    });

    it('should only detach listeners from specified element', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button1, events, 'test-plugin', executeAction);
      manager.attachEvents(button2, events, 'test-plugin', executeAction);

      // button1のリスナーのみ削除
      manager.detachEvents(button1);

      expect(manager.getListenerCount()).toBe(1);

      // button1はイベントが実行されない
      button1.click();
      expect(executeAction).not.toHaveBeenCalled();

      // button2はイベントが実行される
      button2.click();
      expect(executeAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('detachPluginEvents', () => {
    it('should detach all event listeners for a specific plugin', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button1, events, 'plugin-1', executeAction);
      manager.attachEvents(button2, events, 'plugin-2', executeAction);

      expect(manager.getListenerCount()).toBe(2);

      // plugin-1のリスナーのみ削除
      manager.detachPluginEvents('plugin-1');

      expect(manager.getListenerCount()).toBe(1);

      // button1はイベントが実行されない
      button1.click();
      expect(executeAction).not.toHaveBeenCalled();

      // button2はイベントが実行される
      button2.click();
      expect(executeAction).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple elements for the same plugin', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      const button3 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);
      container.appendChild(button3);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button1, events, 'test-plugin', executeAction);
      manager.attachEvents(button2, events, 'test-plugin', executeAction);
      manager.attachEvents(button3, events, 'other-plugin', executeAction);

      expect(manager.getListenerCount()).toBe(3);

      // test-pluginのリスナーを全て削除
      manager.detachPluginEvents('test-plugin');

      expect(manager.getListenerCount()).toBe(1);

      // button1, button2はイベントが実行されない
      button1.click();
      button2.click();
      expect(executeAction).not.toHaveBeenCalled();

      // button3はイベントが実行される
      button3.click();
      expect(executeAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('detachAllEvents', () => {
    it('should detach all event listeners', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button1, events, 'plugin-1', executeAction);
      manager.attachEvents(button2, events, 'plugin-2', executeAction);

      expect(manager.getListenerCount()).toBe(2);

      // 全てのリスナーを削除
      manager.detachAllEvents();

      expect(manager.getListenerCount()).toBe(0);

      // どちらのボタンもイベントが実行されない
      button1.click();
      button2.click();
      expect(executeAction).not.toHaveBeenCalled();
    });

    it('should clear all internal state', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button, events, 'test-plugin', executeAction);

      manager.detachAllEvents();

      // 再度イベントを追加できることを確認
      manager.attachEvents(button, events, 'test-plugin', executeAction);

      expect(manager.getListenerCount()).toBe(1);
    });
  });

  describe('getListenerCount', () => {
    it('should return 0 when no listeners are attached', () => {
      expect(manager.getListenerCount()).toBe(0);
    });

    it('should return correct count with multiple listeners', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
        {
          type: 'mouseenter',
          code: 'console.log("mouse entered")',
        },
        {
          type: 'mouseleave',
          code: 'console.log("mouse left")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button, events, 'test-plugin', executeAction);

      expect(manager.getListenerCount()).toBe(3);
    });

    it('should update count after detaching listeners', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
        {
          type: 'mouseenter',
          code: 'console.log("mouse entered")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button, events, 'test-plugin', executeAction);

      expect(manager.getListenerCount()).toBe(2);

      manager.detachEvents(button);

      expect(manager.getListenerCount()).toBe(0);
    });
  });

  describe('element key generation', () => {
    it('should generate unique keys for different elements', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      container.appendChild(button1);
      container.appendChild(button2);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      manager.attachEvents(button1, events, 'test-plugin', executeAction);
      manager.attachEvents(button2, events, 'test-plugin', executeAction);

      expect(manager.getListenerCount()).toBe(2);

      // 各要素を個別に削除できることを確認
      manager.detachEvents(button1);
      expect(manager.getListenerCount()).toBe(1);

      manager.detachEvents(button2);
      expect(manager.getListenerCount()).toBe(0);
    });

    it('should reuse keys for the same element', () => {
      const button = document.createElement('button');
      container.appendChild(button);

      const events: PluginEvent[] = [
        {
          type: 'click',
          code: 'console.log("clicked")',
        },
      ];

      const executeAction = vi.fn();

      // 同じ要素に2回イベントを追加
      manager.attachEvents(button, events, 'plugin-1', executeAction);
      manager.attachEvents(button, events, 'plugin-2', executeAction);

      expect(manager.getListenerCount()).toBe(2);

      // plugin-1のリスナーを削除
      manager.detachPluginEvents('plugin-1');

      expect(manager.getListenerCount()).toBe(1);
    });
  });
});
