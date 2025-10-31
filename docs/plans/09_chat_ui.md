# 09. チャットUI

## 機能概要

Side Panel上で動作するチャットインターフェースを実装します。ユーザーとの対話、プラグインの生成フロー、プレビュー機能、およびプラグイン管理UIへのアクセスを提供します。

## 実装内容

### 1. Reactコンポーネント構成

```
App
├── ChatView
│   ├── MessageList
│   │   ├── MessageItem (user)
│   │   └── MessageItem (assistant)
│   ├── InputArea
│   └── ElementSelectorButton
├── PluginPreview
│   ├── PluginInfo
│   ├── OperationsList
│   └── ApprovalButtons
├── PluginManagementView
│   ├── PluginList
│   ├── PluginEditor
│   └── SettingsPanel
└── NavigationBar
```

### 2. メインコンポーネント

```typescript
// App.tsx
import React, { useState } from 'react';
import ChatView from './components/ChatView';
import PluginManagementView from './components/PluginManagementView';

type View = 'chat' | 'plugins';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('chat');

  return (
    <div className="app">
      <NavigationBar currentView={currentView} onViewChange={setCurrentView} />

      {currentView === 'chat' && <ChatView />}
      {currentView === 'plugins' && <PluginManagementView />}
    </div>
  );
}
```

```typescript
// ChatView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { generatePluginWithAI } from '../services/ai-service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);

  // 要素選択モード開始
  const startElementSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTION' });
    }
  };

  // 要素選択の結果を受信
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'ELEMENT_SELECTED_FROM_CONTENT') {
        setSelectedElement({
          selector: message.selector,
          ...message.elementInfo,
        });

        // チャットに追加
        addMessage('user', `要素を選択しました: ${message.selector}`);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // メッセージ送信
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // AI APIを呼び出してプラグイン生成
      const plugin = await generatePluginWithAI(input, selectedElement);

      // アシスタントメッセージ
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `プラグインを生成しました: ${plugin.name}`,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // プレビュー表示
      showPluginPreview(plugin);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `エラーが発生しました: ${error.message}`,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, message]);
  };

  return (
    <div className="chat-view">
      <div className="message-list">
        {messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}
      </div>

      <div className="input-area">
        <button onClick={startElementSelection} className="element-selector-btn">
          📍 要素を選択
        </button>

        {selectedElement && (
          <div className="selected-element-info">
            選択中: <code>{selectedElement.selector}</code>
          </div>
        )}

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="プラグインの機能を説明してください..."
        />

        <button onClick={sendMessage} disabled={!input.trim() || isLoading}>
          送信
        </button>
      </div>
    </div>
  );
}
```

### 3. プラグインプレビュー

```typescript
// PluginPreview.tsx
import React from 'react';

interface PluginPreviewProps {
  plugin: Plugin;
  onApprove: (plugin: Plugin) => void;
  onReject: () => void;
}

export default function PluginPreview({ plugin, onApprove, onReject }: PluginPreviewProps) {
  return (
    <div className="plugin-preview">
      <h3>{plugin.name}</h3>
      <p>{plugin.description}</p>

      <div className="operations-list">
        <h4>操作内容</h4>
        {plugin.operations.map((op, index) => (
          <div key={index} className="operation-item">
            <span className="operation-type">{op.type}</span>
            <span className="operation-selector">{op.selector}</span>
            {op.description && <p>{op.description}</p>}
          </div>
        ))}
      </div>

      <div className="preview-actions">
        <button onClick={() => onApprove(plugin)} className="approve-btn">
          ✅ 適用する
        </button>
        <button onClick={onReject} className="reject-btn">
          ❌ キャンセル
        </button>
      </div>
    </div>
  );
}
```

## 実装ステップ

### Phase 1: 基本構造実装

- [ ] src/sidepanel/index.html作成
- [ ] src/sidepanel/main.tsx作成
- [ ] src/sidepanel/App.tsx作成
- [ ] Tailwind CSS設定

### Phase 2: チャットコンポーネント

- [ ] ChatView.tsx実装
- [ ] MessageList.tsx実装
- [ ] MessageItem.tsx実装
- [ ] InputArea.tsx実装

### Phase 3: 要素選択統合

- [ ] ElementSelectorButton実装
- [ ] Content Scriptとのメッセージング
- [ ] 選択結果の表示

### Phase 4: プレビュー機能

- [ ] PluginPreview.tsx実装
- [ ] プレビュー表示ロジック
- [ ] 承認/拒否処理

### Phase 5: UI/UX実装

- [ ] スタイリング（Tailwind CSS）
- [ ] ローディング表示
- [ ] エラー表示
- [ ] トースト通知

### Phase 6: ナビゲーション

- [ ] NavigationBar実装
- [ ] ビュー切り替え
- [ ] ルーティング

### Phase 7: テスト実装

- [ ] コンポーネントテスト
- [ ] 統合テスト
- [ ] ユーザビリティテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| React | UIフレームワーク | ^18.3.0 |
| TypeScript | 型安全性 | ^5.6.0 |
| Tailwind CSS | スタイリング | ^3.4.0 |

## ファイル構成

```
src/
└── sidepanel/
    ├── index.html
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── ChatView.tsx
    │   ├── MessageList.tsx
    │   ├── MessageItem.tsx
    │   ├── InputArea.tsx
    │   ├── PluginPreview.tsx
    │   ├── PluginManagementView.tsx
    │   └── NavigationBar.tsx
    ├── services/
    │   └── ai-service.ts
    └── styles/
        └── index.css
```

## 依存関係

**前提条件:**
- 00_project_setup完了
- 08_background_worker完了

**この機能を使用する機能:**
- 10_ai_integration
- 11_plugin_management_ui

## テスト観点

- [ ] メッセージ送受信が正常に動作する
- [ ] 要素選択が正常に動作する
- [ ] プラグインプレビューが表示される
- [ ] プラグイン承認が正常に動作する
- [ ] ビュー切り替えが正常に動作する

## 次のステップ

✅ Chat UI実装完了後
→ **10_ai_integration.md**: AI統合の実装
→ **11_plugin_management_ui.md**: プラグイン管理UIの実装
