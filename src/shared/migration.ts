/**
 * Page Modifier - Migration Utilities
 *
 * 旧形式のプラグイン定義を新形式に自動変換する機能
 */

import type { Operation, Plugin } from './types';

/**
 * 旧形式の操作タイプ
 */
type LegacyOperationType =
  | 'insert'
  | 'remove'
  | 'hide'
  | 'show'
  | 'style'
  | 'modify'
  | 'replace'
  | 'execute';

/**
 * 旧形式の操作定義
 */
interface LegacyOperation {
  id: string;
  description: string;
  type: LegacyOperationType;
  selector?: string;
  position?: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';
  element?: any;
  style?: Record<string, string>;
  attributes?: Record<string, string>;
  condition?: any;
  code?: string;
  run?: 'once' | 'always';
}

/**
 * 旧形式のプラグイン定義
 */
interface LegacyPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  targetDomains: string[];
  enabled: boolean;
  operations: LegacyOperation[];
}

/**
 * マイグレーション結果
 */
export interface MigrationResult {
  success: boolean;
  plugin?: Plugin;
  warnings: string[];
  errors: string[];
}

/**
 * 旧形式の操作を新形式に変換
 *
 * @param legacyOp 旧形式の操作
 * @returns 新形式の操作、または変換失敗時はnull
 */
function migrateOperation(legacyOp: LegacyOperation): {
  operation: Operation | null;
  warnings: string[];
  error?: string;
} {
  const warnings: string[] = [];

  try {
    switch (legacyOp.type) {
      case 'insert': {
        // insertはそのまま変換
        if (!legacyOp.selector || !legacyOp.element) {
          return {
            operation: null,
            warnings,
            error: `insert操作(id: ${legacyOp.id})にselectorまたはelementが不足しています`,
          };
        }
        return {
          operation: {
            id: legacyOp.id,
            description: legacyOp.description,
            type: 'insert',
            params: {
              selector: legacyOp.selector,
              position: legacyOp.position || 'beforeend',
              element: legacyOp.element,
            },
            condition: legacyOp.condition,
          },
          warnings,
        };
      }

      case 'remove': {
        // remove → delete
        if (!legacyOp.selector) {
          return {
            operation: null,
            warnings,
            error: `remove操作(id: ${legacyOp.id})にselectorが不足しています`,
          };
        }
        warnings.push(`操作(id: ${legacyOp.id})をremoveからdeleteに変換しました`);
        return {
          operation: {
            id: legacyOp.id,
            description: legacyOp.description,
            type: 'delete',
            params: {
              selector: legacyOp.selector,
            },
            condition: legacyOp.condition,
          },
          warnings,
        };
      }

      case 'hide': {
        // hide → update (style: {display: 'none'})
        if (!legacyOp.selector) {
          return {
            operation: null,
            warnings,
            error: `hide操作(id: ${legacyOp.id})にselectorが不足しています`,
          };
        }
        warnings.push(`操作(id: ${legacyOp.id})をhideからupdate(display: 'none')に変換しました`);
        return {
          operation: {
            id: legacyOp.id,
            description: legacyOp.description,
            type: 'update',
            params: {
              selector: legacyOp.selector,
              style: { display: 'none' },
            },
            condition: legacyOp.condition,
          },
          warnings,
        };
      }

      case 'show': {
        // show → update (style: {display: ''})
        if (!legacyOp.selector) {
          return {
            operation: null,
            warnings,
            error: `show操作(id: ${legacyOp.id})にselectorが不足しています`,
          };
        }
        warnings.push(`操作(id: ${legacyOp.id})をshowからupdate(display: '')に変換しました`);
        return {
          operation: {
            id: legacyOp.id,
            description: legacyOp.description,
            type: 'update',
            params: {
              selector: legacyOp.selector,
              style: { display: '' },
            },
            condition: legacyOp.condition,
          },
          warnings,
        };
      }

      case 'style': {
        // style → update (style保持)
        if (!legacyOp.selector || !legacyOp.style) {
          return {
            operation: null,
            warnings,
            error: `style操作(id: ${legacyOp.id})にselectorまたはstyleが不足しています`,
          };
        }
        warnings.push(`操作(id: ${legacyOp.id})をstyleからupdateに変換しました`);
        return {
          operation: {
            id: legacyOp.id,
            description: legacyOp.description,
            type: 'update',
            params: {
              selector: legacyOp.selector,
              style: legacyOp.style,
            },
            condition: legacyOp.condition,
          },
          warnings,
        };
      }

      case 'modify': {
        // modify → update (attributes保持)
        if (!legacyOp.selector || !legacyOp.attributes) {
          return {
            operation: null,
            warnings,
            error: `modify操作(id: ${legacyOp.id})にselectorまたはattributesが不足しています`,
          };
        }
        warnings.push(`操作(id: ${legacyOp.id})をmodifyからupdateに変換しました`);
        return {
          operation: {
            id: legacyOp.id,
            description: legacyOp.description,
            type: 'update',
            params: {
              selector: legacyOp.selector,
              attributes: legacyOp.attributes,
            },
            condition: legacyOp.condition,
          },
          warnings,
        };
      }

      case 'replace': {
        // replace → 削除（delete + insertに分割することを推奨）
        warnings.push(
          `操作(id: ${legacyOp.id}, type: replace)は自動変換できません。delete + insertに手動で分割してください。`
        );
        return {
          operation: null,
          warnings,
          error: `replace操作(id: ${legacyOp.id})は自動変換できません`,
        };
      }

      case 'execute': {
        // executeはそのまま変換
        if (!legacyOp.code) {
          return {
            operation: null,
            warnings,
            error: `execute操作(id: ${legacyOp.id})にcodeが不足しています`,
          };
        }
        return {
          operation: {
            id: legacyOp.id,
            description: legacyOp.description,
            type: 'execute',
            params: {
              code: legacyOp.code,
              run: legacyOp.run,
            },
            condition: legacyOp.condition,
          },
          warnings,
        };
      }

      default: {
        return {
          operation: null,
          warnings,
          error: `未知の操作タイプ: ${(legacyOp as any).type}`,
        };
      }
    }
  } catch (error) {
    return {
      operation: null,
      warnings,
      error: `操作(id: ${legacyOp.id})の変換中にエラーが発生しました: ${error}`,
    };
  }
}

