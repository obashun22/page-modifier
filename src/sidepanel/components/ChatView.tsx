/**
 * Page Modifier - Chat View Component
 *
 * チャットビュー（メインチャット画面）
 */

import { useState, useEffect, useRef } from 'react';
import { IoSend } from 'react-icons/io5';
import { FiMousePointer, FiPlus } from 'react-icons/fi';
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

const STORAGE_KEY = 'page_modifier_chat_history';
const SCROLL_POSITION_KEY = 'page_modifier_chat_scroll_position';

const getInitialMessages = (): Message[] => {
  return [
    {
      id: '0',
      role: 'assistant',
      content: 'こんにちは！Page Modifierへようこそ。\n\nWebページに機能を追加したい場合は具体的な要望を教えてください。使い方や機能について知りたい場合は、お気軽に質問してください。\n\n既存のプラグインを編集したい場合は、プラグイン一覧から「💬 チャットで編集」ボタンでこのチャットに持ってくることができます。',
      timestamp: Date.now(),
    },
  ];
};

export default function ChatView({ selectedPluginForEdit, onClearSelectedPlugin }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // localStorageから履歴を読み込む
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialMessages();
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    return getInitialMessages();
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElements, setSelectedElements] = useState<ElementInfo[]>([]);
  const [existingPluginIds, setExistingPluginIds] = useState<Set<string>>(new Set());
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // スクロール位置を復元（初回マウント時のみ）
  useEffect(() => {
    if (messagesContainerRef.current) {
      try {
        const savedPosition = localStorage.getItem(SCROLL_POSITION_KEY);
        if (savedPosition) {
          messagesContainerRef.current.scrollTop = parseInt(savedPosition, 10);
        }
      } catch (error) {
        console.error('Failed to restore scroll position:', error);
      }
    }
  }, []);

  // メッセージリストの自動スクロール（新しいメッセージが追加された時のみ）
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージ履歴をlocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }, [messages]);

  // スクロール位置をlocalStorageに保存
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      try {
        localStorage.setItem(SCROLL_POSITION_KEY, container.scrollTop.toString());
      } catch (error) {
        console.error('Failed to save scroll position:', error);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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

        setSelectedElements((prev) => [...prev, elementInfo]);
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
    } else {
      // 開始
      await chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTION' });
      setIsSelectingElement(true);
    }
  };

  // 新しいチャットを開始
  const startNewChat = () => {
    setMessages(getInitialMessages());
    setSelectedElements([]);
    setIsSelectingElement(false);
    onClearSelectedPlugin();
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
      const response = await chatWithAI(input, selectedElements, selectedPluginForEdit);

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
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
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

      setSelectedElements([]);
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
      <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}>
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
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6e7781',
            }}
          >
            <span style={{ fontSize: '20px' }}>🤖</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#6e7781',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0s',
                }}
              />
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#6e7781',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0.16s',
                }}
              />
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#6e7781',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '0.32s',
                }}
              />
            </div>
            <style>{`
              @keyframes bounce {
                0%, 80%, 100% {
                  transform: translateY(0);
                  opacity: 0.5;
                }
                40% {
                  transform: translateY(-8px);
                  opacity: 1;
                }
              }
            `}</style>
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

        {selectedElements.length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '8px',
              backgroundColor: '#ddf4ff',
              border: '1px solid #54aeff',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selectedElements.length > 1 ? '8px' : 0 }}>
              <span style={{ fontWeight: 600 }}>
                選択中の要素: {selectedElements.length}個
              </span>
              <button
                onClick={() => setSelectedElements([])}
                style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  backgroundColor: 'transparent',
                  color: '#0969da',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                すべてクリア
              </button>
            </div>
            {selectedElements.map((element, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: index > 0 ? '4px' : 0 }}>
                <span>
                  {selectedElements.length > 1 && `${index + 1}. `}
                  <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>{element.selector}</code>
                </span>
                <button
                  onClick={() => setSelectedElements((prev) => prev.filter((_, i) => i !== index))}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    backgroundColor: 'transparent',
                    color: '#0969da',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', justifyContent: 'space-between' }}>
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

          <button
            onClick={startNewChat}
            title="新しいチャット"
            style={{
              padding: '8px',
              fontSize: '13px',
              backgroundColor: 'transparent',
              color: '#6e7781',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#24292f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6e7781';
            }}
          >
            <FiPlus size={18} />
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
