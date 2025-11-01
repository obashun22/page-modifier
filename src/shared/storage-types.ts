/**
 * Page Modifier - Storage Type Definitions
 *
 * chrome.storageで管理するデータの型定義
 */

import type { Plugin } from './types';

/** セキュリティレベル */
export type SecurityLevel = 'safe' | 'moderate' | 'advanced';

/** ストレージキー定義 */
export const STORAGE_KEYS = {
  PLUGINS: 'plugins',
  SETTINGS: 'settings',
  DOMAIN_MAPPINGS: 'domainMappings',
} as const;

/** プラグインデータ（メタデータ付き） */
export interface PluginData {
  plugin: Plugin;           // プラグイン本体
  enabled: boolean;         // 有効/無効
  createdAt: number;        // 作成日時（timestamp）
  updatedAt: number;        // 更新日時（timestamp）
  lastUsedAt?: number;      // 最終使用日時
  usageCount: number;       // 使用回数
}

/** 全体設定 */
export interface Settings {
  autoApplyPlugins: boolean;          // プラグイン自動適用
  showNotifications: boolean;         // 通知表示
  theme: 'light' | 'dark' | 'auto';   // テーマ
  apiKey?: string;                    // Claude APIキー（暗号化推奨）
  securityLevel: SecurityLevel;       // セキュリティレベル
}

/** ドメインマッピング */
export interface DomainMappings {
  [domain: string]: string[];  // ドメイン → プラグインIDの配列
}

/** ストレージデータ全体 */
export interface StorageData {
  plugins: Record<string, PluginData>;  // プラグインID → プラグインデータ
  settings: Settings;                    // 全体設定
  domainMappings: DomainMappings;       // ドメイン → プラグインIDリスト
}

/** デフォルト設定 */
export const DEFAULT_SETTINGS: Settings = {
  autoApplyPlugins: true,
  showNotifications: true,
  theme: 'auto',
  securityLevel: 'moderate',
};
