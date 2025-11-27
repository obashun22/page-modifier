/**
 * Claude API Client - Unit Tests
 *
 * extractPluginJSON メソッドのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ClaudeAPIClientクラスをモックするために、private methodにアクセスする
class TestableClaudeAPIClient {
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  extractPluginJSON(text: string): any {
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

    // plugin.idがない、または無効なUUID形式の場合はUUIDを生成
    if (!pluginData.id || !this.isValidUUID(pluginData.id)) {
      pluginData.id = crypto.randomUUID();
    }

    // operationsのidを処理
    if (pluginData.operations && Array.isArray(pluginData.operations)) {
      pluginData.operations = pluginData.operations.map((op: any) => {
        // idがない、または無効なUUID形式の場合はUUIDを生成
        if (!op.id || !this.isValidUUID(op.id)) {
          return { ...op, id: crypto.randomUUID() };
        }
        return op;
      });
    }

    return pluginData;
  }
}

describe('ClaudeAPIClient - extractPluginJSON', () => {
  let client: TestableClaudeAPIClient;

  beforeEach(() => {
    client = new TestableClaudeAPIClient();
  });

  describe('plugin.id の自動生成', () => {
    it('plugin.idがない場合、UUIDを自動生成する', () => {
      const text = `\`\`\`json
{
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": []
}
\`\`\``;

      const result = client.extractPluginJSON(text);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('plugin.idが有効なUUID形式の場合、そのまま保持する', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      const text = `\`\`\`json
{
  "id": "${existingId}",
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": []
}
\`\`\``;

      const result = client.extractPluginJSON(text);

      expect(result.id).toBe(existingId);
    });

    it('plugin.idが無効なUUID形式の場合、UUIDを自動生成して置き換える', () => {
      const text = `\`\`\`json
{
  "id": "my-plugin",
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": []
}
\`\`\``;

      const result = client.extractPluginJSON(text);

      expect(result.id).not.toBe('my-plugin');
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('operation.id の自動生成', () => {
    it('operation.idがない場合、UUIDを自動生成する', () => {
      const text = `\`\`\`json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": [
    {
      "description": "Test operation",
      "type": "insert",
      "params": {
        "selector": "body",
        "position": "afterbegin",
        "element": { "tag": "div" }
      }
    }
  ]
}
\`\`\``;

      const result = client.extractPluginJSON(text);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].id).toBeDefined();
      expect(result.operations[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('operation.idが無効なUUID形式の場合、UUIDを自動生成して置き換える', () => {
      const text = `\`\`\`json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": [
    {
      "id": "insert-button",
      "description": "Insert button",
      "type": "insert",
      "params": {
        "selector": "body",
        "position": "afterbegin",
        "element": { "tag": "button" }
      }
    }
  ]
}
\`\`\``;

      const result = client.extractPluginJSON(text);

      expect(result.operations[0].id).not.toBe('insert-button');
      expect(result.operations[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('operation.idが有効なUUID形式の場合、そのまま保持する', () => {
      const existingOpId = '650e8400-e29b-41d4-a716-446655440001';
      const text = `\`\`\`json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": [
    {
      "id": "${existingOpId}",
      "description": "Test operation",
      "type": "insert",
      "params": {
        "selector": "body",
        "position": "afterbegin",
        "element": { "tag": "div" }
      }
    }
  ]
}
\`\`\``;

      const result = client.extractPluginJSON(text);

      expect(result.operations[0].id).toBe(existingOpId);
    });

    it('複数のoperationがある場合、それぞれに適切にIDを処理する', () => {
      const existingOpId = '650e8400-e29b-41d4-a716-446655440001';
      const text = `\`\`\`json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": [
    {
      "id": "${existingOpId}",
      "description": "Existing operation",
      "type": "insert",
      "params": {
        "selector": "body",
        "position": "afterbegin",
        "element": { "tag": "div" }
      }
    },
    {
      "description": "New operation",
      "type": "execute",
      "params": {
        "code": "console.log('test');"
      }
    },
    {
      "id": "invalid-id",
      "description": "Operation with invalid ID",
      "type": "delete",
      "params": {
        "selector": ".test"
      }
    }
  ]
}
\`\`\``;

      const result = client.extractPluginJSON(text);

      expect(result.operations).toHaveLength(3);
      // 既存の有効なIDは保持
      expect(result.operations[0].id).toBe(existingOpId);
      // IDがない場合は生成
      expect(result.operations[1].id).toBeDefined();
      expect(result.operations[1].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      // 無効なIDは置き換え
      expect(result.operations[2].id).not.toBe('invalid-id');
      expect(result.operations[2].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('JSONパース', () => {
    it('```json```ブロックがない場合、全体をパースする', () => {
      const text = `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Test Plugin",
  "version": "1.0.0",
  "targetDomains": ["example.com"],
  "enabled": true,
  "operations": []
}`;

      const result = client.extractPluginJSON(text);

      expect(result.name).toBe('Test Plugin');
    });

    it('無効なJSONの場合、エラーをスローする', () => {
      const text = 'This is not JSON';

      expect(() => {
        client.extractPluginJSON(text);
      }).toThrow('有効なJSONを抽出できませんでした');
    });
  });
});
