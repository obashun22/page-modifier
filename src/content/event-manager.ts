/**
 * Page Modifier - Event Manager
 *
 * イベントリスナーの登録・追跡・削除を管理
 */

import type { Event as PluginEvent } from '../shared/types';

/**
 * イベントリスナーエントリー
 */
interface EventListenerEntry {
  element: HTMLElement;
  type: string;
  handler: EventListener;
  pluginId: string;
}

/**
 * イベントマネージャー
 *
 * プラグインのイベントリスナーを追跡し、適切なクリーンアップを提供
 */
export class EventManager {
  private listeners: Map<string, EventListenerEntry[]> = new Map();
  private elementIdCounter = 0;
  private elementKeys: WeakMap<HTMLElement, string> = new WeakMap();

  /**
   * イベントリスナーを登録
   */
  attachEvents(
    element: HTMLElement,
    events: PluginEvent[],
    pluginId: string,
    executeAction: (event: PluginEvent, eventObject: Event) => void
  ): void {
    const elementKey = this.getElementKey(element);

    events.forEach((eventDef) => {
      const handler = (e: Event) => {
        executeAction(eventDef, e);
      };

      // リスナー登録
      element.addEventListener(eventDef.type, handler);

      // 追跡のため保存
      const entry: EventListenerEntry = {
        element,
        type: eventDef.type,
        handler,
        pluginId,
      };

      if (!this.listeners.has(elementKey)) {
        this.listeners.set(elementKey, []);
      }
      this.listeners.get(elementKey)!.push(entry);
    });
  }

  /**
   * 要素のイベントリスナーを削除
   */
  detachEvents(element: HTMLElement): void {
    const key = this.getElementKey(element);
    const entries = this.listeners.get(key);

    if (entries) {
      entries.forEach((entry) => {
        entry.element.removeEventListener(entry.type, entry.handler);
      });

      this.listeners.delete(key);
    }
  }

  /**
   * プラグインのイベントリスナーを全て削除
   */
  detachPluginEvents(pluginId: string): void {
    for (const [key, entries] of this.listeners.entries()) {
      const pluginEntries = entries.filter((e) => e.pluginId === pluginId);

      pluginEntries.forEach((entry) => {
        entry.element.removeEventListener(entry.type, entry.handler);
      });

      const remainingEntries = entries.filter((e) => e.pluginId !== pluginId);
      if (remainingEntries.length === 0) {
        this.listeners.delete(key);
      } else {
        this.listeners.set(key, remainingEntries);
      }
    }
  }

  /**
   * 全てのイベントリスナーを削除
   */
  detachAllEvents(): void {
    for (const entries of this.listeners.values()) {
      entries.forEach((entry) => {
        entry.element.removeEventListener(entry.type, entry.handler);
      });
    }

    this.listeners.clear();
  }

  /**
   * 要素を一意に識別するキーを生成
   */
  private getElementKey(element: HTMLElement): string {
    let key = this.elementKeys.get(element);

    if (!key) {
      key = `element-${this.elementIdCounter++}`;
      this.elementKeys.set(element, key);
    }

    return key;
  }

  /**
   * 登録されているリスナー数を取得（デバッグ用）
   */
  getListenerCount(): number {
    let count = 0;
    for (const entries of this.listeners.values()) {
      count += entries.length;
    }
    return count;
  }
}
