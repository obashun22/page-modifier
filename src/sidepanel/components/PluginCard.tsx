/**
 * Page Modifier - Plugin Card Component
 *
 * プラグインカードコンポーネント（新規/編集の統一表示）
 */

import type { Plugin } from '../../shared/types';

type PluginCardMode = 'preview' | 'editing';

interface PluginCardProps {
  plugin: Plugin;
  mode: PluginCardMode;
  onApprove?: (plugin: Plugin) => void;
  onReject?: () => void;
  onDismiss?: () => void;
}

export default function PluginCard({ plugin, mode, onApprove, onReject, onDismiss }: PluginCardProps) {
  return (
    <div
      style={{
        padding: '16px',
        borderTop: mode === 'preview' ? '2px solid #0969da' : '2px solid #d4a72c',
        backgroundColor: '#f6f8fa',
        maxHeight: '300px',
        overflowY: 'auto',
      }}
    >
      {/* ヘッダー */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#24292f',
            }}
          >
            {plugin.name}
          </h3>
          {mode === 'editing' && (
            <span
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                backgroundColor: '#fff8c5',
                color: '#9a6700',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              編集中
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#666',
          }}
        >
          {plugin.description || 'No description'}
        </p>
      </div>

      {/* メタ情報 */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#6e7781',
            marginBottom: '4px',
          }}
        >
          <span>バージョン: {plugin.version}</span>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>優先度: {plugin.priority}</span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#6e7781',
          }}
        >
          対象ドメイン: {plugin.targetDomains.join(', ')}
        </div>
      </div>

      {/* 操作内容 */}
      <div style={{ marginBottom: '16px' }}>
        <h4
          style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#24292f',
          }}
        >
          操作内容 ({plugin.operations.length}件)
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {plugin.operations.map((op, index) => (
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

      {/* アクションボタン */}
      {mode === 'preview' && onApprove && onReject && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onApprove(plugin)}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#2da44e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✅ 適用する
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: 'white',
              color: '#24292f',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ❌ キャンセル
          </button>
        </div>
      )}

      {mode === 'editing' && onDismiss && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onDismiss}
            style={{
              flex: 1,
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: 'white',
              color: '#24292f',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✕ 閉じる
          </button>
        </div>
      )}
    </div>
  );
}
