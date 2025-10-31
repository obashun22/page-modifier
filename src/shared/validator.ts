/**
 * Page Modifier - Validation Functions
 *
 * プラグインJSONのバリデーション機能
 */

import { z } from 'zod';
import { PluginSchema } from './plugin-schema';
import type { Plugin, ValidationResult, ValidationError } from './types';

/**
 * プラグインJSONをバリデーション
 *
 * @param data - バリデーション対象のプラグインデータ
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validatePlugin(pluginJson);
 * if (result.success) {
 *   console.log('Valid plugin:', result.data);
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validatePlugin(data: unknown): ValidationResult {
  try {
    const parsed = PluginSchema.parse(data);
    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        path: err.path.map(String),
        message: err.message,
      }));

      return {
        success: false,
        errors,
      };
    }

    // Zodエラー以外の場合
    return {
      success: false,
      errors: [
        {
          path: [],
          message: error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}

/**
 * プラグインJSONを安全にパース
 *
 * バリデーションに失敗した場合はnullを返す
 *
 * @param data - パース対象のプラグインデータ
 * @returns パース成功時はプラグインオブジェクト、失敗時はnull
 */
export function safeParsePlugin(data: unknown): Plugin | null {
  const result = validatePlugin(data);
  return result.success ? result.data! : null;
}

/**
 * バリデーションエラーメッセージをフォーマット
 *
 * @param errors - バリデーションエラーの配列
 * @returns フォーマットされたエラーメッセージ
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => {
      const path = error.path.length > 0 ? `${error.path.join('.')}: ` : '';
      return `${path}${error.message}`;
    })
    .join('\n');
}

/**
 * プラグインのバージョンを検証
 *
 * @param version - バージョン文字列
 * @returns semver形式として有効な場合true
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * プラグインIDを検証
 *
 * @param id - プラグインID
 * @returns 有効なIDの場合true
 */
export function isValidPluginId(id: string): boolean {
  // 英数字、ハイフン、アンダースコアのみ許可
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0;
}
