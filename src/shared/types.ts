/**
 * Page Modifier - Core Type Definitions
 *
 * プラグインのJSONスキーマに対応するTypeScript型定義
 */

// ==================== 基本型 ====================

/** HTML属性のオブジェクト */
export type AttributeObject = Record<string, string>;

/** CSSスタイルのオブジェクト */
export type StyleObject = Record<string, string>;

/** セレクター文字列（標準CSS + 独自拡張） */
export type SelectorString = string;

// ==================== 操作タイプ ====================

/** 操作タイプ（4つの本質的な操作） */
export type OperationType =
  | 'insert'   // 要素を挿入
  | 'update'   // 要素を更新（スタイル/属性/コンテンツ）
  | 'delete'   // 要素を削除
  | 'execute'; // カスタムスクリプトを実行

/** 挿入位置 */
export type InsertPosition =
  | 'beforebegin'  // 対象要素の前
  | 'afterbegin'   // 対象要素の最初の子として
  | 'beforeend'    // 対象要素の最後の子として
  | 'afterend';    // 対象要素の後

// ==================== イベント ====================

/** イベントタイプ */
export type EventType =
  | 'click'
  | 'dblclick'
  | 'mouseenter'
  | 'mouseleave'
  | 'focus'
  | 'blur'
  | 'change'
  | 'submit'
  | 'keydown'
  | 'keyup';

/** 条件タイプ */
export type ConditionType =
  | 'exists'          // 要素が存在する
  | 'notExists'       // 要素が存在しない
  | 'matches'         // パターンにマッチ
  | 'custom';         // カスタム条件

/** 実行条件 */
export interface Condition {
  type: ConditionType;
  selector?: string;      // 条件対象セレクター
  pattern?: string;       // マッチパターン
  code?: string;          // カスタム条件コード
}

/** イベントハンドラー定義 */
export interface Event {
  type: EventType;             // イベントタイプ
  code: string;                // 実行するJavaScriptコード
  condition?: Condition;       // 実行条件
}

// ==================== 要素 ====================

/** 要素定義（階層構造サポート） */
export interface Element {
  tag: string;                 // HTMLタグ名
  attributes?: AttributeObject;// HTML属性
  style?: StyleObject;         // インラインスタイル
  textContent?: string;        // テキスト内容
  innerHTML?: string;          // HTML内容（XSS注意）
  children?: Element[];        // 子要素（再帰的）
  events?: Event[];            // イベントハンドラー
}

// ==================== 操作 ====================

/** 実行タイミング */
export type ScriptRun = 'once' | 'always';

/** 操作定義の共通フィールド */
export interface OperationBase {
  id: string;                  // 操作の一意識別子（UUID形式）
  description: string;         // 操作の説明（必須、空文字列可）
  condition?: Condition;       // 実行条件
}

/** insert操作のパラメータ */
export interface InsertParams {
  selector: SelectorString;    // 挿入基準となる要素のセレクター
  position: InsertPosition;    // 挿入位置
  element: Element;            // 挿入する要素
}

/** update操作のパラメータ */
export interface UpdateParams {
  selector: SelectorString;    // 更新対象要素のセレクター
  style?: StyleObject;         // スタイル変更
  attributes?: AttributeObject;// 属性変更
  textContent?: string;        // テキストコンテンツ変更
}

/** delete操作のパラメータ */
export interface DeleteParams {
  selector: SelectorString;    // 削除対象要素のセレクター
}

/** execute操作のパラメータ */
export interface ExecuteParams {
  code: string;                // 実行するカスタムJavaScriptコード
  run?: ScriptRun;             // 実行タイミング（デフォルト: 'once'）
}

/** 操作定義（Discriminated Union） */
export type Operation =
  | (OperationBase & { type: 'insert'; params: InsertParams })
  | (OperationBase & { type: 'update'; params: UpdateParams })
  | (OperationBase & { type: 'delete'; params: DeleteParams })
  | (OperationBase & { type: 'execute'; params: ExecuteParams });

// ==================== プラグイン ====================

/** プラグイン定義 */
export interface Plugin {
  id: string;                  // 一意識別子（UUID形式）
  name: string;                // 表示名
  version: string;             // バージョン（semver）
  description?: string;        // 説明
  targetDomains: string[];     // Chrome Extension Match Pattern形式（例: "https://example.com/*", "*://*.github.com/*"）
                               // 後方互換性のため、ドメイン名のみ（例: "example.com", "*.github.com"）も許可
  enabled: boolean;            // 有効化フラグ
  operations: Operation[];     // 操作の配列
}

// ==================== バリデーション結果 ====================

/** バリデーション結果 */
export interface ValidationResult {
  success: boolean;
  data?: Plugin;
  errors?: ValidationError[];
}

/** バリデーションエラー */
export interface ValidationError {
  path: string[];
  message: string;
}

