/**
 * Page Modifier - AI Service
 *
 * Claude API統合サービス
 */

import { claudeAPIClient, type AIResponse } from './claude-api-client';
import type { Plugin } from '../../shared/types';

interface ElementInfo {
  selector: string;
  tagName?: string;
  className?: string;
  id?: string;
}

/**
 * AIとチャット（通常の会話またはプラグイン生成/編集）
 */
export async function chatWithAI(
  userRequest: string,
  selectedElement: ElementInfo | null,
  selectedPlugin: Plugin | null = null
): Promise<AIResponse> {
  // Claude API クライアントを初期化
  await claudeAPIClient.init();

  // 現在のタブのURLを取得
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab.url;

  // Claude APIでチャット（プラグイン編集モードの場合はselectedPluginを渡す）
  return await claudeAPIClient.chat(userRequest, selectedElement, currentUrl, selectedPlugin);
}

/**
 * プラグインを更新（ユーザーのフィードバックを反映）
 * TODO: Phase 6で実装
 */
export async function updatePluginWithFeedback(
  _plugin: Plugin,
  _feedback: string
): Promise<Plugin> {
  // TODO: Phase 6で実装
  throw new Error('Not implemented yet (Phase 6)');
}

/**
 * API設定の検証
 * TODO: Phase 6で実装
 */
export async function validateApiKey(_apiKey: string): Promise<boolean> {
  // TODO: Phase 6で実装
  throw new Error('Not implemented yet (Phase 6)');
}
