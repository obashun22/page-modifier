/**
 * Page Modifier - Plugin Management View
 *
 * プラグイン管理ビュー（メインコンポーネント）
 */

import { useState, useEffect } from 'react';
import PluginList from './PluginList';
import PluginEditor from './PluginEditor';
import type { PluginData, Settings } from '../../shared/storage-types';
import type { Plugin } from '../../shared/types';
import { matchesDomain } from '../../utils/plugin-utils';

interface PluginManagementViewProps {
  onEditPlugin: (plugin: Plugin) => void;
}

export default function PluginManagementView({ onEditPlugin }: PluginManagementViewProps) {
  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [selectedPluginData, setSelectedPluginData] = useState<PluginData | null>(null);
  const [importing, setImporting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');

  useEffect(() => {
    loadPlugins();
    loadSettings();
    loadCurrentTabUrl();

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

  const loadSettings = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS',
    });

    if (response.success) {
      setSettings(response.settings);
    }
  };

  const loadCurrentTabUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setCurrentTabUrl(tab.url);
      }
    } catch (error) {
      console.error('Failed to get current tab URL:', error);
    }
  };

  const isPluginActiveOnCurrentPage = (plugin: Plugin): boolean => {
    if (!currentTabUrl) return false;
    return plugin.targetDomains.some(domain => matchesDomain(currentTabUrl, domain));
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

  const handleTogglePluginsEnabled = async (enabled: boolean) => {
    if (!settings) return;

    const updatedSettings = { ...settings, pluginsEnabled: enabled };

    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: updatedSettings,
    });

    setSettings(updatedSettings);

    // アクティブなタブをページリロード
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      for (const tab of tabs) {
        if (tab.id) {
          await chrome.tabs.reload(tab.id);
        }
      }
    } catch (error) {
      console.error('タブのリロードに失敗しました', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {selectedPluginData ? (
        <PluginEditor
          pluginData={selectedPluginData}
          onSave={handlePluginSave}
          onCancel={() => setSelectedPluginData(null)}
        />
      ) : (
        <PluginList
          plugins={plugins}
          onPluginSelect={handlePluginSelect}
          onPluginDelete={handlePluginDelete}
          onPluginToggle={handlePluginToggle}
          onPluginExport={handlePluginExport}
          onPluginEdit={(plugin) => onEditPlugin(plugin)}
          onImport={handleImport}
          importing={importing}
          pluginsEnabled={settings?.pluginsEnabled ?? true}
          onTogglePluginsEnabled={handleTogglePluginsEnabled}
          isPluginActiveOnCurrentPage={isPluginActiveOnCurrentPage}
        />
      )}
    </div>
  );
}
