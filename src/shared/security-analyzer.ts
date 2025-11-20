/**
 * Page Modifier - Security Analyzer
 *
 * プラグインのセキュリティリスクを分析・評価
 */

import type { Plugin, Operation } from './types';
import type { SecurityLevel } from './storage-types';

/**
 * セキュリティレベルの値
 */
const SecurityLevelValue = {
  SAFE: 'safe' as const,         // 🟢 安全（自動適用可）
  MODERATE: 'moderate' as const, // 🟡 中程度（初回承認必要）
  ADVANCED: 'advanced' as const, // 🔴 高リスク（毎回承認必要）
};

/**
 * リスクタイプ
 */
export type RiskType =
  | 'custom_js'           // カスタムJavaScript実行
  | 'inner_html'          // innerHTML使用
  | 'external_api'        // 外部API通信
  | 'dangerous_selector'  // 危険なセレクター
  | 'suspicious_url';     // 疑わしいURL

/**
 * セキュリティリスク
 */
export interface SecurityRisk {
  type: RiskType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

/**
 * セキュリティ分析結果
 */
export interface SecurityAnalysis {
  level: SecurityLevel;
  risks: SecurityRisk[];
  warnings: string[];
  recommendations: string[];
}

/**
 * セキュリティアナライザー
 *
 * プラグインを分析し、セキュリティリスクを評価
 */
export class SecurityAnalyzer {
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

      // カスタム条件検出
      if (operation.condition?.type === 'custom' && operation.condition.code) {
        risks.push({
          type: 'custom_js',
          severity: 'high',
          description: 'カスタム条件判定コードが含まれています',
          location: `operation[${index}].condition`,
        });
      }

