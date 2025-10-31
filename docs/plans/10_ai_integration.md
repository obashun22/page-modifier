# 10. AI統合

## 機能概要

Claude APIと統合し、ユーザーの要望からプラグインJSONを自動生成する機能を実装します。プロンプトエンジニアリング、ストリーミング対応、エラーハンドリング、およびAPIキーの安全な管理を提供します。

## 実装内容

### 1. Claude API クライアント

```typescript
import Anthropic from '@anthropic-ai/sdk';

class ClaudeAPIClient {
  private client: Anthropic | null = null;
  private apiKey: string | null = null;

  /**
   * 初期化
   */
  async init(): Promise<void> {
    // ストレージからAPIキーを取得
    const settings = await chrome.storage.local.get('settings');
    this.apiKey = settings.settings?.apiKey;

    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
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
    });
  }

  /**
   * プラグインを生成
   */
  async generatePlugin(
    userRequest: string,
    selectedElement?: ElementInfo
  ): Promise<Plugin> {
    if (!this.client) {
      throw new Error('API key not set. Please configure your Claude API key in settings.');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userRequest, selectedElement);

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
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
        throw new Error('Unexpected response format');
      }

      const plugin = this.extractPluginJSON(content.text);

      // バリデーション
      const validatedPlugin = PluginSchema.parse(plugin);

      return validatedPlugin;
    } catch (error) {
      console.error('Failed to generate plugin:', error);
      throw new Error(`Plugin generation failed: ${error.message}`);
    }
  }

  /**
   * ストリーミング対応版
   */
  async generatePluginStream(
    userRequest: string,
    selectedElement?: ElementInfo,
    onChunk: (chunk: string) => void
  ): Promise<Plugin> {
    if (!this.client) {
      throw new Error('API key not set');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userRequest, selectedElement);

    let fullResponse = '';

    const stream = await this.client.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        fullResponse += chunk;
        onChunk(chunk);
      }
    }

    const plugin = this.extractPluginJSON(fullResponse);
    return PluginSchema.parse(plugin);
  }

  /**
   * システムプロンプトを構築
   */
  private buildSystemPrompt(): string {
    return `
あなたはWebページ機能拡張プラグインのJSON生成アシスタントです。

ユーザーの要望を受け取り、以下のスキーマに従ったプラグインJSONを生成してください。

## プラグインスキーマ

\`\`\`typescript
interface Plugin {
  id: string;                    // ユニークID（kebab-case）
  name: string;                  // プラグイン名
  version: string;               // バージョン（semver: "1.0.0"）
  description: string;           // 説明
  targetDomains: string[];       // 対象ドメイン
  autoApply: boolean;            // 自動適用（通常true）
  priority: number;              // 優先度（0-1000）
  operations: Operation[];       // 操作の配列
}

interface Operation {
  id: string;
  description?: string;
  type: 'insert' | 'remove' | 'hide' | 'show' | 'style' | 'modify' | 'replace';
  selector: string;
  position?: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';
  element?: Element;
  style?: Record<string, string>;
  condition?: Condition;
}

interface Element {
  tag: string;
  attributes?: Record<string, string>;
  style?: Record<string, string>;
  textContent?: string;
  children?: Element[];          // 階層構造サポート
  events?: Event[];
}

interface Event {
  type: 'click' | 'mouseenter' | 'mouseleave' | ...;
  action: Action;
}

interface Action {
  type: 'copyText' | 'navigate' | 'toggleClass' | 'custom' | ...;
  selector?: string;
  value?: string;
  code?: string;
  notification?: string;
}
\`\`\`

## 出力形式

必ず以下の形式で出力してください：

\`\`\`json
{
  "id": "plugin-id",
  "name": "プラグイン名",
  ...
}
\`\`\`

## 注意事項

1. セレクターは具体的で一意になるようにする
2. 操作は段階的に実行される（順序を考慮）
3. イベントハンドラーはシンプルに保つ
4. customアクションは最小限に
5. セキュリティを考慮（XSS対策等）
`;
  }

  /**
   * ユーザープロンプトを構築
   */
  private buildUserPrompt(userRequest: string, selectedElement?: ElementInfo): string {
    let prompt = `以下の要望に基づいてプラグインJSONを生成してください。

要望: ${userRequest}
`;

    if (selectedElement) {
      prompt += `
選択された要素:
- セレクター: ${selectedElement.selector}
- タグ: ${selectedElement.tag}
- ID: ${selectedElement.id || 'なし'}
- クラス: ${selectedElement.classes.join(', ') || 'なし'}
`;
    }

    prompt += `
現在のURL: ${location.href}
ドメイン: ${location.hostname}

JSONのみを出力してください（説明文は不要）。
`;

    return prompt;
  }

  /**
   * レスポンスからJSONを抽出
   */
  private extractPluginJSON(text: string): any {
    // ```json ... ``` 形式を抽出
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // JSONブロックがない場合、全体をパース
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Failed to extract valid JSON from response');
    }
  }
}

