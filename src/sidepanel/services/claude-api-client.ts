/**
 * Page Modifier - Claude API Client
 *
 * Claude APIクライアント
 */

import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { PluginSchema } from '../../shared/plugin-schema';
import type { Plugin } from '../../shared/types';

interface ElementInfo {
  selector: string;
  tagName?: string;
  className?: string;
  id?: string;
}

export type AIResponse =
  | { type: 'text'; content: string }
  | { type: 'plugin'; plugin: Plugin };

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
   * チャット（通常の会話またはプラグイン生成/編集）
   */
  async chat(
    userRequest: string,
    selectedElement?: ElementInfo | null,
    currentUrl?: string,
    selectedPlugin?: Plugin | null
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('APIキーが設定されていません。設定画面でClaude APIキーを入力してください。');
    }

    const systemPrompt = this.buildSystemPrompt(selectedPlugin);
    const userPrompt = this.buildUserPrompt(userRequest, selectedElement, currentUrl, selectedPlugin);

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

      // レスポンスからテキストを取得
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('予期しないレスポンス形式です');
      }

      const text = content.text;

      // JSONが含まれているかチェック
      if (this.containsPluginJSON(text)) {
        // プラグイン生成レスポンス
        const isEditMode = selectedPlugin !== null;
        const plugin = this.extractPluginJSON(text, isEditMode);
        const validatedPlugin = PluginSchema.parse(plugin);
        return { type: 'plugin', plugin: validatedPlugin };
      } else {
        // 通常のテキストレスポンス
        return { type: 'text', content: text };
      }
    } catch (error) {
      console.error('AI応答の取得に失敗:', error);

      if (error instanceof Error) {
        // APIエラーの詳細を提供
        if (error.message.includes('401')) {
          throw new Error('APIキーが無効です。設定画面で正しいAPIキーを入力してください。');
        } else if (error.message.includes('429')) {
          throw new Error('APIのレート制限に達しました。しばらく待ってから再試行してください。');
        } else if (error.message.includes('500')) {
          throw new Error('Claude APIでエラーが発生しました。後ほど再試行してください。');
        }
        throw new Error(`AI応答の取得に失敗しました: ${error.message}`);
      }

      throw new Error('AI応答の取得中に予期しないエラーが発生しました');
    }
  }

  /**
   * システムプロンプトを構築
   */
  private buildSystemPrompt(selectedPlugin?: Plugin | null): string {
    const isEditMode = selectedPlugin !== null;

    return `あなたは「Page Modifier」という Chrome拡張機能のAIアシスタントです。

## あなたの役割

1. **通常の会話対応**
   - ユーザーの質問に答える
   - Page Modifierの機能や使い方を説明する
   - プラグインの概念を説明する
   - 一般的な相談に対応する

2. **プラグイン生成${isEditMode ? '・編集' : ''}**
   - ユーザーがWebページに機能を追加したい場合のみ、プラグインJSONを生成する
   - 明確にWebページの改変を要求された場合にのみ、JSON形式で応答する${isEditMode ? '\n   - **編集モード**: 既存のプラグインを修正・改善する（ユーザーが選択したプラグインを編集）' : ''}

## Page Modifierについて

Page Modifierは、AIを活用してWebページの機能を柔軟に拡張できるChrome拡張機能です。
ユーザーは自然言語でWebページの改変要望を伝えるだけで、AIがプラグインを自動生成します。

主な機能：
- ボタンやUIの追加
- 不要な要素の非表示
- ページスタイルのカスタマイズ
- イベントハンドラーの追加
- APIとの連携

## 応答ルール

### 通常の会話の場合
ユーザーが以下のような質問をした場合は、**テキストで応答**してください：
- 「この拡張機能は何ができますか？」
- 「プラグインとは何ですか？」
- 「使い方を教えて」
- 「こんにちは」
- その他、Webページ改変の具体的な要求でない質問

### プラグイン生成の場合
ユーザーが以下のような要求をした場合は、**JSONで応答**してください：
- 「このページに○○ボタンを追加して」
- 「広告を非表示にして」
- 「ページの背景色を変更して」
- その他、Webページの具体的な改変要求

JSONで応答する場合は、以下のスキーマに従ってください：

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
6. **id**: 新規作成時はidフィールドを省略してください（システムが自動的にUUIDを生成します）。編集時は既存のidをそのまま使用してください。
7. versionは常に"1.0.0"から開始
8. priorityは通常500（標準的な優先度）

## 良い例（新規作成）

\`\`\`json
{
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
    currentUrl?: string,
    selectedPlugin?: Plugin | null
  ): string {
    const isEditMode = selectedPlugin !== null;

    let prompt = '';

    if (isEditMode) {
      prompt = `以下の既存プラグインを、ユーザーの要望に基づいて編集してください。

【既存プラグイン】
\`\`\`json
${JSON.stringify(selectedPlugin, null, 2)}
\`\`\`

【編集要望】
${userRequest}
`;
    } else {
      prompt = `以下の要望に基づいてプラグインJSONを生成してください。

要望: ${userRequest}
`;
    }

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

    if (isEditMode) {
      prompt += `
編集されたプラグインの完全なJSONを出力してください（説明文は不要）。
IDは元のプラグインと同じものを使用してください: "${selectedPlugin!.id}"
必ず\`\`\`json\`\`\`で囲んで出力してください。`;
    } else {
      prompt += `
JSONのみを出力してください（説明文は不要）。
必ず\`\`\`json\`\`\`で囲んで出力してください。`;
    }

    return prompt;
  }

  /**
   * JSONが含まれているかチェック
   */
  private containsPluginJSON(text: string): boolean {
    // ```json ... ``` 形式があるか、またはJSON構造があるかチェック
    return text.includes('```json') || (text.includes('{') && text.includes('"id"') && text.includes('"operations"'));
  }

  /**
   * レスポンスからJSONを抽出
   */
  private extractPluginJSON(text: string, isEditMode: boolean): any {
    // ```json ... ``` 形式を抽出
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    let pluginData: any;

    if (jsonMatch) {
      try {
        pluginData = JSON.parse(jsonMatch[1]);
      } catch (error) {
        throw new Error('JSONのパースに失敗しました');
      }
    } else {
      // JSONブロックがない場合、全体をパース
      try {
        pluginData = JSON.parse(text);
      } catch (error) {
        throw new Error('有効なJSONを抽出できませんでした。レスポンス形式が不正です。');
      }
    }

    // 新規作成時（編集モードでない場合）、IDがなければUUIDを生成
    if (!isEditMode && !pluginData.id) {
      pluginData.id = uuidv4();
    }

    return pluginData;
  }
}

export const claudeAPIClient = new ClaudeAPIClient();
