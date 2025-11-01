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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #d0d7de',
          backgroundColor: '#f6f8fa',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Page Modifier</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
          AIを使ってWebページをカスタマイズ
        </p>
      </div>

      {/* ナビゲーション */}
      <NavigationBar currentView={currentView} onViewChange={setCurrentView} />

      {/* コンテンツ */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
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
