/**
 * Page Modifier - Plugin List Component
 *
 * プラグイン一覧表示コンポーネント
 */

import { useState } from 'react';
import { FiMessageSquare, FiEdit3, FiUpload, FiTrash2, FiChevronDown, FiChevronUp, FiDownload } from 'react-icons/fi';
import { MdToggleOn, MdToggleOff } from 'react-icons/md';
import type { PluginData } from '../../shared/storage-types';
import type { Plugin } from '../../shared/types';
import OperationItem from './OperationItem';

interface PluginListProps {
  plugins: PluginData[];
  onPluginSelect: (plugin: PluginData) => void;
  onPluginDelete: (pluginId: string) => void;
  onPluginToggle: (pluginId: string, enabled: boolean) => void;
  onPluginExport: (pluginId: string) => void;
  onPluginEdit: (plugin: Plugin) => void;
  onImport: () => void;
  importing: boolean;
  autoApplyPlugins: boolean;
  onToggleAutoApply: (enabled: boolean) => void;
}

interface PluginItemProps {
  pluginData: PluginData;
  onPluginSelect: (plugin: PluginData) => void;
  onPluginDelete: (pluginId: string) => void;
  onPluginToggle: (pluginId: string, enabled: boolean) => void;
  onPluginExport: (pluginId: string) => void;
  onPluginEdit: (plugin: Plugin) => void;
  autoApplyPlugins: boolean;
}

