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
  const getButtonClasses = (view: string) => {
    const isActive = currentView === view;
    return `flex-1 p-3 text-sm font-medium border-none cursor-pointer ${
      isActive
        ? 'bg-white text-github-blue-500 border-b-2 border-blue-600'
        : 'bg-gray-50 text-gray-800 border-b-2 border-transparent'
    }`;
  };

  return (
    <div className="flex border-b border-gray-300 bg-white">
      <button onClick={() => onViewChange('chat')} className={getButtonClasses('chat')}>
        💬 チャット
      </button>
      <button onClick={() => onViewChange('plugins')} className={getButtonClasses('plugins')}>
        🔧 プラグイン
      </button>
      <button onClick={() => onViewChange('settings')} className={getButtonClasses('settings')}>
        ⚙️ 設定
      </button>
    </div>
  );
}
