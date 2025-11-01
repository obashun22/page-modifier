/**
 * Page Modifier - Chat View Component
 *
 * チャットビュー（メインチャット画面）
 */

import { useState, useEffect, useRef } from 'react';
import { IoSend } from 'react-icons/io5';
import { FiMousePointer } from 'react-icons/fi';
import MessageItem from './MessageItem';
import PluginCard from './PluginCard';
import { chatWithAI } from '../services/ai-service';
import type { Plugin } from '../../shared/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  plugin?: Plugin;  // プラグイン情報（オプション）
  pluginMode?: 'preview' | 'editing' | 'applied';  // プラグイン表示モード
  isConfirmed?: boolean;  // 編集参照が確定済みかどうか
}

interface ElementInfo {
  selector: string;
  tagName?: string;
  className?: string;
  id?: string;
}

interface ChatViewProps {
  selectedPluginForEdit: Plugin | null;
  onClearSelectedPlugin: () => void;
}

export default function ChatView({ selectedPluginForEdit, onClearSelectedPlugin }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'こんにちは！Page Modifierへようこそ。\n\nWebページに機能を追加したい場合は具体的な要望を教えてください。使い方や機能について知りたい場合は、お気軽に質問してください。\n\n既存のプラグインを編集したい場合は、プラグイン一覧から「💬 チャットで編集」ボタンでこのチャットに持ってくることができます。\n要素を選択したい場合は下の「📍」ボタンをクリックしてください（キャンセルする場合は再度ボタンをクリック）。',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [existingPluginIds, setExistingPluginIds] = useState<Set<string>>(new Set());
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージリストの自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 既存のプラグインIDを読み込む
  useEffect(() => {
    loadExistingPluginIds();
  }, []);

  const loadExistingPluginIds = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ALL_PLUGINS',
    });

    if (response.success) {
      const ids = new Set<string>(response.plugins.map((p: any) => p.plugin.id));
      setExistingPluginIds(ids);
    }
  };

  // プラグイン一覧から編集対象プラグインが持ち込まれた時
  useEffect(() => {
    if (selectedPluginForEdit) {
      const message: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `プラグイン「${selectedPluginForEdit.name}」を編集モードで開きました。このプラグインをどのように編集しますか？`,
        timestamp: Date.now(),
        plugin: selectedPluginForEdit,
        pluginMode: 'editing',
      };
      setMessages((prev) => [...prev, message]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPluginForEdit?.id]); // IDが変わった時のみ実行

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
        setIsSelectingElement(false);
        addMessage('assistant', `要素を選択しました: ${message.selector}`);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // 要素選択モードのトグル
  const toggleElementSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) return;

    if (isSelectingElement) {
      // キャンセル
      await chrome.tabs.sendMessage(tab.id, { type: 'STOP_ELEMENT_SELECTION' });
      setIsSelectingElement(false);
      addMessage('assistant', '要素選択をキャンセルしました。');
    } else {
      // 開始
      await chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTION' });
      setIsSelectingElement(true);
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

    // メッセージ送信時に、editing モードのメッセージを確定済みにする
    setMessages((prev) =>
      prev.map((msg) =>
        msg.pluginMode === 'editing' && !msg.isConfirmed
          ? { ...msg, isConfirmed: true }
          : msg
      )
    );

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
      // AI APIを呼び出してチャット（選択したプラグインを渡す）
      const response = await chatWithAI(input, selectedElement, selectedPluginForEdit);

      if (response.type === 'text') {
        // 通常のテキスト応答
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else if (response.type === 'plugin') {
        // プラグイン生成レスポンス
        const isEditing = selectedPluginForEdit !== null;
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: isEditing
            ? `プラグイン「${response.plugin.name}」を編集しました。以下の内容を確認して、適用してください。`
            : `プラグイン「${response.plugin.name}」を生成しました。以下の内容を確認して、適用してください。`,
          timestamp: Date.now(),
          plugin: response.plugin,
          pluginMode: 'preview',
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
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
  const handleApprove = async (plugin: Plugin, messageId: string) => {
    try {
      // IDが重複しているかどうかで既存プラグインかどうかを判定
      const isExistingPlugin = existingPluginIds.has(plugin.id);

      // 確認ダイアログを表示
      let confirmMessage = '';
      if (isExistingPlugin) {
        confirmMessage = `プラグイン「${plugin.name}」は既に存在します（ID: ${plugin.id}）。\n\n上書き保存しますか？`;
      } else {
        confirmMessage = `プラグイン「${plugin.name}」を新規作成しますか？`;
      }

      const confirmed = confirm(confirmMessage);
      if (!confirmed) {
        return;
      }

      // 既存プラグイン（IDが重複）の場合は先に削除してから保存
      if (isExistingPlugin) {
        await chrome.runtime.sendMessage({
          type: 'DELETE_PLUGIN',
          pluginId: plugin.id,
        });
      }

      // 新しいプラグインを保存
      await chrome.runtime.sendMessage({
        type: 'SAVE_PLUGIN',
        plugin,
      });

      // 承認されたメッセージのpluginModeを'applied'に変更
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, pluginMode: 'applied' as const }
            : msg
        )
      );

      // 成功メッセージを追加
      addMessage(
        'assistant',
        isExistingPlugin
          ? `プラグイン「${plugin.name}」を更新しました。`
          : `プラグイン「${plugin.name}」を保存しました。有効化して使用してください。`
      );

      setSelectedElement(null);
      onClearSelectedPlugin();

      // プラグインIDリストを再読み込み
      await loadExistingPluginIds();
    } catch (error) {
      addMessage('assistant', `プラグインの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // プラグイン拒否
  const handleReject = (messageId: string) => {
    // 拒否されたメッセージを削除
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    addMessage('assistant', 'プラグインの生成をキャンセルしました。別の要望があればお聞かせください。');
  };

  // 編集モード終了
  const handleDismissEdit = (messageId: string) => {
    // 編集モードのメッセージを削除
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    onClearSelectedPlugin();
  };

  // プラグイン適用を元に戻す
  const handleUndo = async (plugin: Plugin, messageId: string) => {
    try {
      const confirmed = confirm(`プラグイン「${plugin.name}」を削除して、適用前の状態に戻しますか？`);
      if (!confirmed) {
        return;
      }

      // プラグインを削除
      await chrome.runtime.sendMessage({
        type: 'DELETE_PLUGIN',
        pluginId: plugin.id,
      });

      // メッセージの状態を 'preview' に戻す
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, pluginMode: 'preview' as const }
            : msg
        )
      );

      addMessage('assistant', `プラグイン「${plugin.name}」を削除しました。`);

      // プラグインIDリストを再読み込み
      await loadExistingPluginIds();
    } catch (error) {
      addMessage('assistant', `プラグインの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}>
        {messages.map((message) => (
          <div key={message.id}>
            <MessageItem message={message} />
            {/* プラグイン情報があればカード表示 */}
            {message.plugin && message.pluginMode && (
              <div style={{ padding: '0 16px 12px 16px' }}>
                <PluginCard
                  plugin={message.plugin}
                  mode={message.pluginMode}
                  onApprove={message.pluginMode === 'preview' ? (plugin) => handleApprove(plugin, message.id) : undefined}
                  onReject={message.pluginMode === 'preview' ? () => handleReject(message.id) : undefined}
                  onDismiss={message.pluginMode === 'editing' ? () => handleDismissEdit(message.id) : undefined}
                  onUndo={message.pluginMode === 'applied' ? () => handleUndo(message.plugin!, message.id) : undefined}
                  isConfirmed={message.isConfirmed}
                />
              </div>
            )}
          </div>
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

      {/* 入力エリア */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid #d0d7de',
          backgroundColor: '#f6f8fa',
        }}
      >
        {selectedPluginForEdit && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '8px',
              backgroundColor: '#fff8c5',
              border: '1px solid #d4a72c',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              編集中: <strong>{selectedPluginForEdit.name}</strong>
            </span>
            <button
              onClick={onClearSelectedPlugin}
              style={{
                padding: '2px 8px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                color: '#9a6700',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}

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
            onClick={toggleElementSelection}
            title={isSelectingElement ? '要素選択をキャンセル' : '要素を選択'}
            style={{
              padding: '8px',
              fontSize: '13px',
              backgroundColor: isSelectingElement ? '#0969da' : 'white',
              color: isSelectingElement ? 'white' : '#24292f',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isSelectingElement) {
                e.currentTarget.style.backgroundColor = '#f6f8fa';
                e.currentTarget.style.borderColor = '#0969da';
                e.currentTarget.style.color = '#0969da';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelectingElement) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d0d7de';
                e.currentTarget.style.color = '#24292f';
              }
            }}
          >
            <FiMousePointer size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力してください..."
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IoSend size={16} />
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
