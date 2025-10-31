# 11. プラグイン管理UI

## 機能概要

Side Panel上でプラグインの一覧表示、編集、インポート/エクスポート、有効/無効切り替え、およびドメイン設定を行うUIを実装します。直感的な操作性と視覚的なフィードバックを提供します。

## 実装内容

### 1. コンポーネント構成

```typescript
// PluginManagementView.tsx
import React, { useState, useEffect } from 'react';
import PluginList from './PluginList';
import PluginEditor from './PluginEditor';
import SettingsPanel from './SettingsPanel';

type Tab = 'plugins' | 'settings';

export default function PluginManagementView() {
  const [currentTab, setCurrentTab] = useState<Tab>('plugins');
  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ALL_PLUGINS',
    });

    if (response.success) {
      setPlugins(response.plugins);
    }
  };

  const handlePluginSelect = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
  };

  const handlePluginUpdate = async (plugin: Plugin) => {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_PLUGIN',
      pluginId: plugin.id,
      updates: plugin,
    });

    await loadPlugins();
    setSelectedPlugin(null);
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

  return (
    <div className="plugin-management-view">
      <div className="tabs">
        <button
          className={currentTab === 'plugins' ? 'active' : ''}
          onClick={() => setCurrentTab('plugins')}
        >
          プラグイン
        </button>
        <button
          className={currentTab === 'settings' ? 'active' : ''}
          onClick={() => setCurrentTab('settings')}
        >
          設定
        </button>
      </div>

      {currentTab === 'plugins' && (
        <div className="plugins-tab">
          {selectedPlugin ? (
            <PluginEditor
              plugin={selectedPlugin}
              onSave={handlePluginUpdate}
              onCancel={() => setSelectedPlugin(null)}
            />
          ) : (
            <PluginList
              plugins={plugins}
              onPluginSelect={handlePluginSelect}
              onPluginDelete={handlePluginDelete}
              onPluginToggle={handlePluginToggle}
            />
          )}
        </div>
      )}

      {currentTab === 'settings' && <SettingsPanel />}
    </div>
  );
}
```

### 2. プラグインリスト

