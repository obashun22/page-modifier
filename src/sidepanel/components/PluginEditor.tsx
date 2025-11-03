/**
 * Page Modifier - Plugin Editor Component
 *
 * プラグイン編集コンポーネント
 */

import { useState } from 'react';
import { FaSave } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import type { Plugin } from '../../shared/types';
import type { PluginData } from '../../shared/storage-types';

interface PluginEditorProps {
  pluginData: PluginData;
  onSave: (plugin: Plugin) => void;
  onCancel: () => void;
}

export default function PluginEditor({ pluginData, onSave, onCancel }: PluginEditorProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(pluginData.plugin, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const plugin = JSON.parse(jsonText);
      setError(null);
      onSave(plugin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="m-0 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          プラグイン編集: {pluginData.plugin.name}
        </h2>
        <p className="m-0 text-[13px] text-gray-600 dark:text-gray-400">
          JSON形式で直接編集できます。保存前にバリデーションが実行されます。
        </p>
      </div>

      {error && (
        <div className="p-3 mb-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-200 text-[13px]">
          <strong>エラー:</strong> {error}
        </div>
      )}

      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        className="flex-1 p-3 font-mono text-[13px] border border-gray-300 dark:border-gray-600 rounded-md resize-none min-h-[400px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        spellCheck={false}
      />

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-green-600 dark:bg-green-700 text-white border-none rounded-md cursor-pointer font-semibold flex items-center gap-1.5 hover:bg-green-700 dark:hover:bg-green-800"
        >
          <FaSave size={14} />
          保存
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <IoClose size={16} />
          キャンセル
        </button>
      </div>
    </div>
  );
}
