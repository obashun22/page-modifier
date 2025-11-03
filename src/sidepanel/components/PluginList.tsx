/**
 * Page Modifier - Plugin List Component
 *
 * プラグイン一覧表示コンポーネント
 */

import { useState } from 'react';
import { FiMessageSquare, FiEdit3, FiDownload, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
    <div
      style={{
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: '#f6f8fa',
        borderRadius: '8px',
        border: '1px solid #d0d7de',
      }}
    >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {pluginData.plugin.name}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
              {pluginData.plugin.description || 'No description'}
            </p>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              ID: <span style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                {pluginData.plugin.id}
              </span>
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#888' }}>
              Domains: <span style={{ fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                {pluginData.plugin.targetDomains.join(', ')}
              </span>
            </div>
          </div>
          <div style={{ marginLeft: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* トグルボタン */}
          <button
            onClick={() => onPluginToggle(pluginData.plugin.id, !pluginData.enabled)}
            style={{
              padding: 0,
              width: '48px',
              height: '28px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
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

        {/* 操作内容（ドロップダウン） */}
        <div
          onClick={() => setIsOperationsOpen(!isOperationsOpen)}
          style={{
            marginTop: '6px',
            padding: '8px 12px',
            backgroundColor: '#f6f8fa',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#888',
          }}
        >
          <span>{pluginData.plugin.operations.length} operations</span>
          {isOperationsOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </div>

        {isOperationsOpen && (
          <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f6f8fa', borderRadius: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pluginData.plugin.operations.map((op, opIndex) => (
                <div
                  key={opIndex}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #d0d7de',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#ddf4ff',
                        color: '#0969da',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {op.type}
                    </span>
                    <code
                      style={{
                        fontSize: '12px',
                        color: '#6e7781',
                        fontFamily: 'monospace',
                      }}
                    >
                      {op.selector}
                    </code>
                  </div>
                  {op.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#6e7781',
                      }}
                    >
                      {op.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => onPluginEdit(pluginData.plugin)}
            style={{
              padding: 0,
              width: '32px',
              height: '32px',
              backgroundColor: '#0969da',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="チャットで編集"
          >
            <FiMessageSquare size={16} />
          </button>
          <button
            onClick={() => onPluginSelect(pluginData)}
            style={{
              padding: 0,
              width: '32px',
              height: '32px',
              backgroundColor: 'white',
              color: '#24292f',
              border: '1px solid #d0d7de',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="JSON編集"
          >
            <FiEdit3 size={16} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => onPluginExport(pluginData.plugin.id)}
            style={{
              padding: 0,
              width: '32px',
              height: '32px',
              backgroundColor: 'white',
              color: '#24292f',
              border: '1px solid #d0d7de',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="エクスポート"
          >
            <FiDownload size={16} />
          </button>
          <button
            onClick={() => onPluginDelete(pluginData.plugin.id)}
            style={{
              padding: 0,
              width: '32px',
              height: '32px',
              backgroundColor: 'white',
              color: '#dc3545',
              border: '1px solid #d0d7de',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
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
