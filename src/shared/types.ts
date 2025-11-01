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

/** 操作タイプ */
export type OperationType =
  | 'insert'   // 要素を挿入
  | 'remove'   // 要素を削除
  | 'hide'     // 要素を非表示
  | 'show'     // 要素を表示
  | 'style'    // スタイルを適用
  | 'modify'   // 属性/コンテンツを変更
  | 'replace'  // 要素を置換
  | 'executeScript'; // カスタムスクリプトを実行

/** 挿入位置 */
export type InsertPosition =
  | 'beforebegin'  // 対象要素の前
  | 'afterbegin'   // 対象要素の最初の子として
  | 'beforeend'    // 対象要素の最後の子として
  | 'afterend';    // 対象要素の後

// ==================== イベント・アクション ====================

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

/** アクションタイプ */
export type ActionType =
  | 'copyText'        // テキストをコピー
  | 'navigate'        // ページ遷移
  | 'toggleClass'     // クラスを切り替え
  | 'addClass'        // クラスを追加
  | 'removeClass'     // クラスを削除
  | 'style'           // スタイルを適用
  | 'toggle'          // 表示/非表示切り替え
  | 'custom'          // カスタムJS実行
  | 'apiCall';        // 外部API呼び出し

/** 条件タイプ */
export type ConditionType =
  | 'exists'          // 要素が存在する
  | 'notExists'       // 要素が存在しない
  | 'matches'         // パターンにマッチ
  | 'custom';         // カスタム条件

// ==================== 条件 ====================

/** 実行条件 */
export interface Condition {
  type: ConditionType;
  selector?: string;      // 条件対象セレクター
  pattern?: string;       // マッチパターン
  code?: string;          // カスタム条件コード
}

// ==================== アクション ====================

/** アクション定義 */
export interface Action {
  type: ActionType;
  selector?: string;           // ターゲット要素
  value?: string;              // 値（copyText等で使用）
  className?: string;          // クラス名（toggleClass等）
  style?: StyleObject;         // スタイル
  code?: string;               // カスタムコード
  url?: string;                // URL（navigate等）
  notification?: string;       // 通知メッセージ
  method?: string;             // HTTPメソッド（apiCall用）
  headers?: Record<string, string>; // HTTPヘッダー（apiCall用）
  data?: any;                  // リクエストデータ（apiCall用）
}

// ==================== イベント ====================

/** イベントハンドラー定義 */
export interface Event {
  type: EventType;             // イベントタイプ
  action: Action;              // 実行するアクション
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

/** 操作定義 */
export interface Operation {
  id: string;                  // 操作の一意識別子
  description?: string;        // 操作の説明
  type: OperationType;         // 操作タイプ
  selector?: SelectorString;   // CSSセレクター（executeScript以外では必須）
  position?: InsertPosition;   // 挿入位置（insertの場合）
  element?: Element;           // 要素定義
  style?: StyleObject;         // スタイル定義
  attributes?: AttributeObject;// 属性定義
  condition?: Condition;       // 実行条件
  code?: string;               // 実行するコード（executeScriptの場合）
  waitFor?: string;            // 要素の出現を待つセレクター（executeScriptの場合）
  delay?: number;              // 実行前の遅延時間（ミリ秒、executeScriptの場合）
}

// ==================== プラグイン ====================

/** プラグイン定義 */
export interface Plugin {
  id: string;                  // 一意識別子
  name: string;                // 表示名
  version: string;             // バージョン（semver）
  author?: string;             // 作成者
  description?: string;        // 説明
  targetDomains: string[];     // 適用対象ドメイン（ワイルドカード対応）
  autoApply: boolean;          // 自動適用フラグ
  priority: number;            // 実行優先度（0-1000）
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

// ==================== セキュリティレベル ====================

/** セキュリティレベル */
export type SecurityLevel = 'safe' | 'moderate' | 'advanced';

/** セキュリティ評価結果 */
export interface SecurityAssessment {
  level: SecurityLevel;
  reasons: string[];
  requiresApproval: boolean;
}
