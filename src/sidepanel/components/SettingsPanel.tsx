/**
 * Page Modifier - Settings Panel Component
 *
 * 設定パネルコンポーネント
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Settings } from '../../shared/storage-types';

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const autoSave = useCallback(async () => {
    if (!settings) return;

    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings,
      });

      setMessage('設定を保存しました');
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage('設定の保存に失敗しました');
    }
  }, [settings]);

  const loadSettings = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS',
    });

    if (response.success) {
      // 初回ロードフラグをfalseにしてから設定をセット
      isInitialLoadRef.current = false;
      setSettings(response.settings);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 設定が変更されたら自動保存（初回ロード時は除く）
  useEffect(() => {
    if (settings && !isInitialLoadRef.current) {
      autoSave();
    }
  }, [settings, autoSave]);

  if (!settings) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>設定</h2>

      {message && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#d1e7dd',
            border: '1px solid #badbcc',
            borderRadius: '6px',
            color: '#0f5132',
            fontSize: '13px',
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <input
            type="checkbox"
            checked={settings.autoApplyPlugins}
            onChange={(e) =>
              setSettings({ ...settings, autoApplyPlugins: e.target.checked })
            }
            style={{ cursor: 'pointer' }}
          />
          <span>プラグインを自動的に適用する</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: '#666' }}>
          有効化されたプラグインを対象ドメインで自動的に実行します
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <input
            type="checkbox"
            checked={settings.showNotifications}
            onChange={(e) =>
              setSettings({ ...settings, showNotifications: e.target.checked })
            }
            style={{ cursor: 'pointer' }}
          />
          <span>通知を表示する</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: '#666' }}>
          プラグインの実行や更新時に通知を表示します
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
          テーマ
        </label>
        <select
          value={settings.theme}
          onChange={(e) =>
            setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })
          }
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #d0d7de',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="light">ライト</option>
          <option value="dark">ダーク</option>
          <option value="auto">自動</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
          セキュリティレベル
        </label>
        <select
          value={settings.securityLevel}
          onChange={(e) =>
            setSettings({
              ...settings,
              securityLevel: e.target.value as 'safe' | 'moderate' | 'advanced',
            })
          }
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #d0d7de',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="safe">Safe（基本DOM操作のみ）</option>
          <option value="moderate">Moderate（事前定義イベント、外部API）</option>
          <option value="advanced">Advanced（カスタムJS実行）</option>
        </select>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
          Advancedレベルでは、カスタムJavaScriptコードの実行が許可されます（承認が必要）
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
          Claude APIキー
        </label>
        <input
          type="password"
          value={settings.apiKey || ''}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          placeholder="sk-ant-..."
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #d0d7de',
            borderRadius: '6px',
          }}
        />
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
          チャットでプラグインを生成するために必要です
        </p>
      </div>
    </div>
  );
}
