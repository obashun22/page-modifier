/**
 * Page Modifier - Main App Component
 *
 * Side Panel メインアプリケーション
 */

import { useState, useEffect } from 'react';
import NavigationBar from './components/NavigationBar';
import ChatView from './components/ChatView';
import PluginManagementView from './components/PluginManagementView';
import SettingsPanel from './components/SettingsPanel';
import type { Plugin } from '../shared/types';

type View = 'chat' | 'plugins' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [selectedPluginForEdit, setSelectedPluginForEdit] = useState<Plugin | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // 初期値をlocalStorageから取得
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [cspBlockedPlugins, setCSPBlockedPlugins] = useState<Array<{id: string, name: string}>>([]);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');

  // ダークモード状態をdocument.documentElementに反映
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // ブラウザのタブ切り替えを監視（グローバル）
  useEffect(() => {
    const loadCurrentTabUrl = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        setCurrentTabUrl(tab?.url || '');
        console.log('[App] Tab URL updated:', tab?.url);
      } catch (error) {
        console.error('Failed to get current tab URL:', error);
        setCurrentTabUrl('');
      }
    };

    loadCurrentTabUrl();

    // 初回ロード時にCSPチェックを要求
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CHECK_CSP_STATUS' }).catch(() => {
          // エラーは無視（Content Scriptが読み込まれていない可能性）
        });
      }
    });

    // タブの切り替えを監視
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      console.log('[App] Tab activated:', activeInfo);
      loadCurrentTabUrl();
      // タブ切り替え時にCSP情報をクリア
      setCSPBlockedPlugins([]);
      // 新しいタブでCSP状態をチェック
      chrome.tabs.sendMessage(activeInfo.tabId, { type: 'CHECK_CSP_STATUS' }).catch(() => {
        // エラーは無視（Content Scriptが読み込まれていない可能性）
      });
    };

    // タブのURL変更を監視
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab) => {
      // URLが変更された場合のみ
      if (changeInfo.url) {
        console.log('[App] Tab URL updated:', changeInfo.url);
        // アクティブなタブの場合のみ更新
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id === tabId) {
            loadCurrentTabUrl();
            // URL変更時にCSP情報をクリア
            setCSPBlockedPlugins([]);
            // 新しいページでCSP状態をチェック
            chrome.tabs.sendMessage(tabId, { type: 'CHECK_CSP_STATUS' }).catch(() => {
              // エラーは無視（Content Scriptが読み込まれていない可能性）
            });
          }
        });
      }
    };

    // CSP警告メッセージを受信
    const handleMessage = (message: any) => {
      if (message.type === 'CSP_WARNING') {
        console.log('[App] CSP warning received:', message.plugins);
        setCSPBlockedPlugins(message.plugins);
      }
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // プラグインを編集モードでチャットに持っていく
  const handleEditPlugin = (plugin: Plugin) => {
    setSelectedPluginForEdit(plugin);
    setCurrentView('chat');
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h1 className="m-0 text-xl font-semibold text-gray-900 dark:text-gray-100">Page Modifier</h1>
        <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">
          AIを使ってWebページをカスタマイズ
        </p>
      </div>

      {/* ナビゲーション */}
      <NavigationBar currentView={currentView} onViewChange={setCurrentView} />

      {/* コンテンツ */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'chat' && (
          <ChatView
            selectedPluginForEdit={selectedPluginForEdit}
            onClearSelectedPlugin={() => setSelectedPluginForEdit(null)}
          />
        )}
        {currentView === 'plugins' && (
          <PluginManagementView
            onEditPlugin={handleEditPlugin}
            cspBlockedPlugins={cspBlockedPlugins}
            currentTabUrl={currentTabUrl}
          />
        )}
        {currentView === 'settings' && (
          <SettingsPanel isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
        )}
      </div>
    </div>
  );
}

export default App;
