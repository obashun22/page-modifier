/**
 * Page Modifier - Plugin Preview Component
 *
 * プラグインプレビューコンポーネント
 */

import type { Plugin } from '../../shared/types';

interface PluginPreviewProps {
  plugin: Plugin;
  onApprove: (plugin: Plugin) => void;
  onReject: () => void;
}

export default function PluginPreview({ plugin, onApprove, onReject }: PluginPreviewProps) {
  return (
    <div className="p-4 border-t-2 border-github-blue-500 bg-gray-50 max-h-[300px] overflow-y-auto">
      <div className="mb-3">
        <h3 className="m-0 mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">
          {plugin.name}
        </h3>
        <p className="m-0 text-[13px] text-gray-600 dark:text-gray-400">
          {plugin.description || 'No description'}
        </p>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">
          <span>Version: {plugin.version}</span>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Domain: {plugin.targetDomains.join(', ')}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="m-0 mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
          操作内容 ({plugin.operations.length}件)
        </h4>
        <div className="flex flex-col gap-2">
          {plugin.operations.map((op, index) => (
            <div
              key={index}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-[13px]"
            >
              <div className="flex gap-2 mb-1">
                <span className="px-2 py-0.5 bg-github-blue-50 text-github-blue-500 rounded-xl text-[11px] font-semibold">
                  {op.type}
                </span>
                <code className="text-xs text-gray-600 font-mono">
                  {op.selector}
                </code>
              </div>
              {op.description && (
                <p className="m-0 text-xs text-gray-600 dark:text-gray-400">
                  {op.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onApprove(plugin)}
          className="flex-1 px-4 py-2 text-sm bg-green-600 text-white border-none rounded-md cursor-pointer font-semibold"
        >
          ✅ 適用する
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-4 py-2 text-sm bg-white text-gray-800 border border-gray-300 rounded-md cursor-pointer font-semibold"
        >
          ❌ キャンセル
        </button>
      </div>
    </div>
  );
}
