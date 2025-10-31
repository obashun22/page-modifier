# 07. コンテンツスクリプト

## 機能概要

各Webページに注入されるContent Scriptのメイン実装を行います。プラグインの自動実行、MutationObserverによる動的コンテンツの監視、Background Service Workerとの通信、および要素選択モードの制御を提供します。

## 実装内容

### 1. Content Script メインクラス

```typescript
class ContentScript {
  private pluginEngine: PluginEngine;
  private elementSelector: ElementSelector;
  private eventManager: EventManager;
  private observer: MutationObserver | null = null;
  private activePlugins: Map<string, Plugin> = new Map();

  constructor() {
    this.pluginEngine = new PluginEngine();
    this.elementSelector = new ElementSelector();
    this.eventManager = new EventManager();
  }

  /**
   * 初期化
   */
  async init(): void {
    console.log('[PageModifier] Content script initialized');

    // 現在のURLを取得
    const currentUrl = location.href;

    // 該当ドメインのプラグインを取得
    const plugins = await this.fetchPluginsForDomain(currentUrl);

    // プラグインを実行
    await this.executePlugins(plugins);

    // MutationObserver開始
    this.startObserving();

    // メッセージリスナー登録
    this.setupMessageListeners();
  }

  /**
   * ドメインに対応するプラグインを取得
   */
  private async fetchPluginsForDomain(url: string): Promise<Plugin[]> {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_PLUGINS_FOR_DOMAIN',
      url,
    });

    return response.plugins || [];
  }

  /**
   * プラグインを実行
   */
  private async executePlugins(plugins: Plugin[]): Promise<void> {
    // 優先度順にソート
    const sortedPlugins = plugins.sort((a, b) => b.priority - a.priority);

    for (const plugin of sortedPlugins) {
      // 自動適用フラグチェック
      if (!plugin.autoApply) {
        console.log(`Skipping plugin ${plugin.id}: autoApply is false`);
        continue;
      }

      // プラグイン実行
      try {
        console.log(`Executing plugin: ${plugin.name}`);
        const result = await this.pluginEngine.executePlugin(plugin);

        if (result.success) {
          console.log(`✅ Plugin ${plugin.id} executed successfully`);
          this.activePlugins.set(plugin.id, plugin);
        } else {
          console.error(`❌ Plugin ${plugin.id} failed:`, result);
        }
      } catch (error) {
        console.error(`Failed to execute plugin ${plugin.id}:`, error);
      }
    }
  }

  /**
   * MutationObserverで動的コンテンツを監視
   */
  private startObserving(): void {
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('[PageModifier] MutationObserver started');
  }

  /**
   * DOM変更を処理
   */
  private handleMutations(mutations: MutationRecord[]): void {
    // 新しく追加されたノードをチェック
    const addedNodes: Node[] = [];

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          addedNodes.push(node);
        }
      });
    });

    if (addedNodes.length === 0) return;

    // アクティブなプラグインを再実行（新しい要素に対して）
    this.reapplyPluginsToNewNodes(addedNodes);
  }

  /**
   * 新しいノードにプラグインを再適用
   */
  private async reapplyPluginsToNewNodes(nodes: Node[]): Promise<void> {
    for (const [pluginId, plugin] of this.activePlugins.entries()) {
      // 各operationのセレクターに新しいノードがマッチするかチェック
      for (const operation of plugin.operations) {
        nodes.forEach(node => {
          if (node instanceof HTMLElement) {
            // ノードがセレクターにマッチするか
            if (node.matches(operation.selector)) {
              // 操作を再実行
              this.pluginEngine.executeOperation(operation, [node]);
            }

            // 子孫要素もチェック
            const descendants = node.querySelectorAll(operation.selector);
            if (descendants.length > 0) {
              this.pluginEngine.executeOperation(
                operation,
                Array.from(descendants) as HTMLElement[]
              );
            }
          }
        });
      }
    }
  }

  /**
   * メッセージリスナーを設定
   */
  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンス
    });
  }

  /**
   * メッセージを処理
   */
  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    switch (message.type) {
      case 'START_ELEMENT_SELECTION':
        this.startElementSelection(sendResponse);
        break;

      case 'STOP_ELEMENT_SELECTION':
        this.stopElementSelection();
        sendResponse({ success: true });
        break;

      case 'EXECUTE_PLUGIN':
        await this.executePluginById(message.pluginId);
        sendResponse({ success: true });
        break;

      case 'RELOAD_PLUGINS':
        await this.reloadPlugins();
        sendResponse({ success: true });
        break;

      case 'DISABLE_PLUGIN':
        this.disablePlugin(message.pluginId);
        sendResponse({ success: true });
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  /**
   * 要素選択モードを開始
   */
  private startElementSelection(callback: (response: any) => void): void {
    this.elementSelector.activate((selector, element) => {
      // 選択結果をSide Panelに送信
      chrome.runtime.sendMessage({
        type: 'ELEMENT_SELECTED',
        selector,
        elementInfo: {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          classes: Array.from(element.classList),
          dimensions: {
            width: element.offsetWidth,
            height: element.offsetHeight,
          },
        },
      });

      callback({ success: true, selector });
    });
  }

  /**
   * 要素選択モードを停止
   */
  private stopElementSelection(): void {
    this.elementSelector.deactivate();
  }

  /**
   * プラグインをIDで実行
   */
  private async executePluginById(pluginId: string): Promise<void> {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_PLUGIN',
      pluginId,
    });

    if (response.plugin) {
      await this.executePlugins([response.plugin]);
    }
  }

  /**
   * プラグインをリロード
   */
  private async reloadPlugins(): Promise<void> {
    // 既存のプラグインを無効化
    for (const pluginId of this.activePlugins.keys()) {
      this.disablePlugin(pluginId);
    }

    // プラグインを再取得・実行
    const plugins = await this.fetchPluginsForDomain(location.href);
    await this.executePlugins(plugins);
  }

  /**
   * プラグインを無効化
   */
  private disablePlugin(pluginId: string): void {
    // イベントリスナーを削除
    this.eventManager.detachPluginEvents(pluginId);

    // プラグインが追加した要素を削除
    const elements = document.querySelectorAll(`[data-plugin-operation^="${pluginId}"]`);
    elements.forEach(el => el.remove());

    // アクティブリストから削除
    this.activePlugins.delete(pluginId);

    console.log(`Plugin ${pluginId} disabled`);
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.elementSelector.deactivate();
  }
}

// 初期化
const contentScript = new ContentScript();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript.init();
  });
} else {
  contentScript.init();
}

// ページアンロード時のクリーンアップ
window.addEventListener('beforeunload', () => {
  contentScript.cleanup();
});
```

