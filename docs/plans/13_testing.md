# 13. テスト戦略

## 機能概要

拡張機能全体のテスト戦略を策定し、ユニットテスト、統合テスト、E2Eテストを実装します。品質保証とリグレッション防止のための包括的なテストスイートを構築します。

## 実装内容

### 1. テスト構成

```
tests/
├── unit/                         # ユニットテスト
│   ├── shared/
│   │   ├── plugin-schema.test.ts
│   │   ├── validator.test.ts
│   │   └── security-analyzer.test.ts
│   ├── background/
│   │   └── plugin-store.test.ts
│   ├── content/
│   │   ├── plugin-engine.test.ts
│   │   ├── element-selector.test.ts
│   │   └── event-manager.test.ts
│   └── services/
│       └── ai-service.test.ts
├── integration/                  # 統合テスト
│   ├── plugin-lifecycle.test.ts
│   ├── messaging.test.ts
│   └── storage.test.ts
├── e2e/                          # E2Eテスト
│   ├── plugin-creation.test.ts
│   ├── element-selection.test.ts
│   └── plugin-execution.test.ts
└── fixtures/                     # テストデータ
    ├── sample-plugins.json
    └── mock-pages.html
```

### 2. テストセットアップ

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
});
```

```typescript
// tests/setup.ts
import { vi } from 'vitest';

// Chrome Extension APIのモック
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
} as any;
```

### 3. ユニットテスト例

```typescript
// tests/unit/shared/plugin-schema.test.ts
import { describe, it, expect } from 'vitest';
import { PluginSchema } from '../../../src/shared/plugin-schema';

