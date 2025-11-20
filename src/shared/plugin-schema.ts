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
  Action,
  Condition,
} from './types';
import { parseMatchPattern } from '../utils/plugin-utils';

// ==================== 基本スキーマ ====================

/** スタイルオブジェクトスキーマ */
export const StyleObjectSchema = z.record(z.string());

/** 属性オブジェクトスキーマ */
export const AttributeObjectSchema = z.record(z.string());

/**
 * Match Patternバリデーター
 *
 * Chrome Extension Match Pattern形式または後方互換のドメイン名形式を許可
 *
 * 有効な形式:
 * - Match Pattern: "https://example.com/*", "*://*.github.com/*", "<all_urls>"
 * - ドメイン名（後方互換）: "example.com", "*.github.com", "*"
 */
const MatchPatternSchema = z.string().refine(
  (value) => {
    // 空文字列は不可
    if (value.length === 0) {
      return false;
    }

    // Match Pattern形式の場合
    if (value.includes('://')) {
      const parsed = parseMatchPattern(value);
      return parsed !== null;
    }

    // ドメイン名のみの場合（後方互換性）
    // ワイルドカードは先頭のみ許可
    if (value.includes('*')) {
      // '*'のみ、または '*.domain.com' 形式
      if (value === '*') {
        return true;
      }
      if (value.startsWith('*.')) {
        // *.の後にドメイン名があるか確認
        const domain = value.substring(2);
        return domain.length > 0 && domain.includes('.');
      }
      return false;
    }

    // 通常のドメイン名（ドットを含む必要がある）
    return value.includes('.');
  },
  {
    message: '無効なMatch Patternまたはドメイン形式です。有効な例: "https://example.com/*", "*://*.github.com/*", "example.com", "*.github.com"',
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

// ==================== アクションスキーマ ====================

/** copyTextアクション用パラメータスキーマ */
const CopyTextParamsSchema = z.object({
  selector: z.string().optional(),
  value: z.string().optional(),
});

/** navigateアクション用パラメータスキーマ */
const NavigateParamsSchema = z.object({
  url: z.string().min(1),
});

/** クラス操作アクション用パラメータスキーマ */
const ClassParamsSchema = z.object({
  className: z.string().min(1),
  selector: z.string().optional(),
});

/** styleアクション用パラメータスキーマ */
const StyleParamsSchema = z.object({
  style: StyleObjectSchema,
  selector: z.string().optional(),
});

/** toggleアクション用パラメータスキーマ */
const ToggleParamsSchema = z.object({
  selector: z.string().optional(),
});

/** customアクション用パラメータスキーマ */
const CustomParamsSchema = z.object({
  code: z.string().min(1),
  selector: z.string().optional(),
});

/** apiCallアクション用パラメータスキーマ */
const ApiCallParamsSchema = z.object({
  url: z.string().min(1),
  method: z.string().optional(),
  headers: z.record(z.string()).optional(),
  data: z.any().optional(),
});

/** アクションスキーマ（Discriminated Union） */
export const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('copyText'),
    params: CopyTextParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('navigate'),
    params: NavigateParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('toggleClass'),
    params: ClassParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('addClass'),
    params: ClassParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('removeClass'),
    params: ClassParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('style'),
    params: StyleParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('toggle'),
    params: ToggleParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('custom'),
    params: CustomParamsSchema,
    notification: z.string().optional(),
  }),
  z.object({
    type: z.literal('apiCall'),
    params: ApiCallParamsSchema,
    notification: z.string().optional(),
  }),
]) satisfies z.ZodType<Action>;

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
  action: ActionSchema,
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
  Action,
  Condition,
} from './types';
