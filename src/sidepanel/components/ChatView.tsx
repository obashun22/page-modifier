/**
 * Page Modifier - Chat View Component
 *
 * チャットビュー（メインチャット画面）
 */

import { useState, useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import PluginPreview from './PluginPreview';
import { generatePluginWithAI } from '../services/ai-service';
import type { Plugin } from '../../shared/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ElementInfo {
  selector: string;
  tagName?: string;
  className?: string;
  id?: string;
}

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'こんにちは！Webページに追加したい機能を教えてください。要素を選択する場合は「📍 要素を選択」ボタンをクリックしてください。',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [previewPlugin, setPreviewPlugin] = useState<Plugin | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージリストの自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 要素選択の結果を受信
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'ELEMENT_SELECTED') {
        const elementInfo: ElementInfo = {
          selector: message.selector,
          tagName: message.tagName,
          className: message.className,
          id: message.id,
        };

        setSelectedElement(elementInfo);
        addMessage('assistant', `要素を選択しました: ${message.selector}`);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // 要素選択モード開始
  const startElementSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTION' });
      addMessage('assistant', '要素を選択してください。選択したい要素の上にマウスを移動し、クリックしてください。');
    }
  };

  // メッセージ追加
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, message]);
  };

  // メッセージ送信
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // AI APIを呼び出してプラグイン生成
      const plugin = await generatePluginWithAI(input, selectedElement);

      // アシスタントメッセージ
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `プラグイン「${plugin.name}」を生成しました。以下の内容を確認して、適用してください。`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // プレビュー表示
      setPreviewPlugin(plugin);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // プラグイン承認
  const handleApprove = async (plugin: Plugin) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_PLUGIN',
        plugin,
      });

      addMessage('assistant', `プラグイン「${plugin.name}」を保存しました。有効化して使用してください。`);
      setPreviewPlugin(null);
      setSelectedElement(null);
    } catch (error) {
      addMessage('assistant', `プラグインの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // プラグイン拒否
  const handleReject = () => {
    addMessage('assistant', 'プラグインの生成をキャンセルしました。別の要望があればお聞かせください。');
    setPreviewPlugin(null);
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* メッセージリスト */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {isLoading && (
          <div
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              color: '#6e7781',
              textAlign: 'center',
            }}
          >
            🤖 生成中...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* プラグインプレビュー */}
      {previewPlugin && (
        <PluginPreview
          plugin={previewPlugin}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* 入力エリア */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid #d0d7de',
          backgroundColor: '#f6f8fa',
        }}
      >
        {selectedElement && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '8px',
              backgroundColor: '#ddf4ff',
              border: '1px solid #54aeff',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              選択中: <code style={{ fontFamily: 'monospace' }}>{selectedElement.selector}</code>
            </span>
            <button
              onClick={() => setSelectedElement(null)}
              style={{
                padding: '2px 8px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                color: '#0969da',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={startElementSelection}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: 'white',
              color: '#24292f',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            📍 要素を選択
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="プラグインの機能を説明してください..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: !input.trim() || isLoading ? '#6e7781' : '#2da44e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: !input.trim() || isLoading ? 0.6 : 1,
            }}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