describe('PluginSchema', () => {
  it('should validate a valid plugin', () => {
    const validPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      targetDomains: ['example.com'],
      autoApply: true,
      priority: 100,
      operations: [
        {
          id: 'op-1',
          type: 'insert',
          selector: '.container',
          element: {
            tag: 'div',
            textContent: 'Hello',
          },
        },
      ],
    };

    const result = PluginSchema.safeParse(validPlugin);
    expect(result.success).toBe(true);
  });

  it('should reject invalid version format', () => {
    const invalidPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: 'invalid',  // 不正なバージョン
      targetDomains: ['example.com'],
      autoApply: true,
      priority: 100,
      operations: [],
    };

    const result = PluginSchema.safeParse(invalidPlugin);
    expect(result.success).toBe(false);
  });

  it('should validate recursive element structure', () => {
    const pluginWithChildren = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      targetDomains: ['example.com'],
      autoApply: true,
      priority: 100,
      operations: [
        {
          id: 'op-1',
          type: 'insert',
          selector: '.container',
          element: {
            tag: 'div',
            children: [
              {
                tag: 'button',
                textContent: 'Click',
                children: [
                  {
                    tag: 'span',
                    textContent: 'Icon',
                  },
                ],
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
```

```typescript
// tests/unit/content/plugin-engine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginEngine } from '../../../src/content/plugin-engine';

describe('PluginEngine', () => {
  let engine: PluginEngine;

  beforeEach(() => {
    document.body.innerHTML = '<div class="container"></div>';
    engine = new PluginEngine();
  });

  it('should execute insert operation', async () => {
    const plugin = {
      id: 'test-plugin',
      name: 'Test',
      version: '1.0.0',
      targetDomains: ['example.com'],
      autoApply: true,
      priority: 100,
      operations: [
        {
          id: 'op-1',
          type: 'insert' as const,
          selector: '.container',
          position: 'beforeend' as const,
          element: {
            tag: 'button',
            textContent: 'Test Button',
          },
        },
      ],
    };

    const result = await engine.executePlugin(plugin);

    expect(result.success).toBe(true);
    expect(document.querySelector('.container button')).not.toBeNull();
    expect(document.querySelector('.container button')?.textContent).toBe('Test Button');
  });

  it('should handle hierarchical element creation', async () => {
    const plugin = {
      id: 'test-plugin',
      name: 'Test',
      version: '1.0.0',
      targetDomains: ['example.com'],
      autoApply: true,
      priority: 100,
      operations: [
        {
          id: 'op-1',
          type: 'insert' as const,
          selector: '.container',
          element: {
            tag: 'div',
            attributes: { class: 'parent' },
            children: [
              {
                tag: 'div',
                attributes: { class: 'child' },
                children: [
                  {
                    tag: 'span',
                    textContent: 'Nested',
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    await engine.executePlugin(plugin);

    expect(document.querySelector('.parent .child span')).not.toBeNull();
    expect(document.querySelector('.parent .child span')?.textContent).toBe('Nested');
  });
});
```

### 4. 統合テスト例

```typescript
// tests/integration/plugin-lifecycle.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginStorage } from '../../src/background/plugin-store';
import { PluginEngine } from '../../src/content/plugin-engine';

describe('Plugin Lifecycle Integration', () => {
  let storage: PluginStorage;
  let engine: PluginEngine;

  beforeEach(() => {
    storage = new PluginStorage();
    engine = new PluginEngine();
  });

  it('should save and execute a plugin', async () => {
    const plugin = {
      id: 'integration-test',
      name: 'Integration Test',
      version: '1.0.0',
      targetDomains: ['example.com'],
      autoApply: true,
      priority: 100,
      operations: [
        {
          id: 'op-1',
          type: 'insert' as const,
          selector: 'body',
          element: {
            tag: 'div',
            attributes: { id: 'test-element' },
            textContent: 'Test',
          },
        },
      ],
    };

    // 保存
    await storage.savePlugin(plugin);

    // 取得
    const saved = await storage.getPlugin('integration-test');
    expect(saved).not.toBeNull();

    // 実行
    const result = await engine.executePlugin(saved!.plugin);
    expect(result.success).toBe(true);

    // 確認
    expect(document.getElementById('test-element')).not.toBeNull();
  });
});
```

### 5. E2Eテスト例

```typescript
// tests/e2e/plugin-creation.test.ts
import { test, expect } from '@playwright/test';

test.describe('Plugin Creation Flow', () => {
  test('should create a plugin through chat interface', async ({ page }) => {
    // 拡張機能をロード
    await page.goto('chrome-extension://[extension-id]/sidepanel/index.html');

    // チャット入力
    await page.fill('input[placeholder*="プラグイン"]', 'コピーボタンを追加');
    await page.click('button:has-text("送信")');

    // AI応答を待つ
    await page.waitForSelector('.plugin-preview');

    // プレビューを確認
    const pluginName = await page.textContent('.plugin-preview h3');
    expect(pluginName).toContain('コピーボタン');

    // 承認
    await page.click('button:has-text("適用する")');

    // 成功メッセージ
    await page.waitForSelector('.success-message');
  });
});
```

### 6. テストカバレッジ目標

| カテゴリ | 目標カバレッジ | 備考 |
|---------|--------------|------|
| 全体 | 80%以上 | - |
| コア機能 | 90%以上 | PluginEngine, Storage等 |
| UI | 70%以上 | React Components |
| ユーティリティ | 90%以上 | Validator, Security等 |

## 実装ステップ

### Phase 1: テスト環境セットアップ

- [ ] Vitest設定
- [ ] Chrome Extension APIモック
- [ ] JSDOMセットアップ

### Phase 2: ユニットテスト実装

- [ ] プラグインスキーマのテスト
- [ ] プラグインエンジンのテスト
- [ ] ストレージのテスト
- [ ] セキュリティのテスト

### Phase 3: 統合テスト実装

- [ ] プラグインライフサイクルのテスト
- [ ] メッセージングのテスト
- [ ] UIコンポーネント統合テスト

### Phase 4: E2Eテスト実装

- [ ] Playwright設定
- [ ] プラグイン作成フローのテスト
- [ ] 要素選択のテスト
- [ ] プラグイン実行のテスト

### Phase 5: CI/CD統合

- [ ] GitHub Actionsワークフロー作成
- [ ] 自動テスト実行
- [ ] カバレッジレポート生成

### Phase 6: テストデータ準備

- [ ] サンプルプラグインJSON
- [ ] モックHTMLページ
- [ ] テストフィクスチャ

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| Vitest | ユニット・統合テスト | ^2.0.0 |
| @testing-library/react | Reactテスト | ^16.0.0 |
| Playwright | E2Eテスト | ^1.47.0 |
| @vitest/coverage-v8 | カバレッジ | ^2.0.0 |

## ファイル構成

```
tests/
├── unit/
├── integration/
├── e2e/
├── fixtures/
├── setup.ts
└── vitest.config.ts

.github/
└── workflows/
    └── test.yml               # CI/CDワークフロー
```

## 依存関係

**前提条件:**
- 全機能実装完了

## テスト観点

### 機能テスト
- [ ] プラグインの作成
- [ ] プラグインの保存・読み込み
- [ ] プラグインの実行
- [ ] 要素選択
- [ ] イベント処理
- [ ] AI統合

### セキュリティテスト
- [ ] バリデーション
- [ ] サンドボックス
- [ ] XSS対策

### パフォーマンステスト
- [ ] 大量プラグインの処理
- [ ] MutationObserverのパフォーマンス

### ユーザビリティテスト
- [ ] UI操作の流れ
- [ ] エラーメッセージの明確性

## CI/CD統合

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## 注意点・制約事項

1. **Chrome Extension APIのモック**
   - 完全な再現は困難
   - 実機テストも必要

2. **非同期処理のテスト**
   - タイムアウトの適切な設定
   - フレーキーテストの防止

3. **E2Eテストの安定性**
   - ネットワーク依存
   - 環境依存の問題

## 次のステップ

✅ 全実装計画書作成完了
→ 実装フェーズへ進む

---

## 📋 実装計画書まとめ

全14の実装計画書を作成しました：

1. ✅ 00_project_setup.md - プロジェクトセットアップ
2. ✅ 01_plugin_schema.md - プラグインスキーマ設計
3. ✅ 02_plugin_storage.md - プラグインストレージ
4. ✅ 03_plugin_engine.md - プラグインエンジン
5. ✅ 04_operations.md - 操作実装
6. ✅ 05_element_selector.md - 要素セレクター
7. ✅ 06_event_handling.md - イベントハンドリング
8. ✅ 07_content_script.md - コンテンツスクリプト
9. ✅ 08_background_worker.md - バックグラウンドサービスワーカー
10. ✅ 09_chat_ui.md - チャットUI
11. ✅ 10_ai_integration.md - AI統合
12. ✅ 11_plugin_management_ui.md - プラグイン管理UI
13. ✅ 12_security.md - セキュリティ
14. ✅ 13_testing.md - テスト戦略

各計画書には以下が含まれています：
- 機能概要
- 実装内容の詳細
- 実装ステップ
- 使用技術・ライブラリ
- ファイル構成
- 依存関係
- テスト観点
- セキュリティ考慮事項
- 注意点・制約事項