```typescript
// PluginList.tsx
import React, { useState } from 'react';

interface PluginListProps {
  plugins: PluginData[];
  onPluginSelect: (plugin: Plugin) => void;
  onPluginDelete: (pluginId: string) => void;
  onPluginToggle: (pluginId: string, enabled: boolean) => void;
}

export default function PluginList({
  plugins,
  onPluginSelect,
  onPluginDelete,
  onPluginToggle,
}: PluginListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlugins = plugins.filter(
    p =>
      p.plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.plugin.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const plugin = JSON.parse(text);

        // バリデーション
        const response = await chrome.runtime.sendMessage({
          type: 'SAVE_PLUGIN',
          plugin,
        });

        if (response.success) {
          alert('プラグインをインポートしました');
          window.location.reload();
        }
      }
    };

    input.click();
  };

  const handleExport = async (pluginId: string) => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_PLUGIN',
      pluginId,
    });

    if (response.success && response.plugin) {
      const json = JSON.stringify(response.plugin, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${response.plugin.id}.json`;
      a.click();

      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="plugin-list">
      <div className="list-header">
        <input
          type="text"
          placeholder="検索..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <button onClick={handleImport} className="import-btn">
          📥 インポート
        </button>
      </div>

      <div className="list-content">
        {filteredPlugins.length === 0 ? (
          <div className="empty-state">
            <p>プラグインがありません</p>
          </div>
        ) : (
          filteredPlugins.map(pluginData => (
            <div key={pluginData.plugin.id} className="plugin-item">
              <div className="plugin-info">
                <h3>{pluginData.plugin.name}</h3>
                <p className="description">{pluginData.plugin.description}</p>

                <div className="plugin-meta">
                  <span className="version">v{pluginData.plugin.version}</span>
                  <span className="domains">
                    {pluginData.plugin.targetDomains.join(', ')}
                  </span>
                </div>
              </div>

              <div className="plugin-actions">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={pluginData.enabled}
                    onChange={e =>
                      onPluginToggle(pluginData.plugin.id, e.target.checked)
                    }
                  />
                  <span className="slider"></span>
                </label>

                <button
                  onClick={() => onPluginSelect(pluginData.plugin)}
                  className="edit-btn"
                >
                  ✏️ 編集
                </button>

                <button
                  onClick={() => handleExport(pluginData.plugin.id)}
                  className="export-btn"
                >
                  📤 エクスポート
                </button>

                <button
                  onClick={() => onPluginDelete(pluginData.plugin.id)}
                  className="delete-btn"
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### 3. プラグインエディター

```typescript
// PluginEditor.tsx
import React, { useState } from 'react';

interface PluginEditorProps {
  plugin: Plugin;
  onSave: (plugin: Plugin) => void;
  onCancel: () => void;
}

export default function PluginEditor({ plugin, onSave, onCancel }: PluginEditorProps) {
  const [editedPlugin, setEditedPlugin] = useState<Plugin>(plugin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedPlugin);
  };

  return (
    <div className="plugin-editor">
      <h2>プラグインを編集</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>プラグイン名</label>
          <input
            type="text"
            value={editedPlugin.name}
            onChange={e =>
              setEditedPlugin({ ...editedPlugin, name: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>説明</label>
          <textarea
            value={editedPlugin.description || ''}
            onChange={e =>
              setEditedPlugin({ ...editedPlugin, description: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>対象ドメイン（カンマ区切り）</label>
          <input
            type="text"
            value={editedPlugin.targetDomains.join(', ')}
            onChange={e =>
              setEditedPlugin({
                ...editedPlugin,
                targetDomains: e.target.value.split(',').map(d => d.trim()),
              })
            }
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={editedPlugin.autoApply}
              onChange={e =>
                setEditedPlugin({ ...editedPlugin, autoApply: e.target.checked })
              }
            />
            自動適用
          </label>
        </div>

        <div className="form-group">
          <label>優先度（0-1000）</label>
          <input
            type="number"
            min="0"
            max="1000"
            value={editedPlugin.priority}
            onChange={e =>
              setEditedPlugin({ ...editedPlugin, priority: Number(e.target.value) })
            }
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn">
            💾 保存
          </button>
          <button type="button" onClick={onCancel} className="cancel-btn">
            ❌ キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 4. 設定パネル

```typescript
// SettingsPanel.tsx
import React, { useState, useEffect } from 'react';

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    autoApplyPlugins: true,
    showNotifications: true,
    theme: 'auto',
    apiKey: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS',
    });

    if (response.success) {
      setSettings(response.settings);
    }
  };

  const handleSave = async () => {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings,
    });

    alert('設定を保存しました');
  };

  return (
    <div className="settings-panel">
      <h2>設定</h2>

      <div className="setting-group">
        <h3>一般</h3>

        <label>
          <input
            type="checkbox"
            checked={settings.autoApplyPlugins}
            onChange={e =>
              setSettings({ ...settings, autoApplyPlugins: e.target.checked })
            }
          />
          プラグインを自動適用
        </label>

        <label>
          <input
            type="checkbox"
            checked={settings.showNotifications}
            onChange={e =>
              setSettings({ ...settings, showNotifications: e.target.checked })
            }
          />
          通知を表示
        </label>

        <div className="form-group">
          <label>テーマ</label>
          <select
            value={settings.theme}
            onChange={e =>
              setSettings({ ...settings, theme: e.target.value as any })
            }
          >
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
            <option value="auto">自動</option>
          </select>
        </div>
      </div>

      <div className="setting-group">
        <h3>Claude API</h3>

        <div className="form-group">
          <label>APIキー</label>
          <input
            type="password"
            value={settings.apiKey || ''}
            onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
            placeholder="sk-ant-..."
          />
          <small>
            APIキーは{' '}
            <a href="https://console.anthropic.com" target="_blank">
              Anthropic Console
            </a>{' '}
            で取得できます
          </small>
        </div>
      </div>

      <button onClick={handleSave} className="save-btn">
        💾 設定を保存
      </button>
    </div>
  );
}
```

## 実装ステップ

### Phase 1: 基本コンポーネント実装

- [ ] PluginManagementView.tsx実装
- [ ] タブ切り替え
- [ ] 状態管理

### Phase 2: プラグインリスト実装

- [ ] PluginList.tsx実装
- [ ] 検索機能
- [ ] インポート/エクスポート
- [ ] 有効/無効切り替え

### Phase 3: プラグインエディター実装

- [ ] PluginEditor.tsx実装
- [ ] フォーム実装
- [ ] バリデーション

### Phase 4: 設定パネル実装

- [ ] SettingsPanel.tsx実装
- [ ] 設定の保存・読み込み
- [ ] APIキー管理

### Phase 5: スタイリング

- [ ] Tailwind CSSでスタイリング
- [ ] レスポンシブ対応
- [ ] ダークモード対応

### Phase 6: テスト実装

- [ ] コンポーネントテスト
- [ ] 統合テスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| React | UIフレームワーク | ^18.3.0 |
| Tailwind CSS | スタイリング | ^3.4.0 |

## ファイル構成

```
src/
└── sidepanel/
    └── components/
        ├── PluginManagementView.tsx
        ├── PluginList.tsx
        ├── PluginEditor.tsx
        └── SettingsPanel.tsx
```

## 依存関係

**前提条件:**
- 02_plugin_storage完了
- 08_background_worker完了
- 09_chat_ui完了

## テスト観点

- [ ] プラグイン一覧が表示される
- [ ] プラグインの編集が正常に動作する
- [ ] プラグインの削除が正常に動作する
- [ ] インポート/エクスポートが正常に動作する
- [ ] 設定の保存・読み込みが正常に動作する

## 次のステップ

✅ プラグイン管理UI実装完了後
→ **12_security.md**: セキュリティ対策の実装
