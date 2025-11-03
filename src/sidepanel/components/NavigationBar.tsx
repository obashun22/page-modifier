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
        ? 'bg-white dark:bg-gray-800 text-github-blue-500 dark:text-github-blue-400 border-b-2 border-github-blue-500 dark:border-github-blue-400'
        : 'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-300 border-b-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;
  };

  return (
    <div className="flex border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
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
