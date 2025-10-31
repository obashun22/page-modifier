# 08. バックグラウンドサービスワーカー

## 機能概要

拡張機能の中核となるBackground Service Workerを実装します。プラグインストレージの管理、Content ScriptとSide Panelの仲介、タブ管理、および外部API通信のプロキシ機能を提供します。

## 実装内容

### 1. Service Worker メインクラス

```typescript
class BackgroundServiceWorker {
  private pluginStore: PluginStorage;

  constructor() {
    this.pluginStore = new PluginStorage();
  }

  /**
   * 初期化
   */
  init(): void {
    console.log('[PageModifier] Background service worker initialized');

    // インストール時の処理
    this.setupInstallListener();

    // メッセージリスナー
    this.setupMessageListeners();

    // タブ更新リスナー
    this.setupTabListeners();

    // アクションボタンクリック
    this.setupActionListener();
  }

  /**
   * インストールリスナー
   */
  private setupInstallListener(): void {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        console.log('[PageModifier] Extension installed');

        // デフォルト設定を保存
        await this.pluginStore.updateSettings({
          autoApplyPlugins: true,
          showNotifications: true,
          theme: 'auto',
        });

        // サンプルプラグインをインストール（オプション）
        await this.installSamplePlugins();
      } else if (details.reason === 'update') {
        console.log('[PageModifier] Extension updated');
        // マイグレーション処理
      }
    });
  }

  /**
   * メッセージリスナー
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
    try {
      switch (message.type) {
        // プラグイン取得
        case 'GET_PLUGINS_FOR_DOMAIN':
          await this.handleGetPluginsForDomain(message, sendResponse);
          break;

        case 'GET_PLUGIN':
          await this.handleGetPlugin(message, sendResponse);
          break;

        case 'GET_ALL_PLUGINS':
          await this.handleGetAllPlugins(sendResponse);
          break;

        // プラグイン保存
        case 'SAVE_PLUGIN':
          await this.handleSavePlugin(message, sendResponse);
          break;

        case 'UPDATE_PLUGIN':
          await this.handleUpdatePlugin(message, sendResponse);
          break;

        case 'DELETE_PLUGIN':
          await this.handleDeletePlugin(message, sendResponse);
          break;

        case 'TOGGLE_PLUGIN':
          await this.handleTogglePlugin(message, sendResponse);
          break;

        // 要素選択
        case 'ELEMENT_SELECTED':
          await this.handleElementSelected(message, sender, sendResponse);
          break;

        // 設定
        case 'GET_SETTINGS':
          await this.handleGetSettings(sendResponse);
          break;

        case 'UPDATE_SETTINGS':
          await this.handleUpdateSettings(message, sendResponse);
          break;

        // API呼び出し
        case 'API_CALL':
          await this.handleApiCall(message, sendResponse);
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * ドメインに対応するプラグインを取得
   */
  private async handleGetPluginsForDomain(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    const url = message.url;
    const domain = new URL(url).hostname;

    const plugins = await this.pluginStore.getPluginsForDomain(domain);

    // enabled=trueのみフィルタ
    const enabledPlugins = plugins
      .filter(p => p.enabled)
      .map(p => p.plugin);

    sendResponse({ success: true, plugins: enabledPlugins });
  }

  /**
   * プラグインをIDで取得
   */
  private async handleGetPlugin(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    const pluginData = await this.pluginStore.getPlugin(message.pluginId);

    if (pluginData) {
      sendResponse({ success: true, plugin: pluginData.plugin });
    } else {
      sendResponse({ success: false, error: 'Plugin not found' });
    }
  }

  /**
   * 全プラグインを取得
   */
  private async handleGetAllPlugins(sendResponse: (response: any) => void): Promise<void> {
    const plugins = await this.pluginStore.getAllPlugins();
    sendResponse({ success: true, plugins });
  }

  /**
   * プラグインを保存
   */
  private async handleSavePlugin(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    await this.pluginStore.savePlugin(message.plugin);

    // Content Scriptに通知
    await this.notifyContentScripts('RELOAD_PLUGINS');

    sendResponse({ success: true });
  }

  /**
   * プラグインを更新
   */
  private async handleUpdatePlugin(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    await this.pluginStore.updatePlugin(message.pluginId, message.updates);

    // Content Scriptに通知
    await this.notifyContentScripts('RELOAD_PLUGINS');

    sendResponse({ success: true });
  }

  /**
   * プラグインを削除
   */
  private async handleDeletePlugin(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    await this.pluginStore.deletePlugin(message.pluginId);

    // Content Scriptに通知
    await this.notifyContentScripts('RELOAD_PLUGINS');

    sendResponse({ success: true });
  }

  /**
   * プラグインを有効/無効切り替え
   */
  private async handleTogglePlugin(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    await this.pluginStore.togglePlugin(message.pluginId, message.enabled);

    // Content Scriptに通知
    if (message.enabled) {
      await this.notifyContentScripts('RELOAD_PLUGINS');
    } else {
      await this.notifyContentScripts('DISABLE_PLUGIN', { pluginId: message.pluginId });
    }

    sendResponse({ success: true });
  }

  /**
   * 要素選択の結果を処理
   */
  private async handleElementSelected(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    // Side Panelに転送
    // Side Panelは特定のタブに紐付いていないため、
    // 全てのSide Panelビューに送信
    chrome.runtime.sendMessage({
      type: 'ELEMENT_SELECTED_FROM_CONTENT',
      selector: message.selector,
      elementInfo: message.elementInfo,
      tabId: sender.tab?.id,
    });

    sendResponse({ success: true });
  }

  /**
   * 設定を取得
   */
  private async handleGetSettings(sendResponse: (response: any) => void): Promise<void> {
    const settings = await this.pluginStore.getSettings();
    sendResponse({ success: true, settings });
  }

  /**
   * 設定を更新
   */
  private async handleUpdateSettings(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    await this.pluginStore.updateSettings(message.settings);
    sendResponse({ success: true });
  }

  /**
   * 外部API呼び出し（プロキシ）
   */
  private async handleApiCall(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    // セキュリティチェック
    if (!message.url.startsWith('https://')) {
      sendResponse({ success: false, error: 'Only HTTPS URLs are allowed' });
      return;
    }

    try {
      const response = await fetch(message.url, {
        method: message.method || 'GET',
        headers: message.headers || {},
        body: message.data ? JSON.stringify(message.data) : undefined,
      });

      const data = await response.json();

      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * タブリスナー
   */
  private setupTabListeners(): void {
    // タブ更新時
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        console.log(`Tab ${tabId} loaded: ${tab.url}`);
        // 必要に応じてContent Scriptに通知
      }
    });
  }

  /**
   * アクションボタンクリック
   */
  private setupActionListener(): void {
    chrome.action.onClicked.addListener((tab) => {
      // Side Panelを開く
      chrome.sidePanel.open({ tabId: tab.id });
    });
  }

  /**
   * Content Scriptsに通知
   */
  private async notifyContentScripts(type: string, data?: any): Promise<void> {
    const tabs = await chrome.tabs.query({});

    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type,
          ...data,
        }).catch(() => {
          // Content Scriptが注入されていないタブは無視
        });
      }
    });
  }

  /**
   * サンプルプラグインをインストール
   */
  private async installSamplePlugins(): Promise<void> {
    // サンプルプラグインをplugins/からロード
    // 実装は省略
  }
}

// 初期化
const backgroundWorker = new BackgroundServiceWorker();
backgroundWorker.init();
```

