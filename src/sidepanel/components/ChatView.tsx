/**
 * Page Modifier - Chat View Component
 *
 * チャットビュー（メインチャット画面）
 */

import { useState, useEffect, useRef } from 'react';
import { IoSend } from 'react-icons/io5';
import { FiMousePointer, FiPlus } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import MessageItem from './MessageItem';
import PluginCard from './PluginCard';
import { chatWithAI } from '../services/ai-service';
import type { Plugin } from '../../shared/types';
import type { ChatItem, ChatMessage, ChatPlugin, ChatPluginMode, ElementInfo } from '../../shared/chat-types';

interface ChatViewProps {
  selectedPluginForEdit: Plugin | null;
  onClearSelectedPlugin: () => void;
}

const STORAGE_KEY = 'page_modifier_chat_history';
const STORAGE_VERSION_KEY = 'page_modifier_chat_version';
const CURRENT_VERSION = '2'; // roleフィールド追加版
const SCROLL_POSITION_KEY = 'page_modifier_chat_scroll_position';

const getInitialChatItems = (): ChatItem[] => {
  return [
    {
      type: 'message',
      id: '0',
      role: 'assistant',
      content: 'こんにちは！Page Modifierへようこそ。\n\nWebページに機能を追加したい場合は具体的な要望を教えてください。使い方や機能について知りたい場合は、お気軽に質問してください。',
      timestamp: Date.now(),
    },
  ];
};

