/**
 * Page Modifier - Notification Utilities
 *
 * トースト通知を表示するユーティリティ
 */

/**
 * トースト通知を表示
 *
 * @param message - 表示するメッセージ
 * @param duration - 表示時間（ミリ秒、デフォルト3000）
 * @param type - 通知タイプ（success, error, info）
 */
export function showNotification(
  message: string,
  duration: number = 3000,
  type: 'success' | 'error' | 'info' = 'success'
): void {
  // 既存の通知があれば削除
  const existingToast = document.querySelector('[data-plugin-toast]');
  if (existingToast) {
    existingToast.remove();
  }

  // トースト要素を作成
  const toast = document.createElement('div');
  toast.dataset.pluginToast = 'true';
  toast.textContent = message;

  // タイプ別の背景色
  const backgroundColor = {
    success: '#238636',
    error: '#d1242f',
    info: '#0969da',
  }[type];

  // スタイル設定
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor,
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: '1000000',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    pointerEvents: 'none',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
  });

  document.body.appendChild(toast);

  // アニメーション表示
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // 一定時間後に削除
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';

    setTimeout(() => {
      toast.remove();
    }, 200);
  }, duration);
}

/**
 * プレースホルダーを置換
 *
 * @param text - 置換対象のテキスト
 * @returns 置換後のテキスト
 */
export function replacePlaceholders(text: string): string {
  return text
    .replace(/\{\{location\.href\}\}/g, window.location.href)
    .replace(/\{\{document\.title\}\}/g, document.title)
    .replace(/\{\{location\.hostname\}\}/g, window.location.hostname)
    .replace(/\{\{location\.pathname\}\}/g, window.location.pathname);
}