## 実装ステップ

### Phase 1: 基本構造実装

- [ ] src/background/service-worker.ts作成
- [ ] BackgroundServiceWorkerクラスの骨組み
- [ ] 初期化処理

### Phase 2: メッセージハンドラー実装

- [ ] setupMessageListeners実装
- [ ] handleMessage実装
- [ ] 各メッセージタイプの処理

### Phase 3: プラグイン管理実装

- [ ] handleGetPluginsForDomain実装
- [ ] handleSavePlugin実装
- [ ] handleDeletePlugin実装
- [ ] handleTogglePlugin実装

### Phase 4: 通知機能実装

- [ ] notifyContentScripts実装
- [ ] ストレージ変更の監視
- [ ] タブ間の同期

### Phase 5: タブ管理実装

- [ ] setupTabListeners実装
- [ ] タブ更新の処理

### Phase 6: API プロキシ実装

- [ ] handleApiCall実装
- [ ] セキュリティ検証
- [ ] エラーハンドリング

### Phase 7: 設定管理実装

- [ ] handleGetSettings実装
- [ ] handleUpdateSettings実装

### Phase 8: テスト実装

- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] メッセージングのテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型安全性 | ^5.6.0 |
| Chrome Extension API | 拡張機能API | - |

## ファイル構成

```
src/
└── background/
    ├── service-worker.ts         # メインワーカー
    └── plugin-store.ts           # 既存（02実装）
```

## 依存関係

**前提条件:**
- 02_plugin_storage完了

**この機能を使用する機能:**
- 07_content_script（メッセージング）
- 09_chat_ui（メッセージング）
- 11_plugin_management_ui（メッセージング）

## テスト観点

- [ ] メッセージングが正常に動作する
- [ ] プラグインの保存・取得が正常に動作する
- [ ] Content Scriptsへの通知が正常に動作する
- [ ] API呼び出しが正常に動作する
- [ ] タブ間でプラグインが同期される

## セキュリティ考慮事項

1. **メッセージ検証**
   - 受信メッセージの妥当性チェック

2. **API呼び出し**
   - HTTPSのみ許可
   - ホワイトリスト検討

## 注意点・制約事項

1. **Service Worker のライフサイクル**
   - 一定時間後に停止される
   - 状態の永続化が必要

2. **メッセージング**
   - Content Scriptが注入されていないタブへの対応

## 次のステップ

✅ Background Service Worker実装完了後
→ **09_chat_ui.md**: Chat UIの実装
