/**
 * Page Modifier - Settings Panel Component
 *
 * 設定パネルコンポーネント
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Settings } from '../../shared/storage-types';
import { FiMoon, FiSun } from 'react-icons/fi';
import { createLogger } from '../../utils/logger';

const logger = createLogger('[SettingsPanel]');

interface SettingsPanelProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function SettingsPanel({ isDarkMode, onToggleDarkMode }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [previousSettings, setPreviousSettings] = useState<Settings | null>(null);
  const isInitialLoadRef = useRef(true);

  const autoSave = useCallback(async () => {
    if (!settings) return;

    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings,
      });

      // 現在の設定を保存
      setPreviousSettings(settings);
    } catch (error) {
      logger.error('設定の保存に失敗しました', error);
    }
  }, [settings, previousSettings]);

  const loadSettings = async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS',
    });

    if (response.success) {
      // 初回ロードフラグをfalseにしてから設定をセット
      isInitialLoadRef.current = false;
      setSettings(response.settings);
      setPreviousSettings(response.settings);
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
    return <div className="p-5 text-gray-900 dark:text-gray-100">読み込み中...</div>;
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900">
      <h2 className="m-0 mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">設定</h2>

      {/* ダークモード切り替え */}
      <div className="mb-5">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          テーマ
        </label>
        <button
          onClick={onToggleDarkMode}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
          {isDarkMode ? 'ライトモード' : 'ダークモード'}
        </button>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          ダークモードとライトモードを切り替えます
        </p>
      </div>

      <div className="mb-5">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          Claude APIキー
        </label>
        <input
          type="password"
          value={settings.apiKey || ''}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          placeholder="sk-ant-..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          チャットでプラグインを生成するために必要です
        </p>
      </div>
    </div>
  );
}
