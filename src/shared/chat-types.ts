/**
 * Page Modifier - Chat Types
 *
 * チャット関連の型定義（共通）
 */

import type { Plugin } from './types';

// チャットアイテム型（メッセージまたはプラグイン）
export type ChatItem = ChatMessage | ChatPlugin;

// 通常のメッセージ
export interface ChatMessage {
  type: 'message';
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// プラグインモード
export type ChatPluginMode =
  | 'referencing'    // 編集のために参照中（バツボタンで削除可能）
  | 'referenced'     // 編集要望送信済み（削除不可、表示のみ）
  | 'update_preview' // 更新プレビュー（編集から生成、承認待ち）
  | 'add_preview'    // 追加プレビュー（新規生成、承認待ち）
  | 'updated'        // 更新済み（「編集済み」バッジ、元に戻すボタン）
  | 'added';         // 追加済み（「適用済み」バッジ、元に戻すボタン）

// プラグインアイテム
export interface ChatPlugin {
  type: 'plugin';
  id: string;
  plugin: Plugin;
  mode: ChatPluginMode;
  role: 'user' | 'assistant';  // referencing/referencedはuser、それ以外はassistant
  timestamp: number;
}

// Element情報（要素選択用）
export interface ElementInfo {
  selector: string;
  tagName?: string;
  className?: string;
  id?: string;
}
