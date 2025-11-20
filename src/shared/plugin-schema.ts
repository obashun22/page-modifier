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

// ==================== 基本スキーマ ====================

/** スタイルオブジェクトスキーマ */
export const StyleObjectSchema = z.record(z.string());

/** 属性オブジェクトスキーマ */
export const AttributeObjectSchema = z.record(z.string());

/**
 * ドメインパターンスキーマ
 *
 * サポートされる形式:
 * - "*" - 全サイト
 * - "example.com" - 特定ドメイン
 * - "*.example.com" - サブドメインを含む
 * - "example.com/path/*" - パス指定付き
 *
 * 実行時にChrome Extension Match Pattern形式に変換されます。
 */
const DomainPatternSchema = z.string()
  .min(1, 'ドメインパターンは空文字列にできません')
  .refine(
    (value) => {
      // 全サイト指定
      if (value === '*') {
        return true;
      }

      // プロトコルが含まれている場合は不可
      if (value.includes('://')) {
        return false;
      }

      // <all_urls>などの特殊形式は不可
      if (value.startsWith('<') || value.endsWith('>')) {
        return false;
      }

      // ドメインパターンの形式チェック
      // 許可: example.com, *.example.com, example.com/path/*
      // - ワイルドカードは先頭のみ（*.の形式）
      // - ドメイン部分は英数字とハイフン、ドットのみ
      // - パスは任意（スラッシュで始まる）
      const domainPattern = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*(\/.*)?$/;

      return domainPattern.test(value);
    },
    {
      message: '無効なドメインパターンです。有効な例: "example.com", "*.github.com", "*"',
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
  targetDomains: z.array(DomainPatternSchema).min(1, '少なくとも1つのドメインパターンを指定してください'),
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
