/**
 * Page Modifier - Claude API Client
 *
 * Claude APIクライアント
 */

import Anthropic from '@anthropic-ai/sdk';
import { PluginSchema } from '../../shared/plugin-schema';
import type { Plugin } from '../../shared/types';

interface ElementInfo {
  selector: string;
  tagName?: string;
  className?: string;
  id?: string;
}

class ClaudeAPIClient {
  private client: Anthropic | null = null;
  private apiKey: string | null = null;

  /**
   * 初期化（Settingsからゃピーキーを取得）
   */
  async init(): Promise<void> {
    const result = await chrome.storage.local.get('settings');
    this.apiKey = result.settings?.apiKey || null;

    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true, // Chrome拡張機能で使用するため
      });
    }
  }

  /**
   * APIキーを設定
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  /**
   * プラグインを生成
   */
  async generatePlugin(
    userRequest: string,
    selectedElement?: ElementInfo | null,
    currentUrl?: string
  ): Promise<Plugin> {
    if (!this.client) {
      throw new Error('APIキーが設定されていません。設定画面でClaude APIキーを入力してください。');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userRequest, selectedElement, currentUrl);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // レスポンスからJSONを抽出
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('予期しないレスポンス形式です');
      }

      const plugin = this.extractPluginJSON(content.text);

      // バリデーション
      const validatedPlugin = PluginSchema.parse(plugin);

      return validatedPlugin;
    } catch (error) {
      console.error('プラグイン生成に失敗:', error);

      if (error instanceof Error) {
        // APIエラーの詳細を提供
        if (error.message.includes('401')) {
          throw new Error('APIキーが無効です。設定画面で正しいAPIキーを入力してください。');
        } else if (error.message.includes('429')) {
          throw new Error('APIのレート制限に達しました。しばらく待ってから再試行してください。');
        } else if (error.message.includes('500')) {
          throw new Error('Claude APIでエラーが発生しました。後ほど再試行してください。');
        }
        throw new Error(`プラグイン生成に失敗しました: ${error.message}`);
      }

      throw new Error('プラグイン生成中に予期しないエラーが発生しました');
    }
  }

  /**
   * システムプロンプトを構築
   */
  private buildSystemPrompt(): string {
    return `あなたはWebページ機能拡張プラグインのJSON生成アシスタントです。

ユーザーの要望を受け取り、以下のスキーマに従ったプラグインJSONを生成してください。

## プラグインスキーマ

\`\`\`typescript
interface Plugin {
  id: string;                    // ユニークID（kebab-case）
  name: string;                  // プラグイン名
  version: string;               // バージョン（semver: "1.0.0"）
  description: string;           // 説明
  author?: string;               // 作成者
  targetDomains: string[];       // 対象ドメイン
  autoApply: boolean;            // 自動適用（通常true）
  priority: number;              // 優先度（0-1000、デフォルト500）
  operations: Operation[];       // 操作の配列
}

interface Operation {
  id: string;                    // 操作ID
  description?: string;          // 操作の説明
  type: 'insert' | 'remove' | 'hide' | 'show' | 'style' | 'modify' | 'replace';
  selector: string;              // CSSセレクター
  position?: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';  // insert時
  element?: Element;             // 挿入する要素（insert/replace時）
  style?: Record<string, string>;  // スタイル変更（style時）
  textContent?: string;          // テキスト変更（modify時）
  condition?: Condition;         // 実行条件
}

interface Element {
  tag: string;                   // HTMLタグ名
  attributes?: Record<string, string>;  // 属性
  style?: Record<string, string>;       // インラインスタイル
  textContent?: string;          // テキストコンテンツ
  innerHTML?: string;            // HTML（XSSに注意）
  children?: Element[];          // 子要素（階層構造サポート）
  events?: Event[];              // イベントハンドラー
}

interface Event {
  type: 'click' | 'mouseenter' | 'mouseleave' | 'input' | 'change' | 'focus' | 'blur';
  action: Action;
}

interface Action {
  type: 'copyText' | 'navigate' | 'toggleClass' | 'sendMessage' | 'custom';
  selector?: string;             // 対象セレクター
  value?: string;                // 値（copyText時のテキスト、navigate時のURL等）
  className?: string;            // toggleClass時のクラス名
  code?: string;                 // custom時のJSコード（最小限に）
  notification?: string;         // 通知メッセージ
}

interface Condition {
  type: 'exists' | 'notExists' | 'matches' | 'custom';
  selector?: string;
  pattern?: string;
  code?: string;
}
\`\`\`

## 出力形式

必ず以下の形式で出力してください：

\`\`\`json
{
  "id": "plugin-id",
  "name": "プラグイン名",
  "version": "1.0.0",
  "description": "説明",
  "targetDomains": ["example.com"],
  "autoApply": true,
  "priority": 500,
  "operations": [...]
}
\`\`\`

## 注意事項

1. セレクターは具体的で一意になるようにする
2. 操作は段階的に実行される（順序を考慮）
3. イベントハンドラーはシンプルに保つ
4. customアクションは最小限に（セキュリティリスクのため）
5. セキュリティを考慮（XSS対策: textContentを優先、innerHTMLは最小限）
6. idはkebab-caseで生成（例: "copy-button", "hide-ads"）
7. versionは常に"1.0.0"から開始
8. priorityは通常500（標準的な優先度）

## 良い例

\`\`\`json
{
  "id": "simple-copy-button",
  "name": "シンプルコピーボタン",
  "version": "1.0.0",
  "description": "ページURLをコピーするボタンを追加",
  "author": "AI Generated",
  "targetDomains": ["*"],
  "autoApply": true,
  "priority": 500,
  "operations": [
    {
      "id": "insert-copy-button",
      "type": "insert",
      "selector": "body",
      "position": "afterbegin",
      "element": {
        "tag": "button",
        "attributes": {
          "id": "copy-url-btn"
        },
        "style": {
          "position": "fixed",
          "top": "20px",
          "right": "20px",
          "zIndex": "9999",
          "padding": "10px 15px",
          "backgroundColor": "#0969da",
          "color": "white",
          "border": "none",
          "borderRadius": "6px",
          "cursor": "pointer"
        },
        "textContent": "📋 URLをコピー",
        "events": [
          {
            "type": "click",
            "action": {
              "type": "copyText",
              "value": "{{location.href}}",
              "notification": "URLをコピーしました"
            }
          }
        ]
      }
    }
  ]
}
\`\`\``;
  }

  /**
   * ユーザープロンプトを構築
   */
  private buildUserPrompt(
    userRequest: string,
    selectedElement?: ElementInfo | null,
    currentUrl?: string
  ): string {
    let prompt = `以下の要望に基づいてプラグインJSONを生成してください。

要望: ${userRequest}
`;

    if (currentUrl) {
      const url = new URL(currentUrl);
      prompt += `
現在のURL: ${currentUrl}
ドメイン: ${url.hostname}
`;
    }

    if (selectedElement) {
      prompt += `
選択された要素:
- セレクター: ${selectedElement.selector}
- タグ: ${selectedElement.tagName || '不明'}
- ID: ${selectedElement.id || 'なし'}
- クラス: ${selectedElement.className || 'なし'}
`;
    }

    prompt += `
JSONのみを出力してください（説明文は不要）。
必ず\`\`\`json\`\`\`で囲んで出力してください。`;

    return prompt;
  }

  /**
   * レスポンスからJSONを抽出
   */
  private extractPluginJSON(text: string): any {
    // ```json ... ``` 形式を抽出
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        throw new Error('JSONのパースに失敗しました');
      }
    }

    // JSONブロックがない場合、全体をパース
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('有効なJSONを抽出できませんでした。レスポンス形式が不正です。');
    }
  }
}

export const claudeAPIClient = new ClaudeAPIClient();
