/**
 * Page Modifier - Plugin List Component
 *
 * プラグイン一覧表示コンポーネント
 */

import { useState } from 'react';
import { FiMessageSquare, FiEdit3, FiDownload, FiTrash2, FiChevronDown, FiChevronUp, FiArrowUp, FiArrowDown } from 'react-icons/fi';
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
  onPluginMove: (pluginId: string, newIndex: number) => void;
  togglingPlugins: Set<string>;
}

export default function PluginList({
  plugins,
  onPluginSelect,
  onPluginDelete,
  onPluginToggle,
  onPluginExport,
  onPluginEdit,
  onPluginMove,
  togglingPlugins,
}: PluginListProps) {
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());

  const toggleExpanded = (pluginId: string) => {
    setExpandedPlugins((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pluginId)) {
        newSet.delete(pluginId);
      } else {
        newSet.add(pluginId);
      }
      return newSet;
    });
  };

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
      {plugins.map((pluginData, index) => {
        const isExpanded = expandedPlugins.has(pluginData.plugin.id);
        return (
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                #{index + 1} {pluginData.plugin.name}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                {pluginData.plugin.description || 'No description'}
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                <span>v{pluginData.plugin.version}</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <span>{pluginData.plugin.operations.length} operations</span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#888' }}>
                Domains: {pluginData.plugin.targetDomains.join(', ')}
              </div>
            </div>
            <div style={{ marginLeft: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {/* 上移動ボタン */}
              <button
                onClick={() => onPluginMove(pluginData.plugin.id, Math.max(0, index - 1))}
                disabled={index === 0}
                style={{
                  padding: 0,
                  width: '28px',
                  height: '28px',
                  backgroundColor: 'white',
                  color: index === 0 ? '#d0d7de' : '#24292f',
                  border: '1px solid #d0d7de',
                  borderRadius: '4px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="上へ移動"
              >
                <FiArrowUp size={16} />
              </button>

              {/* 下移動ボタン */}
              <button
                onClick={() => onPluginMove(pluginData.plugin.id, Math.min(plugins.length - 1, index + 1))}
                disabled={index === plugins.length - 1}
                style={{
                  padding: 0,
                  width: '28px',
                  height: '28px',
                  backgroundColor: 'white',
                  color: index === plugins.length - 1 ? '#d0d7de' : '#24292f',
                  border: '1px solid #d0d7de',
                  borderRadius: '4px',
                  cursor: index === plugins.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="下へ移動"
              >
                <FiArrowDown size={16} />
              </button>

              {/* トグルボタン */}
              <button
                onClick={() => onPluginToggle(pluginData.plugin.id, !pluginData.enabled)}
                disabled={togglingPlugins.has(pluginData.plugin.id)}
                style={{
                  padding: 0,
                  width: '48px',
                  height: '28px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: togglingPlugins.has(pluginData.plugin.id) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: togglingPlugins.has(pluginData.plugin.id) ? 0.5 : 1,
                }}
                title={
                  togglingPlugins.has(pluginData.plugin.id)
                    ? '処理中...'
                    : pluginData.enabled
                    ? '無効化'
                    : '有効化'
                }
              >
                {pluginData.enabled ? (
                  <MdToggleOn size={48} color="#28a745" />
                ) : (
                  <MdToggleOff size={48} color="#6c757d" />
                )}
              </button>
            </div>
          </div>

          {/* 詳細表示ボタン */}
          <button
            onClick={() => toggleExpanded(pluginData.plugin.id)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '13px',
              backgroundColor: 'transparent',
              color: '#0969da',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: isExpanded ? '12px' : '8px',
            }}
          >
            {isExpanded ? (
              <>
                <FiChevronUp size={16} />
                詳細を隠す
              </>
            ) : (
              <>
                <FiChevronDown size={16} />
                詳細を表示
              </>
            )}
          </button>

          {/* 詳細情報（展開時のみ表示） */}
          {isExpanded && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f6f8fa', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                操作内容 ({pluginData.plugin.operations.length}件)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pluginData.plugin.operations.map((op, index) => (
                  <div
                    key={index}
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
      })}
    </div>
  );
}
