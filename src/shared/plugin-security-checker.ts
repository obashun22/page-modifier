/**
 * Page Modifier - Plugin Security Checker
 *
 * プラグインのセキュリティレベルをチェックし、
 * 現在の設定で実行可能かを判定します。
 */

import type { Plugin } from './types';
import type { SecurityLevel } from './storage-types';
import { SecurityAnalyzer } from './security-analyzer';

/**
 * プラグインを分析（ヘルパー関数）
 */
function analyzePlugin(plugin: Plugin) {
  const analyzer = new SecurityAnalyzer();
  return analyzer.analyze(plugin);
}

/**
 * プラグインが現在のセキュリティレベルで実行可能かチェック
 */
export function canExecutePlugin(plugin: Plugin, securityLevel: SecurityLevel): boolean {
  const analysis = analyzePlugin(plugin);

  switch (securityLevel) {
    case 'safe':
      // safeレベルはsafeプラグインのみ実行可能
      return analysis.level === 'safe';

    case 'moderate':
      // moderateレベルはsafeとmoderateプラグインを実行可能
      return analysis.level === 'safe' || analysis.level === 'moderate';

    case 'advanced':
      // advancedレベルは全てのプラグインを実行可能
      return true;

    default:
      return false;
  }
}

/**
 * プラグインにカスタムJSアクションが含まれているかチェック
 */
export function hasCustomJSAction(plugin: Plugin): boolean {
  for (const operation of plugin.operations) {
    // executeタイプのoperationのcodeフィールドをチェック
    if (operation.type === 'execute' && operation.params.code) {
      return true;
    }

    // operationのconditionをチェック
    if (operation.condition?.type === 'custom' && operation.condition.code) {
      return true;
    }

    // insertタイプのoperationのelementにeventsが含まれている
    if (operation.type === 'insert') {
      const element = operation.params.element;
      if (element.events) {
        for (const event of element.events) {
          // アクションのカスタムJSをチェック
          if (event.action.type === 'custom' && event.action.params.code) {
            return true;
          }
          // イベント条件のカスタムコードをチェック
          if (event.condition?.type === 'custom' && event.condition.code) {
            return true;
          }
        }
      }

      // 子要素も再帰的にチェック
      if (element.children) {
        if (hasCustomJSInChildren(element.children)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * 子要素内のカスタムJSを再帰的にチェック
 */
function hasCustomJSInChildren(children: any[]): boolean {
  for (const child of children) {
    if (child.events) {
      for (const event of child.events) {
        // アクションのカスタムJSをチェック
        if (event.action.type === 'custom' && event.action.params.code) {
          return true;
        }
        // イベント条件のカスタムコードをチェック
        if (event.condition?.type === 'custom' && event.condition.code) {
          return true;
        }
      }
    }

    if (child.children && hasCustomJSInChildren(child.children)) {
      return true;
    }
  }
  return false;
}

/**
 * セキュリティレベルに応じたエラーメッセージを取得
 */
export function getSecurityLevelErrorMessage(
  plugin: Plugin,
  _currentLevel: SecurityLevel
): string {
  const analysis = analyzePlugin(plugin);

  if (hasCustomJSAction(plugin)) {
    return `このプラグインはカスタムJavaScriptコードを実行します。セキュリティレベルを「Advanced」に設定してください。`;
  }

  switch (analysis.level) {
    case 'moderate':
      return `このプラグインには外部API通信が含まれています。セキュリティレベルを「Moderate」以上に設定してください。`;

    case 'advanced':
      return `このプラグインには高度な機能が含まれています。セキュリティレベルを「Advanced」に設定してください。`;

    default:
      return `このプラグインを実行するには、セキュリティレベルを上げる必要があります。`;
  }
}

/**
 * セキュリティレベルの表示名を取得
 */
export function getSecurityLevelLabel(level: SecurityLevel): string {
  switch (level) {
    case 'safe':
      return '🟢 Safe（安全）';
    case 'moderate':
      return '🟡 Moderate（中程度）';
    case 'advanced':
      return '🔴 Advanced（高度）';
    default:
      return level;
  }
}

/**
 * セキュリティレベルの説明を取得
 */
export function getSecurityLevelDescription(level: SecurityLevel): string {
  switch (level) {
    case 'safe':
      return '基本的なDOM操作のみ許可。外部通信やカスタムJSは実行されません。';
    case 'moderate':
      return '外部API通信を許可。カスタムJSは実行されません。';
    case 'advanced':
      return '全ての機能を許可。カスタムJSコードが実行可能です。';
    default:
      return '';
  }
}
