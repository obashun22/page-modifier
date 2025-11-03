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

  // ダークモード状態をdocument.documentElementに反映
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

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
          <PluginManagementView onEditPlugin={handleEditPlugin} />
        )}
        {currentView === 'settings' && (
          <SettingsPanel isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
        )}
      </div>
    </div>
  );
}

export default App;
