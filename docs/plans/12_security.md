# 12. セキュリティ

## 機能概要

拡張機能全体のセキュリティ対策を実装します。JSONバリデーション、カスタムJSサンドボックス化、外部API通信の制限、XSS対策、CSP設定、およびプラグインの危険度評価を提供します。

## 実装内容

### 1. セキュリティレベル評価

```typescript
enum SecurityLevel {
  SAFE = 'safe',           // 🟢 安全（自動適用可）
  MODERATE = 'moderate',   // 🟡 中程度（初回承認必要）
  ADVANCED = 'advanced',   // 🔴 高リスク（毎回承認必要）
}

interface SecurityAnalysis {
  level: SecurityLevel;
  risks: SecurityRisk[];
  warnings: string[];
  recommendations: string[];
}

interface SecurityRisk {
  type: RiskType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

type RiskType =
  | 'custom_js'          // カスタムJavaScript実行
  | 'inner_html'         // innerHTML使用
  | 'external_api'       // 外部API通信
  | 'dangerous_selector' // 危険なセレクター
  | 'suspicious_url';    // 疑わしいURL
```

### 2. セキュリティアナライザー

```typescript
class SecurityAnalyzer {
  /**
   * プラグインを分析
   */
  analyze(plugin: Plugin): SecurityAnalysis {
    const risks: SecurityRisk[] = [];
    const warnings: string[] = [];

    // 各操作を分析
    plugin.operations.forEach((operation, index) => {
      // カスタムJS検出
      if (this.hasCustomJS(operation)) {
        risks.push({
          type: 'custom_js',
          severity: 'high',
          description: 'カスタムJavaScriptコードが含まれています',
          location: `operation[${index}]`,
        });
      }

      // innerHTML使用検出
      if (operation.element?.innerHTML) {
        risks.push({
          type: 'inner_html',
          severity: 'medium',
          description: 'innerHTML使用によるXSSリスクがあります',
          location: `operation[${index}].element`,
        });
      }

      // 外部API呼び出し検出
      if (this.hasExternalAPI(operation)) {
        const url = this.extractAPIUrl(operation);
        risks.push({
          type: 'external_api',
          severity: 'medium',
          description: `外部APIへの通信があります: ${url}`,
          location: `operation[${index}]`,
        });
      }

      // 危険なセレクター検出
      if (this.isDangerousSelector(operation.selector)) {
        risks.push({
          type: 'dangerous_selector',
          severity: 'low',
          description: '広範囲なセレクターが使用されています',
          location: `operation[${index}].selector`,
        });
      }
    });

    // セキュリティレベルを決定
    const level = this.determineSecurityLevel(risks);

    // 推奨事項を生成
    const recommendations = this.generateRecommendations(risks);

    return {
      level,
      risks,
      warnings,
      recommendations,
    };
  }

  /**
   * カスタムJS使用を検出
   */
  private hasCustomJS(operation: Operation): boolean {
    // customアクションの検出
    if (operation.element?.events) {
      return operation.element.events.some(
        event => event.action.type === 'custom' && event.action.code
      );
    }
    return false;
  }

  /**
   * 外部API呼び出しを検出
   */
  private hasExternalAPI(operation: Operation): boolean {
    if (operation.element?.events) {
      return operation.element.events.some(
        event => event.action.type === 'apiCall'
      );
    }
    return false;
  }

  /**
   * API URLを抽出
   */
  private extractAPIUrl(operation: Operation): string | null {
    const apiAction = operation.element?.events?.find(
      event => event.action.type === 'apiCall'
    );
    return apiAction?.action.url || null;
  }

  /**
   * 危険なセレクターかチェック
   */
  private isDangerousSelector(selector: string): boolean {
    const dangerousPatterns = [
      /^body$/,
      /^html$/,
      /^\*$/,
      /^div$/,   // タグのみは範囲が広すぎる
      /^span$/,
    ];

    return dangerousPatterns.some(pattern => pattern.test(selector));
  }

  /**
   * セキュリティレベルを決定
   */
  private determineSecurityLevel(risks: SecurityRisk[]): SecurityLevel {
    const hasHighRisk = risks.some(r => r.severity === 'high');
    const hasMediumRisk = risks.some(r => r.severity === 'medium');

    if (hasHighRisk) {
      return SecurityLevel.ADVANCED;
    } else if (hasMediumRisk) {
      return SecurityLevel.MODERATE;
    } else {
      return SecurityLevel.SAFE;
    }
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(risks: SecurityRisk[]): string[] {
    const recommendations: string[] = [];

    if (risks.some(r => r.type === 'custom_js')) {
      recommendations.push(
        'カスタムJSの代わりに事前定義アクションの使用を検討してください'
      );
    }

    if (risks.some(r => r.type === 'inner_html')) {
      recommendations.push(
        'innerHTMLの代わりにtextContentの使用を検討してください'
      );
    }

    if (risks.some(r => r.type === 'external_api')) {
      recommendations.push(
        '外部API通信は信頼できるドメインのみに制限してください'
      );
    }

    return recommendations;
  }
}
```

### 3. カスタムJSサンドボックス

