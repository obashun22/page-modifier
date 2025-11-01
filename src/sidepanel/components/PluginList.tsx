/**
 * Page Modifier - Plugin List Component
 *
 * プラグイン一覧表示コンポーネント
 */

import { FiMessageSquare, FiEdit3, FiDownload, FiTrash2 } from 'react-icons/fi';
import { MdToggleOn, MdToggleOff } from 'react-icons/md';
import type { PluginData } from '../../shared/storage-types';
import type { Plugin } from '../../shared/types';

interface PluginListProps {
  plugins: PluginData[];
  onPluginSelect: (plugin: PluginData) => void;
  onPluginDelete: (pluginId: string) => void;
  onPluginToggle: (pluginId: string, enabled: boolean) => void;
  onPluginExport: (pluginId: string) => void;
  onPluginEdit: (plugin: Plugin) => void;
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
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666', flex: 1, overflowY: 'auto' }}>
        <p>プラグインがありません</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          チャットでプラグインを作成するか、JSONファイルをインポートしてください
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
      {plugins.map((pluginData) => (
        <div
          key={pluginData.plugin.id}
          style={{
            padding: '16px',
            marginBottom: '12px',
            backgroundColor: '#f6f8fa',
            borderRadius: '8px',
            border: '1px solid #d0d7de',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                  {pluginData.plugin.name}
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    fontSize: '12px',
                    backgroundColor: pluginData.enabled ? '#28a745' : '#6c757d',
                    color: 'white',
                    borderRadius: '12px',
                  }}
                >
                  {pluginData.enabled ? '有効' : '無効'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                {pluginData.plugin.description || 'No description'}
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                <span>v{pluginData.plugin.version}</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <span>{pluginData.plugin.operations.length} operations</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <span>Priority: {pluginData.plugin.priority}</span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#888' }}>
                Domains: {pluginData.plugin.targetDomains.join(', ')}
              </div>
              {pluginData.usageCount > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#888' }}>
                  使用回数: {pluginData.usageCount}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onPluginEdit(pluginData.plugin)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#0969da',
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
              <FiMessageSquare size={14} />
              チャットで編集
            </button>
            <button
              onClick={() => onPluginSelect(pluginData)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
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
              <FiEdit3 size={14} />
              JSON編集
            </button>
            <button
              onClick={() => onPluginToggle(pluginData.plugin.id, !pluginData.enabled)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: pluginData.enabled ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {pluginData.enabled ? (
                <>
                  <MdToggleOff size={16} />
                  無効化
                </>
              ) : (
                <>
                  <MdToggleOn size={16} />
                  有効化
                </>
              )}
            </button>
            <button
              onClick={() => onPluginExport(pluginData.plugin.id)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
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
              <FiDownload size={14} />
              エクスポート
            </button>
            <button
              onClick={() => onPluginDelete(pluginData.plugin.id)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FiTrash2 size={14} />
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
