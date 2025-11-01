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
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
          プラグイン編集: {pluginData.plugin.name}
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
          JSON形式で直接編集できます。保存前にバリデーションが実行されます。
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            color: '#856404',
            fontSize: '13px',
          }}
        >
          <strong>エラー:</strong> {error}
        </div>
      )}

      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        style={{
          flex: 1,
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '13px',
          border: '1px solid #d0d7de',
          borderRadius: '6px',
          resize: 'none',
          minHeight: '400px',
        }}
        spellCheck={false}
      />

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FaSave size={14} />
          保存
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: 'white',
            color: '#24292f',
            border: '1px solid #d0d7de',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IoClose size={16} />
          キャンセル
        </button>
      </div>
    </div>
  );
}