      // innerHTML使用検出（insertタイプのみ）
      if (operation.type === 'insert' && operation.params.element.innerHTML) {
        risks.push({
          type: 'inner_html',
          severity: 'medium',
          description: 'innerHTML使用によるXSSリスクがあります',
          location: `operation[${index}].params.element`,
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

      // 危険なセレクター検出（executeを除く）
      if (operation.type !== 'execute' && this.isDangerousSelector(operation.params.selector)) {
        risks.push({
          type: 'dangerous_selector',
          severity: 'low',
          description: '広範囲なセレクターが使用されています',
          location: `operation[${index}].params.selector`,
        });
      }

      // 疑わしいURL検出
      const suspiciousUrl = this.findSuspiciousUrls(operation);
      if (suspiciousUrl) {
        risks.push({
          type: 'suspicious_url',
          severity: 'high',
          description: `疑わしいURLが検出されました: ${suspiciousUrl}`,
          location: `operation[${index}]`,
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
    // executeタイプのoperationのcodeフィールドをチェック
    if (operation.type === 'execute' && operation.params.code) {
      return true;
    }

    // insertタイプのelement.eventsの中のcodeをチェック
    if (operation.type === 'insert') {
      const element = operation.params.element;
      if (element.events && element.events.length > 0) {
        // イベントコードが単純な外部API呼び出しのみの場合は custom_js とみなさない
        const hasNonApiCode = element.events.some(event => {
          // 外部API呼び出しパターンのみの場合は除外
          const hasApiCall = /fetch\s*\(|XMLHttpRequest|axios\./i.test(event.code);
          if (!hasApiCall) {
            // API呼び出しがない場合は custom JS
            return true;
          }

          // API呼び出しがある場合、他の危険なパターンがあるかチェック
          const hasDangerousPatterns =
            /eval\(|Function\(|setTimeout\(|setInterval\(/i.test(event.code) ||
            /document\.(write|writeln|open|close)\(/i.test(event.code) ||
            /\.innerHTML\s*=/i.test(event.code) ||
            /(javascript|data|vbscript):/i.test(event.code);

          return hasDangerousPatterns;
        });

        if (hasNonApiCode) {
          return true;
        }
      }

      // 子要素も再帰的にチェック
      if (element.children) {
        return element.children.some(
          (child) => this.hasCustomJSInElement(child)
        );
      }
    }

    return false;
  }

  /**
   * 要素内のカスタムJSを再帰的に検出
   */
  private hasCustomJSInElement(element: any): boolean {
    if (element.events && element.events.length > 0) {
      // イベントコードが単純な外部API呼び出しのみの場合は custom_js とみなさない
      const hasNonApiCode = element.events.some((event: any) => {
        // 外部API呼び出しパターンのみの場合は除外
        const hasApiCall = /fetch\s*\(|XMLHttpRequest|axios\./i.test(event.code);
        if (!hasApiCall) {
          // API呼び出しがない場合は custom JS
          return true;
        }

        // API呼び出しがある場合、他の危険なパターンがあるかチェック
        const hasDangerousPatterns =
          /eval\(|Function\(|setTimeout\(|setInterval\(/i.test(event.code) ||
          /document\.(write|writeln|open|close)\(/i.test(event.code) ||
          /\.innerHTML\s*=/i.test(event.code) ||
          /(javascript|data|vbscript):/i.test(event.code);

        return hasDangerousPatterns;
      });

      if (hasNonApiCode) {
        return true;
      }
    }

    // イベント条件のカスタムコードをチェック
    if (element.events?.some((event: any) => event.condition?.type === 'custom' && event.condition.code)) {
      return true;
    }

    if (element.children) {
      return element.children.some((child: any) => this.hasCustomJSInElement(child));
    }

    return false;
  }

  /**
   * 外部API呼び出しを検出
   * （新設計ではイベントコードでAPI呼び出しを検出）
   */
  private hasExternalAPI(operation: Operation): boolean {
    if (operation.type === 'insert') {
      const events = operation.params.element.events;
      if (events) {
        // イベントコード内でfetch/XMLHttpRequestを使用しているかチェック
        return events.some((event) =>
          /fetch\s*\(|XMLHttpRequest|axios\./i.test(event.code)
        );
      }
    }
    return false;
  }

  /**
   * API URLを抽出
   * （新設計ではイベントコードからURL抽出を試みる）
   */
  private extractAPIUrl(operation: Operation): string | null {
    if (operation.type === 'insert') {
      const events = operation.params.element.events;
      if (events) {
        for (const event of events) {
          // fetch('url') や fetch("url") のパターンを検索
          const match = event.code.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (match) {
            return match[1];
          }
        }
      }
    }
    return null;
  }

  /**
   * 危険なセレクターかチェック
   */
  private isDangerousSelector(selector: string): boolean {
    const dangerousPatterns = [
      /^body$/,
      /^html$/,
      /^\*$/,
      /^div$/,    // タグのみは範囲が広すぎる
      /^span$/,
      /^p$/,
      /^a$/,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(selector));
  }

  /**
   * 疑わしいURLを検出
   * （新設計ではイベントコード内のURLパターンを検出）
   */
  private findSuspiciousUrls(operation: Operation): string | null {
    if (operation.type === 'insert') {
      const events = operation.params.element.events;
      if (events) {
        for (const event of events) {
          // javascript:、data:、vbscript: などの危険なスキームを検出
          const match = event.code.match(/(javascript|data|vbscript):[^\s'"]+/i);
          if (match) {
            return match[0];
          }

          // window.location や location.href での危険なURL設定を検出
          const locationMatch = event.code.match(/(window\.)?location(\.href)?\s*=\s*['"`]([^'"`]+)['"`]/);
          if (locationMatch) {
            const url = locationMatch[3];
            if (url.toLowerCase().startsWith('javascript:') ||
                url.toLowerCase().startsWith('data:') ||
                url.toLowerCase().startsWith('vbscript:')) {
              return url;
            }
          }
        }
      }
    }

    return null;
  }


  /**
   * セキュリティレベルを決定
   */
  private determineSecurityLevel(risks: SecurityRisk[]): SecurityLevel {
    const hasHighRisk = risks.some((r) => r.severity === 'high');
    const hasMediumRisk = risks.some((r) => r.severity === 'medium');

    if (hasHighRisk) {
      return SecurityLevelValue.ADVANCED;
    } else if (hasMediumRisk) {
      return SecurityLevelValue.MODERATE;
    } else {
      return SecurityLevelValue.SAFE;
    }
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(risks: SecurityRisk[]): string[] {
    const recommendations: string[] = [];

    if (risks.some((r) => r.type === 'custom_js')) {
      recommendations.push(
        'カスタムJSの代わりに事前定義アクションの使用を検討してください'
      );
    }

    if (risks.some((r) => r.type === 'inner_html')) {
      recommendations.push(
        'innerHTMLの代わりにtextContentの使用を検討してください'
      );
    }

    if (risks.some((r) => r.type === 'external_api')) {
      recommendations.push(
        '外部API通信は信頼できるドメインのみに制限してください'
      );
    }

    if (risks.some((r) => r.type === 'dangerous_selector')) {
      recommendations.push(
        'より具体的なセレクターを使用してください'
      );
    }

    if (risks.some((r) => r.type === 'suspicious_url')) {
      recommendations.push(
        '疑わしいURLは削除してください'
      );
    }

    return recommendations;
  }

  /**
   * セキュリティレベルの表示名を取得
   */
  static getSecurityLevelLabel(level: SecurityLevel): string {
    switch (level) {
      case SecurityLevelValue.SAFE:
        return '🟢 安全';
      case SecurityLevelValue.MODERATE:
        return '🟡 中程度';
      case SecurityLevelValue.ADVANCED:
        return '🔴 高リスク';
      default:
        return '不明';
    }
  }
}
