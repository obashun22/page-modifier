/**
 * Page Modifier - Main App Component
 *
 * Side Panel メインアプリケーション
 */

import { useState } from 'react';
import NavigationBar from './components/NavigationBar';
import ChatView from './components/ChatView';
import PluginManagementView from './components/PluginManagementView';
import SettingsPanel from './components/SettingsPanel';
import type { Plugin } from '../shared/types';

type View = 'chat' | 'plugins' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [selectedPluginForEdit, setSelectedPluginForEdit] = useState<Plugin | null>(null);

  // プラグインを編集モードでチャットに持っていく
  const handleEditPlugin = (plugin: Plugin) => {
    setSelectedPluginForEdit(plugin);
    setCurrentView('chat');
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-300 bg-gray-50">
        <h1 className="m-0 text-xl font-semibold">Page Modifier</h1>
        <p className="mt-1 text-[13px] text-gray-600">
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
        {currentView === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

export default App;
