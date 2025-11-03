/**
 * Page Modifier - Plugin List Component
 *
 * プラグイン一覧表示コンポーネント
 */

import { useState } from 'react';
import { FiMessageSquare, FiEdit3, FiUpload, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
}

interface PluginItemProps {
  pluginData: PluginData;
  onPluginSelect: (plugin: PluginData) => void;
  onPluginDelete: (pluginId: string) => void;
  onPluginToggle: (pluginId: string, enabled: boolean) => void;
  onPluginExport: (pluginId: string) => void;
  onPluginEdit: (plugin: Plugin) => void;
}

function PluginItem({
  pluginData,
  onPluginSelect,
  onPluginDelete,
  onPluginToggle,
  onPluginExport,
  onPluginEdit,
}: PluginItemProps) {
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);

  return (
    <div className="p-4 mb-3 bg-gray-50 rounded-lg border border-gray-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="m-0 text-base font-semibold">
              {pluginData.plugin.name}
            </h3>
            <p className="mt-1 text-[13px] text-gray-600">
              {pluginData.plugin.description || 'No description'}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              Plugin ID: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">
                {pluginData.plugin.id}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-gray-500">
              対象ドメイン: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded">
                {pluginData.plugin.targetDomains.join(', ')}
              </span>
            </div>
            {/* 操作内容（ドロップダウン） */}
            <div
              onClick={() => setIsOperationsOpen(!isOperationsOpen)}
              className="mt-1.5 cursor-pointer flex items-center gap-1 text-xs text-gray-500"
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
          <div className="mt-2 py-3 bg-gray-50 rounded-md">
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
            className="p-0 w-8 h-8 bg-blue-600 text-white border-none rounded-full cursor-pointer flex items-center justify-center"
            title="チャットで編集"
          >
            <FiMessageSquare size={16} />
          </button>
          <button
            onClick={() => onPluginSelect(pluginData)}
            className="p-0 w-8 h-8 bg-white text-gray-800 border border-gray-300 rounded-full cursor-pointer flex items-center justify-center"
            title="JSON編集"
          >
            <FiEdit3 size={16} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onPluginExport(pluginData.plugin.id)}
            className="p-0 w-8 h-8 bg-white text-gray-800 border border-gray-300 rounded-full cursor-pointer flex items-center justify-center"
            title="エクスポート"
          >
            <FiUpload size={16} />
          </button>
          <button
            onClick={() => onPluginDelete(pluginData.plugin.id)}
            className="p-0 w-8 h-8 bg-white text-red-600 border border-gray-300 rounded-full cursor-pointer flex items-center justify-center"
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
}: PluginListProps) {
  if (plugins.length === 0) {
    return (
      <div className="py-10 px-5 text-center text-gray-600 flex-1 overflow-y-auto">
        <p>プラグインがありません</p>
        <p className="text-sm mt-2">
          チャットでプラグインを作成するか、JSONファイルをインポートしてください
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 flex-1 overflow-y-auto">
      {plugins.map((pluginData) => (
        <PluginItem
          key={pluginData.plugin.id}
          pluginData={pluginData}
          onPluginSelect={onPluginSelect}
          onPluginDelete={onPluginDelete}
          onPluginToggle={onPluginToggle}
          onPluginExport={onPluginExport}
          onPluginEdit={onPluginEdit}
        />
      ))}
    </div>
  );
}
