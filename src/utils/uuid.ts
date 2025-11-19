/**
 * Page Modifier - UUID Utility
 *
 * UUID生成ユーティリティ
 */

/**
 * UUID v4を生成
 *
 * @returns UUID文字列 (例: "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
  // ブラウザ環境のcrypto.randomUUID()を使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // フォールバック: 手動生成（テスト環境用）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 文字列がUUID形式かどうかを検証
 *
 * @param value - 検証する文字列
 * @returns UUID形式の場合true
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
