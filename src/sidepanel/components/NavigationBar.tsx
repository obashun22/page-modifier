/**
 * Page Modifier - Navigation Bar Component
 *
 * ビュー切り替えナビゲーションバー
 */

interface NavigationBarProps {
  currentView: 'chat' | 'plugins' | 'settings';
  onViewChange: (view: 'chat' | 'plugins' | 'settings') => void;
}

export default function NavigationBar({ currentView, onViewChange }: NavigationBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid #d0d7de',
        backgroundColor: 'white',
      }}
    >
      <button
        onClick={() => onViewChange('chat')}
        style={{
          flex: 1,
          padding: '12px',
          fontSize: '14px',
          fontWeight: 500,
          backgroundColor: currentView === 'chat' ? 'white' : '#f6f8fa',
          color: currentView === 'chat' ? '#0969da' : '#24292f',
          border: 'none',
          borderBottom: currentView === 'chat' ? '2px solid #0969da' : '2px solid transparent',
          cursor: 'pointer',
        }}
      >
        💬 チャット
      </button>
      <button
        onClick={() => onViewChange('plugins')}
        style={{
          flex: 1,
          padding: '12px',
          fontSize: '14px',
          fontWeight: 500,
          backgroundColor: currentView === 'plugins' ? 'white' : '#f6f8fa',
          color: currentView === 'plugins' ? '#0969da' : '#24292f',
          border: 'none',
          borderBottom: currentView === 'plugins' ? '2px solid #0969da' : '2px solid transparent',
          cursor: 'pointer',
        }}
      >
        🔧 プラグイン
      </button>
      <button
        onClick={() => onViewChange('settings')}
        style={{
          flex: 1,
          padding: '12px',
          fontSize: '14px',
          fontWeight: 500,
          backgroundColor: currentView === 'settings' ? 'white' : '#f6f8fa',
          color: currentView === 'settings' ? '#0969da' : '#24292f',
          border: 'none',
          borderBottom: currentView === 'settings' ? '2px solid #0969da' : '2px solid transparent',
          cursor: 'pointer',
        }}
      >
        ⚙️ 設定
      </button>
    </div>
  );
}
