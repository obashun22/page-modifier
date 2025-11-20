/**
 * Page Modifier - Zod Schema Definitions
 *
 * プラグインJSONのバリデーションスキーマ
 */

import { z } from 'zod';
import type {
  Plugin,
  Operation,
  Element,
  Event,
  Condition,
} from './types';
import { parseMatchPattern } from '../utils/plugin-utils';

// ==================== 基本スキーマ ====================

/** スタイルオブジェクトスキーマ */
export const StyleObjectSchema = z.record(z.string());

/** 属性オブジェクトスキーマ */
export const AttributeObjectSchema = z.record(z.string());

/**
 * シンプルなドメイン表記をChrome Extension Match Patternに変換
 *
 * 変換ルール:
 * - "*" → "<all_urls>"
 * - "example.com" → "https://example.com/*"
 * - "*.example.com" → "https://*.example.com/*"
 * - "example.com/path/*" → "https://example.com/path/*"
 * - "https://..." → そのまま（既存のMatch Pattern形式）
 * - "<all_urls>" → そのまま
 */
function convertToMatchPattern(value: string): string {
  // <all_urls> はそのまま
  if (value === '<all_urls>') {
    return value;
  }

  // 既にMatch Pattern形式（プロトコル含む）ならそのまま
  if (value.includes('://')) {
    return value;
  }

  // 全サイト指定
  if (value === '*') {
    return '<all_urls>';
  }

  // シンプル表記をMatch Patternに変換
  let pattern = value;

  // プロトコルを追加
  pattern = 'https://' + pattern;

  // 末尾に/*がなければ追加
  if (!pattern.endsWith('/*')) {
    pattern = pattern + '/*';
  }

  return pattern;
}

/**
 * Match Patternスキーマ（バリデーションのみ、変換なし）
 *
 * 入力形式:
 * - シンプル表記: "example.com", "*.example.com", "*"
 * - Match Pattern: "https://example.com/*", "<all_urls>"
 *
 * 出力: 入力値をそのまま保存（実行時に変換）
 */
const MatchPatternSchema = z.string()
  .min(1, 'ドメインは空文字列にできません')
  .refine(
    (value) => {
      // シンプル表記をMatch Patternに変換してバリデーション
      // （実際の保存値は変換しない）
      const pattern = convertToMatchPattern(value);
      if (pattern === '<all_urls>') {
        return true;
      }

      const parsed = parseMatchPattern(pattern);
      return parsed !== null;
    },
    {
      message: '無効なドメイン形式です。有効な例: "example.com", "*.github.com", "*"',
    }
  );

// ==================== 条件スキーマ ====================

/** 条件スキーマ */
export const ConditionSchema = z.object({
  type: z.enum(['exists', 'notExists', 'matches', 'custom']),
  selector: z.string().optional(),
  pattern: z.string().optional(),
  code: z.string().optional(),
}) satisfies z.ZodType<Condition>;

// ==================== イベントスキーマ ====================

/** イベントスキーマ */
export const EventSchema = z.object({
  type: z.enum([
    'click',
    'dblclick',
    'mouseenter',
    'mouseleave',
    'focus',
    'blur',
    'change',
    'submit',
    'keydown',
    'keyup',
  ]),
  code: z.string().min(1, 'codeは必須です'),
  condition: ConditionSchema.optional(),
}) satisfies z.ZodType<Event>;

// ==================== 要素スキーマ（再帰的） ====================

/**
 * 要素スキーマ
 *
 * z.lazy()を使用して再帰的な構造を実現
 * 子要素は最大10階層まで推奨
 */
export const ElementSchema: z.ZodType<Element> = z.lazy(() =>
  z.object({
    tag: z.string().min(1),
    attributes: AttributeObjectSchema.optional(),
    style: StyleObjectSchema.optional(),
    textContent: z.string().optional(),
    innerHTML: z.string().optional(),
    children: z.array(ElementSchema).optional(),
    events: z.array(EventSchema).optional(),
  })
);

// ==================== 操作スキーマ ====================

/** 操作定義の共通フィールド */
const OperationBaseSchema = z.object({
  id: z.string().uuid('idはUUID形式である必要があります'),
  description: z.string(),
  condition: ConditionSchema.optional(),
});

/** insert操作パラメータスキーマ */
const InsertParamsSchema = z.object({
  selector: z.string().min(1, 'selectorは必須です'),
  position: z.enum(['beforebegin', 'afterbegin', 'beforeend', 'afterend']),
  element: ElementSchema,
});

/** update操作パラメータスキーマ */
const UpdateParamsSchema = z.object({
  selector: z.string().min(1, 'selectorは必須です'),
  style: StyleObjectSchema.optional(),
  attributes: AttributeObjectSchema.optional(),
  textContent: z.string().optional(),
}).refine(
  (data) => {
    // style, attributes, textContentのいずれかが必須
    return data.style !== undefined || data.attributes !== undefined || data.textContent !== undefined;
  },
  {
    message: 'update操作にはstyle, attributes, textContentのいずれかが必須です',
  }
);

/** delete操作パラメータスキーマ */
const DeleteParamsSchema = z.object({
  selector: z.string().min(1, 'selectorは必須です'),
});

/** execute操作パラメータスキーマ */
const ExecuteParamsSchema = z.object({
  code: z.string().min(1, 'codeは必須です'),
  run: z.enum(['once', 'always']).optional(),
});

/** 操作スキーマ（Discriminated Union） */
export const OperationSchema = z.discriminatedUnion('type', [
  OperationBaseSchema.extend({
    type: z.literal('insert'),
    params: InsertParamsSchema,
  }),
  OperationBaseSchema.extend({
    type: z.literal('update'),
    params: UpdateParamsSchema,
  }),
  OperationBaseSchema.extend({
    type: z.literal('delete'),
    params: DeleteParamsSchema,
  }),
  OperationBaseSchema.extend({
    type: z.literal('execute'),
    params: ExecuteParamsSchema,
  }),
]) satisfies z.ZodType<Operation>;

// ==================== プラグインスキーマ ====================

/**
 * プラグインスキーマ
 *
 * プラグインJSONの完全なバリデーション
 */
export const PluginSchema = z.object({
  id: z.string().uuid('idはUUID形式である必要があります'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'バージョンはsemver形式（例: 1.0.0）である必要があります'),
  description: z.string().optional(),
  targetDomains: z.array(MatchPatternSchema).min(1, '少なくとも1つのMatch Patternを指定してください'),
  enabled: z.boolean(),
  operations: z.array(OperationSchema).min(1, '少なくとも1つの操作を指定してください'),
}) satisfies z.ZodType<Plugin>;

// ==================== エクスポート ====================

export type {
  Plugin,
  Operation,
  Element,
  Event,
  Condition,
} from './types';