export const claudeAPIClient = new ClaudeAPIClient();
```

### 2. AI サービス

```typescript
// ai-service.ts
import { claudeAPIClient } from './claude-api-client';

/**
 * プラグインを生成（シンプル版）
 */
export async function generatePluginWithAI(
  userRequest: string,
  selectedElement?: ElementInfo
): Promise<Plugin> {
  await claudeAPIClient.init();

  return await claudeAPIClient.generatePlugin(userRequest, selectedElement);
}

/**
 * プラグインを生成（ストリーミング版）
 */
export async function generatePluginWithAIStream(
  userRequest: string,
  selectedElement?: ElementInfo,
  onChunk: (chunk: string) => void
): Promise<Plugin> {
  await claudeAPIClient.init();

  return await claudeAPIClient.generatePluginStream(userRequest, selectedElement, onChunk);
}

/**
 * APIキーを設定
 */
export function setAPIKey(apiKey: string): void {
  claudeAPIClient.setApiKey(apiKey);

  // ストレージに保存
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || {};
    settings.apiKey = apiKey;
    chrome.storage.local.set({ settings });
  });
}
```

## 実装ステップ

### Phase 1: Claude API クライアント実装

- [ ] src/services/claude-api-client.ts作成
- [ ] ClaudeAPIClientクラス実装
- [ ] 基本的なメッセージ送信

### Phase 2: プロンプトエンジニアリング

- [ ] システムプロンプト設計
- [ ] ユーザープロンプト構築
- [ ] JSON抽出ロジック

### Phase 3: ストリーミング実装

- [ ] generatePluginStream実装
- [ ] チャンクハンドリング
- [ ] UIへの反映

### Phase 4: エラーハンドリング

- [ ] API エラー処理
- [ ] JSON パースエラー処理
- [ ] バリデーションエラー処理

### Phase 5: APIキー管理

- [ ] APIキー設定UI
- [ ] APIキー保存（暗号化検討）
- [ ] APIキー検証

### Phase 6: 最適化

- [ ] レスポンスキャッシュ
- [ ] リトライロジック
- [ ] レート制限対応

### Phase 7: テスト実装

- [ ] ユニットテスト
- [ ] モックAPI使用テスト
- [ ] 実際のAPI呼び出しテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| @anthropic-ai/sdk | Claude API | ^0.32.0 |
| TypeScript | 型安全性 | ^5.6.0 |
| Zod | バリデーション | ^3.23.0 |

## ファイル構成

```
src/
├── services/
│   ├── claude-api-client.ts      # Claude APIクライアント
│   └── ai-service.ts             # AIサービス
└── sidepanel/
    └── components/
        └── SettingsPanel.tsx     # APIキー設定UI
```

## 依存関係

**前提条件:**
- 01_plugin_schema完了
- 09_chat_ui完了

**この機能を使用する機能:**
- 09_chat_ui

## テスト観点

- [ ] Claude APIへの接続が正常に動作する
- [ ] プラグインJSONが正しく生成される
- [ ] ストリーミングが正常に動作する
- [ ] エラーが適切にハンドリングされる
- [ ] APIキーの保存・読み込みが正常に動作する

## セキュリティ考慮事項

1. **APIキーの保護**
   - chrome.storage.localで保存（暗号化検討）
   - コンソールログに出力しない

2. **レスポンスの検証**
   - 必ずバリデーション実行
   - 不正なJSONの拒否

## 注意点・制約事項

1. **APIコスト**
   - トークン数を考慮
   - レート制限の管理

2. **レスポンス品質**
   - プロンプトの継続的改善
   - Few-shot examplesの追加検討

3. **エラーハンドリング**
   - ネットワークエラー
   - APIキーの有効期限
   - レート制限エラー

## 次のステップ

✅ AI統合実装完了後
→ **11_plugin_management_ui.md**: プラグイン管理UIの実装