export default function ChatView({ selectedPluginForEdit, onClearSelectedPlugin }: ChatViewProps) {
  const [chatItems, setChatItems] = useState<ChatItem[]>(() => {
    // localStorageから履歴を読み込む（バージョン管理付き）
    try {
      const savedVersion = localStorage.getItem(STORAGE_VERSION_KEY);

      // バージョンが異なる場合は古いデータをクリア
      if (savedVersion !== CURRENT_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
        return getInitialChatItems();
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // エラー時は安全のためクリア
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_VERSION_KEY);
    }
    return getInitialChatItems();
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

  // チャットアイテムの自動スクロール（新しいアイテムが追加された時のみ）
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatItems]);

  // チャット履歴をlocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatItems));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }, [chatItems]);

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

  /**
   * プラグインにIDを確保（IDがない場合はUUIDを生成）
   */
  const ensurePluginId = (plugin: Plugin): Plugin => {
    if (!plugin.id) {
      return { ...plugin, id: uuidv4() };
    }
    return plugin;
  };

  // プラグイン一覧から編集対象プラグインが持ち込まれた時
  useEffect(() => {
    if (selectedPluginForEdit) {
      const pluginWithId = ensurePluginId(selectedPluginForEdit);
      const pluginItem: ChatPlugin = {
        type: 'plugin',
        id: Date.now().toString(),
        plugin: pluginWithId,
        mode: 'referencing',
        role: 'user',  // ユーザーが選択したプラグイン
        timestamp: Date.now(),
      };
      setChatItems((prev) => [...prev, pluginItem]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPluginForEdit?.id]); // IDが変わった時のみ実行

  // 要素選択の結果を受信
  useEffect(() => {
    const listener = async (message: any) => {
      if (message.type === 'ELEMENT_SELECTED') {
        const elementInfo: ElementInfo = {
          selector: message.selector,
          tagName: message.tagName,
          className: message.className,
          id: message.id,
        };

        setSelectedElements((prev) => [...prev, elementInfo]);

        // 要素を選択したら選択モードを終了
        setIsSelectingElement(false);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'STOP_ELEMENT_SELECTION',
          });
        }
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
    setChatItems(getInitialChatItems());
    setSelectedElements([]);
    setIsSelectingElement(false);
    onClearSelectedPlugin();
  };

  // メッセージ追加
  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: ChatMessage = {
      type: 'message',
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    };

    setChatItems((prev) => [...prev, message]);
  };

  // メッセージ送信
  const sendMessage = async () => {
    if (!input.trim()) return;

    // メッセージ送信時に、referencing モードのプラグインを referenced に変更
    setChatItems((prev) =>
      prev.map((item) =>
        item.type === 'plugin' && item.mode === 'referencing'
          ? { ...item, mode: 'referenced' as const }
          : item
      )
    );

    const userMessage: ChatMessage = {
      type: 'message',
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setChatItems((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // AI APIを呼び出してチャット（チャット履歴全体を渡す）
      const response = await chatWithAI(input, chatItems, selectedElements, selectedPluginForEdit);

      if (response.type === 'text') {
        // 通常のテキスト応答
        const assistantMessage: ChatMessage = {
          type: 'message',
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        };

        setChatItems((prev) => [...prev, assistantMessage]);
      } else if (response.type === 'plugin') {
        // プラグイン生成レスポンス
        const isEditing = selectedPluginForEdit !== null;
        const pluginWithId = ensurePluginId(response.plugin);
        const pluginItem: ChatPlugin = {
          type: 'plugin',
          id: (Date.now() + 1).toString(),
          plugin: pluginWithId,
          mode: isEditing ? 'update_preview' : 'add_preview',
          role: 'assistant',  // AIが生成したプラグイン
          timestamp: Date.now(),
        };

        setChatItems((prev) => [...prev, pluginItem]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        type: 'message',
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      };

      setChatItems((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // プラグイン承認
  const handleApprove = async (plugin: Plugin, messageId: string) => {
    try {
      // IDが重複しているかどうかで既存プラグインかどうかを判定
      const isExistingPlugin = existingPluginIds.has(plugin.id);

      // 既存プラグイン（IDが重複）の場合は確認ダイアログを表示
      if (isExistingPlugin) {
        const confirmed = confirm(`プラグイン「${plugin.name}」は既に存在します（ID: ${plugin.id}）。\n\n上書き保存しますか？`);
        if (!confirmed) {
          return;
        }

        // 既存プラグインを削除してから保存
        await chrome.runtime.sendMessage({
          type: 'DELETE_PLUGIN',
          pluginId: plugin.id,
        });
      }

      // 新しいプラグインを保存
      await chrome.runtime.sendMessage({
        type: 'SAVE_PLUGIN',
        plugin,
        enabled: true,
      });

      // 承認されたプラグインのモードを 'added' または 'updated' に変更
      setChatItems((prev) =>
        prev.map((item) => {
          if (item.type === 'plugin' && item.id === messageId) {
            const newMode: ChatPluginMode = item.mode === 'update_preview' ? 'updated' : 'added';
            return { ...item, mode: newMode };
          }
          return item;
        })
      );

      setSelectedElements([]);
      onClearSelectedPlugin();

      // プラグインIDリストを再読み込み
      await loadExistingPluginIds();

      // タブをリロード
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      addMessage('assistant', `プラグインの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // プラグイン拒否
  const handleReject = (itemId: string) => {
    // 拒否されたプラグインを削除
    setChatItems((prev) => prev.filter((item) => item.id !== itemId));

    addMessage('assistant', 'プラグインの生成をキャンセルしました。別の要望があればお聞かせください。');
  };

  // 編集モード終了（referencingプラグインの削除）
  const handleDismissEdit = (itemId: string) => {
    // 参照中のプラグインを削除
    setChatItems((prev) => prev.filter((item) => item.id !== itemId));
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

      // プラグインの状態をプレビューに戻す
      setChatItems((prev) =>
        prev.map((item) => {
          if (item.type === 'plugin' && item.id === messageId) {
            const newMode: ChatPluginMode =
              item.mode === 'updated' ? 'update_preview' : 'add_preview';
            return { ...item, mode: newMode };
          }
          return item;
        })
      );

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
    <div className="h-full flex flex-col">
      {/* メッセージリスト */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        {chatItems.map((item) => {
          if (item.type === 'message') {
            return <MessageItem key={item.id} message={item} />;
          } else {
            // プラグインカード
            const isPreview = item.mode === 'add_preview' || item.mode === 'update_preview';
            const isApplied = item.mode === 'added' || item.mode === 'updated';
            const isReferencing = item.mode === 'referencing';

            return (
              <div key={item.id} className="px-4 pb-3">
                <PluginCard
                  plugin={item.plugin}
                  mode={item.mode}
                  onApprove={isPreview ? (plugin) => handleApprove(plugin, item.id) : undefined}
                  onReject={isPreview ? () => handleReject(item.id) : undefined}
                  onDismiss={isReferencing ? () => handleDismissEdit(item.id) : undefined}
                  onUndo={isApplied ? () => handleUndo(item.plugin, item.id) : undefined}
                />
              </div>
            );
          }
        })}

        {isLoading && (
          <div className="py-3 px-4 flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span className="text-xl">🤖</span>
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600 dark:bg-gray-400 animate-bounce-loading" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600 dark:bg-gray-400 animate-bounce-loading-delay-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600 dark:bg-gray-400 animate-bounce-loading-delay-2" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="p-3 border-t border-github-gray-300 dark:border-gray-700 bg-github-gray-50 dark:bg-gray-800">
        {selectedElements.map((element, index) => (
          <div
            key={index}
            className="px-3 py-2 mb-2 bg-github-blue-50 dark:bg-github-blue-900 border border-github-blue-400 dark:border-github-blue-600 rounded-md text-xs flex items-center justify-between"
          >
            <code className="font-mono text-[11px] flex-1 text-gray-900 dark:text-gray-100">
              {element.selector}
            </code>
            <button
              onClick={() => setSelectedElements((prev) => prev.filter((_, i) => i !== index))}
              className="px-1.5 py-0.5 text-[11px] bg-transparent text-github-blue-500 dark:text-github-blue-400 border-none cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="flex gap-2 mb-2 justify-between">
          <button
            onClick={toggleElementSelection}
            title={isSelectingElement ? '要素選択をキャンセル' : '要素を選択'}
            className={`p-2 text-[13px] border rounded-md cursor-pointer flex items-center justify-center transition-all ${
              isSelectingElement
                ? 'bg-github-blue-500 text-white border-github-blue-500'
                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-github-gray-300 dark:border-gray-600 hover:bg-github-gray-50 dark:hover:bg-gray-600 hover:border-github-blue-500 hover:text-github-blue-500'
            }`}
          >
            <FiMousePointer size={18} />
          </button>

          <button
            onClick={startNewChat}
            title="新しいチャット"
            className="p-2 text-[13px] bg-transparent text-gray-600 dark:text-gray-400 border-none rounded-md cursor-pointer flex items-center justify-center transition-all hover:text-gray-800 dark:hover:text-gray-200"
          >
            <FiPlus size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力してください..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={`px-4 py-2 text-sm text-white border-none rounded-md font-semibold flex items-center gap-1.5 ${
              !input.trim() || isLoading
                ? 'bg-gray-600 dark:bg-gray-700 cursor-not-allowed opacity-60'
                : 'bg-green-600 dark:bg-green-700 cursor-pointer hover:bg-green-700 dark:hover:bg-green-800'
            }`}
          >
            <IoSend size={16} />
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