function PluginItem({
  pluginData,
  onPluginSelect,
  onPluginDelete,
  onPluginToggle,
  onPluginExport,
  onPluginEdit,
  autoApplyPlugins,
}: PluginItemProps) {
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);

  return (
    <div className={`p-4 mb-3 bg-github-gray-50 dark:bg-gray-800 rounded-lg border border-github-gray-300 dark:border-gray-700 ${!autoApplyPlugins ? 'opacity-40' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="m-0 text-base font-semibold text-gray-900 dark:text-gray-100">
              {pluginData.plugin.name}
            </h3>
            <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
              {pluginData.plugin.description || 'No description'}
            </p>
            <div className="mt-2 text-xs text-github-gray-400 dark:text-gray-400">
              Plugin ID: <span className="font-mono bg-github-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-200">
                {pluginData.plugin.id}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-github-gray-400 dark:text-gray-400">
              Domain: <span className="font-mono bg-github-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-200">
                {pluginData.plugin.targetDomains.join(', ')}
              </span>
            </div>
            {/* 操作内容（ドロップダウン） */}
            <div
              onClick={() => setIsOperationsOpen(!isOperationsOpen)}
              className="mt-1.5 cursor-pointer flex items-center gap-1 text-xs text-github-gray-400 dark:text-gray-400"
            >
              <span className="underline">{pluginData.plugin.operations.length} operations</span>
              {isOperationsOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </div>
          </div>
          <div className="ml-3 flex gap-1 items-center">
            {/* トグルボタン */}
          <button
            onClick={() => onPluginToggle(pluginData.plugin.id, !pluginData.enabled)}
            className="p-0 w-12 h-7 bg-transparent border-none cursor-pointer flex items-center justify-center"
            title={pluginData.enabled ? '無効化' : '有効化'}
          >
            {pluginData.enabled ? (
              <MdToggleOn size={48} color="#28a745" />
            ) : (
              <MdToggleOff size={48} color="#6c757d" />
            )}
          </button>
        </div>
      </div>

        {isOperationsOpen && (
          <div className="mt-2 py-3 bg-github-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex flex-col gap-2">
              {pluginData.plugin.operations.map((op, opIndex) => (
                <OperationItem key={opIndex} operation={op} />
              ))}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => onPluginEdit(pluginData.plugin)}
            className="p-0 w-8 h-8 bg-github-blue-500 dark:bg-github-blue-600 text-white border-none rounded-full cursor-pointer flex items-center justify-center hover:bg-github-blue-600 dark:hover:bg-github-blue-700"
            title="チャットで編集"
          >
            <FiMessageSquare size={16} />
          </button>
          <button
            onClick={() => onPluginSelect(pluginData)}
            className="p-0 w-8 h-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-full cursor-pointer flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600"
            title="JSON編集"
          >
            <FiEdit3 size={16} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onPluginExport(pluginData.plugin.id)}
            className="p-0 w-8 h-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-full cursor-pointer flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600"
            title="エクスポート"
          >
            <FiUpload size={16} />
          </button>
          <button
            onClick={() => onPluginDelete(pluginData.plugin.id)}
            className="p-0 w-8 h-8 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border border-gray-300 dark:border-gray-600 rounded-full cursor-pointer flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600"
            title="削除"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
    </div>
  );
}

export default function PluginList({
  plugins,
  onPluginSelect,
  onPluginDelete,
  onPluginToggle,
  onPluginExport,
  onPluginEdit,
  onImport,
  importing,
  autoApplyPlugins,
  onToggleAutoApply,
}: PluginListProps) {
  if (plugins.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-3 flex justify-between items-center">
          {/* 全体スイッチ */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleAutoApply(!autoApplyPlugins)}
              className="p-0 w-12 h-7 bg-transparent border-none cursor-pointer flex items-center justify-center"
              title={autoApplyPlugins ? 'すべてのプラグインを無効化' : 'すべてのプラグインを有効化'}
            >
              {autoApplyPlugins ? (
                <MdToggleOn size={48} color="#28a745" />
              ) : (
                <MdToggleOff size={48} color="#6c757d" />
              )}
            </button>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              すべて
            </span>
          </div>

          {/* インポートボタン */}
          <button
            onClick={onImport}
            disabled={importing}
            className={`px-4 py-2 text-sm bg-github-blue-500 dark:bg-github-blue-600 text-white border-none rounded-md font-semibold flex items-center gap-2 hover:bg-github-blue-600 dark:hover:bg-github-blue-700 ${
              importing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
          >
            <FiDownload size={16} />
            {importing ? 'インポート中...' : 'インポート'}
          </button>
        </div>
        <div className="py-10 px-5 text-center text-github-gray-600">
          <p>プラグインがありません</p>
          <p className="text-sm mt-2">
            チャットでプラグインを作成するか、JSONファイルをインポートしてください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 pt-3 flex justify-between items-center">
        {/* 全体スイッチ */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAutoApply(!autoApplyPlugins)}
            className="p-0 w-12 h-7 bg-transparent border-none cursor-pointer flex items-center justify-center"
            title={autoApplyPlugins ? 'すべてのプラグインを無効化' : 'すべてのプラグインを有効化'}
          >
            {autoApplyPlugins ? (
              <MdToggleOn size={48} color="#28a745" />
            ) : (
              <MdToggleOff size={48} color="#6c757d" />
            )}
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            すべて
          </span>
        </div>

        {/* インポートボタン */}
        <button
          onClick={onImport}
          disabled={importing}
          className={`px-4 py-2 text-sm bg-github-blue-500 dark:bg-github-blue-600 text-white border-none rounded-md font-semibold flex items-center gap-2 hover:bg-github-blue-600 dark:hover:bg-github-blue-700 ${
            importing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          <FiDownload size={16} />
          {importing ? 'インポート中...' : 'インポート'}
        </button>
      </div>
      <div className="p-3">
        {plugins.map((pluginData) => (
          <PluginItem
            key={pluginData.plugin.id}
            pluginData={pluginData}
            onPluginSelect={onPluginSelect}
            onPluginDelete={onPluginDelete}
            onPluginToggle={onPluginToggle}
            onPluginExport={onPluginExport}
            onPluginEdit={onPluginEdit}
            autoApplyPlugins={autoApplyPlugins}
          />
        ))}
      </div>
    </div>
  );
}
