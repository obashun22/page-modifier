/**
 * Page Modifier - ElementSelector Unit Tests
 *
 * 要素選択機能のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElementSelector } from '../../../src/content/element-selector';

describe('ElementSelector', () => {
  let selector: ElementSelector;
  let container: HTMLElement;

  beforeEach(() => {
    selector = new ElementSelector();

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
    selector.deactivate();
  });

  describe('activate/deactivate', () => {
    it('should activate selector mode and create UI elements', () => {
      const callback = vi.fn();

      selector.activate(callback);

      // オーバーレイ、ツールチップ、メッセージが作成されていることを確認
      const overlay = document.querySelector('[data-plugin-overlay]');
      const tooltip = document.querySelector('[data-plugin-tooltip]');
      const message = document.querySelector('[data-plugin-message]');

      expect(overlay).not.toBeNull();
      expect(tooltip).not.toBeNull();
      expect(message).not.toBeNull();
    });

    it('should deactivate selector mode and remove UI elements', () => {
      const callback = vi.fn();

      selector.activate(callback);
      selector.deactivate();

      // UI要素が削除されていることを確認
      const overlay = document.querySelector('[data-plugin-overlay]');
      const tooltip = document.querySelector('[data-plugin-tooltip]');
      const message = document.querySelector('[data-plugin-message]');

      expect(overlay).toBeNull();
      expect(tooltip).toBeNull();
      expect(message).toBeNull();
    });

    it('should not activate multiple times', () => {
      const callback = vi.fn();

      selector.activate(callback);
      selector.activate(callback); // 2回目の呼び出し

      // オーバーレイが1つだけ存在することを確認
      const overlays = document.querySelectorAll('[data-plugin-overlay]');
      expect(overlays.length).toBe(1);
    });

    it('should not deactivate when not active', () => {
      // アクティブでないときにdeactivateを呼んでもエラーにならない
      expect(() => selector.deactivate()).not.toThrow();
    });
  });

  describe('generateSelector', () => {
    it('should generate selector with ID when element has unique ID', () => {
      const callback = vi.fn();

      container.innerHTML = '<div id="unique-id">Test</div>';
      const element = container.querySelector('#unique-id') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalledWith(
        '#unique-id',
        expect.objectContaining({
          tagName: 'div',
          id: 'unique-id',
        })
      );
    });

    it('should generate selector with class when element has unique class', () => {
      const callback = vi.fn();

      container.innerHTML = '<div class="unique-class">Test</div>';
      const element = container.querySelector('.unique-class') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalled();
      const [generatedSelector] = callback.mock.calls[0];

      // クラスセレクターまたはtag+classセレクターが生成されるべき
      expect(
        generatedSelector === '.unique-class' ||
        generatedSelector === 'div.unique-class'
      ).toBe(true);
    });

    it('should generate selector with data attribute when available', () => {
      const callback = vi.fn();

      container.innerHTML = '<div data-unique="test-value">Test</div>';
      const element = container.querySelector('[data-unique]') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalled();
      const [generatedSelector] = callback.mock.calls[0];

      // data属性セレクターまたは構造的パスセレクターが生成される
      expect(generatedSelector).toBeDefined();
    });

    it('should generate path selector when no unique attributes', () => {
      const callback = vi.fn();

      container.innerHTML = `
        <div class="parent">
          <div class="child">
            <span>Target</span>
          </div>
        </div>
      `;
      const element = container.querySelector('span') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalled();
      const [generatedSelector] = callback.mock.calls[0];

      // 構造的パスセレクターが生成される
      expect(generatedSelector).toBeDefined();
      expect(generatedSelector.includes('>')).toBe(true);
    });

    it('should escape special characters in selectors', () => {
      const callback = vi.fn();

      container.innerHTML = '<div id="special:id">Test</div>';
      const element = container.querySelector('[id="special:id"]') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalled();
      const [generatedSelector] = callback.mock.calls[0];

      // エスケープされたセレクターが生成される
      expect(generatedSelector).toContain('special');
    });
  });

  describe('element info extraction', () => {
    it('should extract comprehensive element information', () => {
      const callback = vi.fn();

      container.innerHTML = `
        <div
          id="test-elem"
          class="test-class"
          data-test="value"
          aria-label="Test Label"
        >
          Test Content
        </div>
      `;
      const element = container.querySelector('#test-elem') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tagName: 'div',
          id: 'test-elem',
          className: 'test-class',
          textContent: 'Test Content',
          attributes: expect.objectContaining({
            'id': 'test-elem',
            'class': 'test-class',
            'data-test': 'value',
            'aria-label': 'Test Label',
          }),
        })
      );
    });

    it('should truncate long text content', () => {
      const callback = vi.fn();

      const longText = 'A'.repeat(200);
      container.innerHTML = `<div id="long-text">${longText}</div>`;
      const element = container.querySelector('#long-text') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalled();
      const [, elementInfo] = callback.mock.calls[0];

      // テキストが100文字に切り詰められている
      expect(elementInfo.textContent?.length).toBeLessThanOrEqual(100);
    });
  });

  describe('UI interaction', () => {
    it('should ignore clicks on overlay elements', () => {
      const callback = vi.fn();

      selector.activate(callback);

      const overlay = document.querySelector('[data-plugin-overlay]') as HTMLElement;

      // オーバーレイをクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: overlay });
      overlay.dispatchEvent(clickEvent);

      // コールバックが呼ばれない
      expect(callback).not.toHaveBeenCalled();
    });

    it('should ignore clicks on tooltip elements', () => {
      const callback = vi.fn();

      selector.activate(callback);

      const tooltip = document.querySelector('[data-plugin-tooltip]') as HTMLElement;

      // ツールチップをクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: tooltip });
      tooltip.dispatchEvent(clickEvent);

      // コールバックが呼ばれない
      expect(callback).not.toHaveBeenCalled();
    });

    it('should ignore clicks on message elements', () => {
      const callback = vi.fn();

      selector.activate(callback);

      const message = document.querySelector('[data-plugin-message]') as HTMLElement;

      // メッセージをクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: message });
      message.dispatchEvent(clickEvent);

      // コールバックが呼ばれない
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('nth-of-type selector', () => {
    it('should generate nth-of-type selector for sibling elements', () => {
      const callback = vi.fn();

      container.innerHTML = `
        <div class="parent">
          <span>First</span>
          <span>Second</span>
          <span>Third</span>
        </div>
      `;
      const elements = container.querySelectorAll('span');
      const secondSpan = elements[1] as HTMLElement;

      selector.activate(callback);

      // 2番目のspanをクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: secondSpan });
      secondSpan.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalled();
      const [generatedSelector] = callback.mock.calls[0];

      // nth-of-type を含むセレクターが生成される
      expect(generatedSelector).toContain(':nth-of-type(2)');
    });
  });

  describe('callback execution', () => {
    it('should execute callback with correct arguments on element click', () => {
      const callback = vi.fn();

      container.innerHTML = '<div id="clickable">Click Me</div>';
      const element = container.querySelector('#clickable') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          selector: expect.any(String),
          tagName: 'div',
          id: 'clickable',
        })
      );
    });

    it('should deactivate after successful element selection', () => {
      const callback = vi.fn();

      container.innerHTML = '<div id="auto-deactivate">Test</div>';
      const element = container.querySelector('#auto-deactivate') as HTMLElement;

      selector.activate(callback);

      // 要素をクリック
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: element });
      element.dispatchEvent(clickEvent);

      // UI要素が削除されていることを確認（deactivateされている）
      const overlay = document.querySelector('[data-plugin-overlay]');
      expect(overlay).toBeNull();
    });
  });
});
