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

/** アクションスキーマ */
export const ActionSchema = z.object({
  type: z.enum([
    'copyText',
    'navigate',
    'toggleClass',
    'addClass',
    'removeClass',
    'style',
    'toggle',
    'custom',
    'apiCall',
  ]),
  selector: z.string().optional(),
  value: z.string().optional(),
  className: z.string().optional(),
  style: StyleObjectSchema.optional(),
  code: z.string().optional(),
  url: z.string().optional(),
  notification: z.string().optional(),
}) satisfies z.ZodType<Action>;

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

/** 操作スキーマ */
export const OperationSchema = z.object({
  id: z.string().uuid('idはUUID形式である必要があります'),
  description: z.string(),
  type: z.enum(['insert', 'remove', 'hide', 'show', 'style', 'modify', 'replace', 'execute']),
  selector: z.string().optional(),
  position: z.enum(['beforebegin', 'afterbegin', 'beforeend', 'afterend']).optional(),
  element: ElementSchema.optional(),
  style: StyleObjectSchema.optional(),
  attributes: AttributeObjectSchema.optional(),
  condition: ConditionSchema.optional(),
  code: z.string().optional(),
  run: z.enum(['once', 'always']).optional(),
})
  .refine(
    (data) => {
      // executeの場合はcodeが必須
      if (data.type === 'execute') {
        return data.code !== undefined && data.code.length > 0;
      }
      return true;
    },
    {
      message: 'execute操作にはcodeフィールドが必須です',
      path: ['code'],
    }
  )
  .refine(
    (data) => {
      // execute以外の場合はselectorが必須
      if (data.type !== 'execute') {
        return data.selector !== undefined && data.selector.length > 0;
      }
      return true;
    },
    {
      message: 'この操作にはselectorフィールドが必須です',
      path: ['selector'],
    }
  ) satisfies z.ZodType<Operation>;

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
