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
  pluginsEnabled: boolean;            // プラグイン機能全体の有効/無効（マスタースイッチ）
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
  plugins: PluginData[];     // プラグインデータの配列（配列順序 = 実行優先度）
  settings: Settings;        // 全体設定
  domainMappings: DomainMappings;  // ドメイン → プラグインIDリスト
}

/** デフォルト設定 */
export const DEFAULT_SETTINGS: Settings = {
  pluginsEnabled: true,
  theme: 'auto',
  securityLevel: 'advanced',
};