### 2. メッセージタイプ定義

```typescript
// Content Script → Background
type ContentToBackgroundMessage =
  | { type: 'GET_PLUGINS_FOR_DOMAIN'; url: string }
  | { type: 'GET_PLUGIN'; pluginId: string }
  | { type: 'ELEMENT_SELECTED'; selector: string; elementInfo: ElementInfo };

// Background → Content Script
type BackgroundToContentMessage =
  | { type: 'START_ELEMENT_SELECTION' }
  | { type: 'STOP_ELEMENT_SELECTION' }
  | { type: 'EXECUTE_PLUGIN'; pluginId: string }
  | { type: 'RELOAD_PLUGINS' }
  | { type: 'DISABLE_PLUGIN'; pluginId: string };

interface ElementInfo {
  tag: string;
  id: string;
  classes: string[];
  dimensions: { width: number; height: number };
}
```

## 実装ステップ

### Phase 1: 基本構造実装

- [ ] src/content/content-script.ts作成
- [ ] ContentScriptクラスの骨組み
- [ ] 初期化処理

### Phase 2: プラグイン実行実装

- [ ] fetchPluginsForDomain実装
- [ ] executePlugins実装
- [ ] プラグイン優先度の考慮

### Phase 3: MutationObserver実装

- [ ] startObserving実装
- [ ] handleMutations実装
- [ ] reapplyPluginsToNewNodes実装

### Phase 4: メッセージング実装

- [ ] setupMessageListeners実装
- [ ] handleMessage実装
- [ ] 各メッセージタイプの処理

### Phase 5: 要素選択統合

- [ ] startElementSelection実装
- [ ] stopElementSelection実装
- [ ] ElementSelectorとの連携

### Phase 6: プラグイン管理実装

- [ ] executePluginById実装
- [ ] reloadPlugins実装
- [ ] disablePlugin実装

### Phase 7: クリーンアップ実装

- [ ] cleanup実装
- [ ] イベントリスナー削除
- [ ] Observer停止

### Phase 8: テスト実装

- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] 実際のページでの動作確認

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型安全性 | ^5.6.0 |
| MutationObserver | DOM監視 | - |
| Chrome Extension API | メッセージング | - |

## ファイル構成

```
src/
└── content/
    ├── content-script.ts         # メインスクリプト
    ├── plugin-engine.ts          # 既存
    ├── element-selector.ts       # 既存
    ├── event-manager.ts          # 既存
    └── operations/               # 既存
```

## 依存関係

**前提条件:**
- 03_plugin_engine完了
- 04_operations完了
- 05_element_selector完了
- 06_event_handling完了

**この機能を使用する機能:**
- 08_background_worker（メッセージング）
- 09_chat_ui（要素選択）

## テスト観点

- [ ] ページロード時にプラグインが自動実行される
- [ ] MutationObserverが新しい要素を検出する
- [ ] 新しい要素にプラグインが再適用される
- [ ] メッセージングが正常に動作する
- [ ] 要素選択モードが正しく起動・終了する
- [ ] プラグインのリロードが正常に動作する
- [ ] プラグインの無効化が正常に動作する

## セキュリティ考慮事項

1. **メッセージ検証**
   - 受信メッセージの妥当性チェック
   - 信頼できないソースからのメッセージ拒否

2. **DOM操作の制限**
   - プラグインが他のプラグインの要素を操作しない

## 注意点・制約事項

1. **パフォーマンス**
   - MutationObserverのコールバック頻度
   - 大量のDOM変更時の最適化

2. **タイミング**
   - DOMContentLoaded vs document.readyState
   - 動的SPAへの対応

3. **メモリ管理**
   - Observer の適切な停止
   - イベントリスナーのクリーンアップ

4. **競合**
   - 他の拡張機能との競合
   - ページのJavaScriptとの干渉

## 次のステップ

✅ Content Script実装完了後
→ **08_background_worker.md**: Background Service Workerの実装