/**
 * 旧形式のプラグインを新形式に変換
 *
 * @param legacyPlugin 旧形式のプラグイン
 * @returns マイグレーション結果
 */
export function migratePlugin(legacyPlugin: LegacyPlugin): MigrationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const newOperations: Operation[] = [];

  // 各操作を変換
  for (const legacyOp of legacyPlugin.operations) {
    const result = migrateOperation(legacyOp);
    warnings.push(...result.warnings);

    if (result.operation) {
      newOperations.push(result.operation);
    } else {
      errors.push(result.error || `操作(id: ${legacyOp.id})の変換に失敗しました`);
    }
  }

  // エラーがある場合は失敗
  if (errors.length > 0) {
    return {
      success: false,
      warnings,
      errors,
    };
  }

  // 新形式のプラグインを作成
  const newPlugin: Plugin = {
    id: legacyPlugin.id,
    name: legacyPlugin.name,
    version: legacyPlugin.version,
    description: legacyPlugin.description,
    targetDomains: legacyPlugin.targetDomains,
    enabled: legacyPlugin.enabled,
    operations: newOperations,
  };

  return {
    success: true,
    plugin: newPlugin,
    warnings,
    errors: [],
  };
}

/**
 * プラグインが旧形式かどうかを判定
 *
 * @param plugin プラグイン定義
 * @returns 旧形式の場合はtrue
 */
export function isLegacyPlugin(plugin: any): boolean {
  if (!plugin || !plugin.operations || !Array.isArray(plugin.operations)) {
    return false;
  }

  // operationsが空の場合は判定不可能（新形式として扱う）
  if (plugin.operations.length === 0) {
    return false;
  }

  // 最初の操作をチェック
  const firstOp = plugin.operations[0];

  // 新形式の特徴: typeとparamsフィールドがある
  if (firstOp.type && firstOp.params && typeof firstOp.params === 'object') {
    return false;
  }

  // 旧形式の特徴: typeはあるがparamsフィールドがない
  // かつ、selector/element/style/attributes/codeなどがトップレベルにある
  if (
    firstOp.type &&
    !firstOp.params &&
    (firstOp.selector !== undefined ||
      firstOp.element !== undefined ||
      firstOp.style !== undefined ||
      firstOp.attributes !== undefined ||
      firstOp.code !== undefined)
  ) {
    return true;
  }

  // 判定不可能な場合は旧形式として扱わない
  return false;
}

/**
 * プラグインを自動的にマイグレーション
 *
 * 旧形式の場合のみ変換を実行し、新形式の場合はそのまま返す
 *
 * @param plugin プラグイン定義
 * @returns マイグレーション結果
 */
export function autoMigratePlugin(plugin: any): MigrationResult {
  // 新形式の場合はそのまま返す
  if (!isLegacyPlugin(plugin)) {
    return {
      success: true,
      plugin: plugin as Plugin,
      warnings: [],
      errors: [],
    };
  }

  // 旧形式の場合は変換
  console.log(`[Migration] Migrating legacy plugin: ${plugin.name} (id: ${plugin.id})`);
  const result = migratePlugin(plugin as LegacyPlugin);

  if (result.warnings.length > 0) {
    console.warn(`[Migration] Warnings for plugin ${plugin.name}:`, result.warnings);
  }

  if (result.errors.length > 0) {
    console.error(`[Migration] Errors for plugin ${plugin.name}:`, result.errors);
  }

  return result;
}
