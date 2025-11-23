/**
 * Test Setup
 *
 * Vitestテスト環境のセットアップ
 */

import { vi } from 'vitest';

// Chrome Extension APIのモック
(global as any).chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    id: 'test-extension-id',
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

// ブラウザAPIのモック
(global as any).navigator = {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
};

// WindowのモックAPIを追加
(global as any).window = Object.assign(global.window || {}, {
  location: {
    href: 'https://example.com',
    hostname: 'example.com',
    pathname: '/',
  },
});

// CSS.escape ポリフィル（jsdomには実装されていないため）
if (typeof CSS === 'undefined') {
  (global as any).CSS = {};
}
if (!CSS.escape) {
  CSS.escape = (value: string): string => {
    // CSS.escape の簡易実装
    return value.replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '\\$&');
  };
}
