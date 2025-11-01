/**
 * Page Modifier - AI Service
 *
 * Claude API統合サービス
 * TODO: Phase 6でClaude API統合を実装
 */

import type { Plugin } from '../../shared/types';
import { generatePluginId } from '../../utils/plugin-utils';

interface ElementInfo {
  selector: string;
  tagName?: string;
  className?: string;
  id?: string;
}

/**
 * AIを使用してプラグインを生成
 * TODO: 実際のClaude API統合を実装（Phase 6）
 */
export async function generatePluginWithAI(
  userRequest: string,
  selectedElement: ElementInfo | null
): Promise<Plugin> {
  // TODO: Phase 6で実装
  // 1. Settings から API キーを取得
  // 2. Claude API にリクエスト送信
  // 3. レスポンスからプラグインJSONを生成
  // 4. バリデーション実行

  // 現在はモック実装（サンプルプラグインを返す）
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機（API呼び出しをシミュレート）

  // 現在のタブのドメインを取得
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const domain = tab.url ? new URL(tab.url).hostname : '*';

  // サンプルプラグインを生成
  const pluginName = `${userRequest.slice(0, 20)}${userRequest.length > 20 ? '...' : ''}`;
  const plugin: Plugin = {
    id: generatePluginId(pluginName),
    name: pluginName,
    version: '1.0.0',
    description: `ユーザーリクエスト: ${userRequest}`,
    author: 'AI Generated',
    targetDomains: [domain],
    autoApply: false,
    priority: 500,
    operations: [
      {
        id: 'op-1',
        type: 'insert',
        selector: selectedElement?.selector || 'body',
        description: `${userRequest}を実装`,
        position: 'afterbegin',
        element: {
          tag: 'div',
          attributes: {
            class: 'ai-generated-element',
          },
          style: {
            padding: '12px',
            margin: '10px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '6px',
          },
          textContent: `AI生成: ${userRequest}`,
        },
      },
    ],
  };

  return plugin;
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