```typescript
class CustomJSSandbox {
  /**
   * カスタムコードを安全に実行
   */
  execute(code: string, context: SandboxContext): any {
    // 危険なパターンを検出
    if (this.hasDangerousPatterns(code)) {
      throw new Error('危険なコードが検出されました');
    }

    // サンドボックス環境を作成
    const sandbox = this.createSandboxEnvironment(context);

    // タイムアウト付きで実行
    return this.executeWithTimeout(code, sandbox, 5000);
  }

  /**
   * 危険なパターンを検出
   */
  private hasDangerousPatterns(code: string): boolean {
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /document\.write/,
      /\.innerHTML\s*=/,
      /<script/i,
    ];

    return dangerousPatterns.some(pattern => pattern.test(code));
  }

  /**
   * サンドボックス環境を作成
   */
  private createSandboxEnvironment(context: SandboxContext): any {
    return {
      // 許可されたAPI
      console: {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
      },
      element: context.element,
      document: {
        querySelector: document.querySelector.bind(document),
        querySelectorAll: document.querySelectorAll.bind(document),
      },

      // 制限されたAPI（undefined）
      window: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      eval: undefined,
      Function: undefined,
      setTimeout: undefined,
      setInterval: undefined,
    };
  }

  /**
   * タイムアウト付きで実行
   */
  private executeWithTimeout(code: string, sandbox: any, timeout: number): any {
    let timeoutId: number;

    const promise = new Promise((resolve, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, timeout);

      try {
        const fn = new Function('sandbox', `with (sandbox) { ${code} }`);
        const result = fn(sandbox);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    return promise.finally(() => {
      clearTimeout(timeoutId);
    });
  }
}

interface SandboxContext {
  element: HTMLElement;
  event?: Event;
}
```

### 4. URL検証

```typescript
class URLValidator {
  private allowedProtocols = ['https:', 'http:'];
  private blockedDomains = [
    // 既知の悪意あるドメイン
  ];

  /**
   * URLを検証
   */
  validate(url: string): ValidationResult {
    try {
      const urlObj = new URL(url);

      // プロトコルチェック
      if (!this.allowedProtocols.includes(urlObj.protocol)) {
        return {
          valid: false,
          error: `Unsupported protocol: ${urlObj.protocol}`,
        };
      }

      // javascript:スキーム禁止
      if (urlObj.protocol === 'javascript:') {
        return {
          valid: false,
          error: 'javascript: URLs are not allowed',
        };
      }

      // ブロックリストチェック
      if (this.isBlockedDomain(urlObj.hostname)) {
        return {
          valid: false,
          error: 'Blocked domain',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid URL format',
      };
    }
  }

  /**
   * ブロックされたドメインかチェック
   */
  private isBlockedDomain(hostname: string): boolean {
    return this.blockedDomains.some(blocked =>
      hostname.endsWith(blocked)
    );
  }
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

### 5. CSP設定

```json
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; worker-src 'self'"
  }
}
```

## 実装ステップ

### Phase 1: セキュリティアナライザー実装

- [ ] src/shared/security-analyzer.ts作成
- [ ] SecurityAnalyzerクラス実装
- [ ] リスク検出ロジック
- [ ] レベル判定ロジック

### Phase 2: サンドボックス実装

- [ ] src/shared/custom-js-sandbox.ts作成
- [ ] CustomJSSandboxクラス実装
- [ ] 危険パターン検出
- [ ] タイムアウト処理

### Phase 3: バリデーション強化

- [ ] src/shared/url-validator.ts作成
- [ ] URLValidatorクラス実装
- [ ] プロトコルチェック
- [ ] ブロックリスト管理

### Phase 4: UI統合

- [ ] セキュリティレベルの表示
- [ ] リスク警告の表示
- [ ] 承認フロー実装

### Phase 5: テスト実装

- [ ] セキュリティアナライザーのテスト
- [ ] サンドボックスのテスト
- [ ] バリデーションのテスト

## 使用技術・ライブラリ

| 技術 | 用途 | バージョン |
|------|------|-----------|
| TypeScript | 型安全性 | ^5.6.0 |
| Zod | バリデーション | ^3.23.0 |

## ファイル構成

```
src/
└── shared/
    ├── security-analyzer.ts      # セキュリティ分析
    ├── custom-js-sandbox.ts      # サンドボックス
    └── url-validator.ts          # URL検証
```

## 依存関係

**前提条件:**
- 01_plugin_schema完了

**この機能を使用する機能:**
- 全機能（セキュリティは横断的関心事）

## テスト観点

- [ ] 危険なコードが検出される
- [ ] サンドボックスが危険なAPIへのアクセスを防ぐ
- [ ] タイムアウトが正常に動作する
- [ ] 不正なURLが拒否される
- [ ] セキュリティレベルが正しく判定される

## セキュリティ考慮事項

1. **多層防御**
   - バリデーション + サンドボックス + CSP

2. **最小権限の原則**
   - 必要最小限のAPIのみ許可

3. **監査ログ**
   - セキュリティイベントのログ記録

## 注意点・制約事項

1. **サンドボックスの限界**
   - 完全な隔離は困難
   - 高度な攻撃には脆弱性あり

2. **パフォーマンス**
   - セキュリティチェックのオーバーヘッド

3. **ユーザビリティ**
   - セキュリティとの バランス

## 次のステップ

✅ セキュリティ実装完了後
→ **13_testing.md**: テスト戦略の策定
