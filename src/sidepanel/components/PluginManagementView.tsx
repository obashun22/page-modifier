/**
 * Page Modifier - Plugin Management View
 *
 * プラグイン管理ビュー（メインコンポーネント）
 */

import { useState, useEffect } from 'react';
import { FiUpload } from 'react-icons/fi';
import PluginList from './PluginList';
import PluginEditor from './PluginEditor';
import type { PluginData, Settings } from '../../shared/storage-types';
import type { Plugin } from '../../shared/types';
import { canExecutePlugin, getSecurityLevelErrorMessage } from '../../shared/plugin-security-checker';

interface PluginManagementViewProps {
  onEditPlugin: (plugin: Plugin) => void;
}

export default function PluginManagementView({ onEditPlugin }: PluginManagementViewProps) {
  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [selectedPluginData, setSelectedPluginData] = useState<PluginData | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadPlugins();

    // chrome.storageの変更を監視してプラグイン一覧を自動更新
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      // プラグインデータが変更された場合
      if (changes['page_modifier_plugins']) {
        console.log('[PluginManagementView] Plugins updated in storage, reloading...');
        loadPlugins();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const loadPlugins = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ALL_PLUGINS',
    });

    if (response.success) {
      setPlugins(response.plugins);
    }
  };

  const handlePluginSelect = (pluginData: PluginData) => {
    setSelectedPluginData(pluginData);
  };

  const handlePluginSave = async (plugin: Plugin) => {
    await chrome.runtime.sendMessage({
      type: 'SAVE_PLUGIN',
      plugin,
    });

    await loadPlugins();
    setSelectedPluginData(null);
  };

  const handlePluginDelete = async (pluginId: string) => {
    const confirmed = confirm('このプラグインを削除しますか？');

    if (confirmed) {
      await chrome.runtime.sendMessage({
        type: 'DELETE_PLUGIN',
        pluginId,
      });

      await loadPlugins();
    }
  };

  const handlePluginToggle = async (pluginId: string, enabled: boolean) => {
    // 有効化しようとしている場合、セキュリティレベルをチェック
    if (enabled) {
      // 現在の設定を取得
      const settingsResponse = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });

      const settings: Settings = settingsResponse.settings;

      // プラグインを取得
      const pluginData = plugins.find((p) => p.plugin.id === pluginId);
      if (!pluginData) return;

      // セキュリティレベルをチェック
      if (!canExecutePlugin(pluginData.plugin, settings.securityLevel)) {
        const errorMessage = getSecurityLevelErrorMessage(
          pluginData.plugin,
          settings.securityLevel
        );

        alert(`⚠️ プラグインを有効化できません\n\n${errorMessage}\n\n設定タブからセキュリティレベルを変更してください。`);
        return;
      }
    }

    await chrome.runtime.sendMessage({
      type: 'TOGGLE_PLUGIN',
      pluginId,
      enabled,
    });

    await loadPlugins();
  };

  const handlePluginExport = async (pluginId: string) => {
    const response = await chrome.runtime.sendMessage({
      type: 'EXPORT_PLUGIN',
      pluginId,
    });

    if (response.success) {
      // JSONをダウンロード
      const blob = new Blob([response.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plugin-${pluginId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };


  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);

      try {
        const text = await file.text();
        const response = await chrome.runtime.sendMessage({
          type: 'IMPORT_PLUGIN',
          json: text,
        });

        if (response.success) {
          alert('プラグインをインポートしました');
          await loadPlugins();
        } else {
          alert(`インポートに失敗しました: ${response.error}`);
        }
      } catch (error) {
        alert(`インポートに失敗しました: ${error}`);
      } finally {
        setImporting(false);
      }
    };

    input.click();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {selectedPluginData ? (
        <PluginEditor
          pluginData={selectedPluginData}
          onSave={handlePluginSave}
          onCancel={() => setSelectedPluginData(null)}
        />
      ) : (
        <>
          <div
            style={{
              padding: '12px',
              borderBottom: '1px solid #d0d7de',
              backgroundColor: '#f6f8fa',
            }}
          >
            <button
              onClick={handleImport}
              disabled={importing}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#0969da',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: importing ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: importing ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FiUpload size={16} />
              {importing ? 'インポート中...' : 'プラグインをインポート'}
            </button>
          </div>
          <PluginList
            plugins={plugins}
            onPluginSelect={handlePluginSelect}
            onPluginDelete={handlePluginDelete}
            onPluginToggle={handlePluginToggle}
            onPluginExport={handlePluginExport}
            onPluginEdit={(plugin) => onEditPlugin(plugin)}
          />
        </>
      )}
    </div>
  );
}
