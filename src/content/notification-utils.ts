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

/**
 * CSP警告を通知として表示
 *
 * @param blockedPlugins - ブロックされたプラグインの配列
 */
export function showCSPWarningBanner(blockedPlugins: Array<{id: string, name: string}>): void {
  // 既存の通知があれば削除
  const existingNotification = document.querySelector('[data-csp-notification]');
  if (existingNotification) {
    existingNotification.remove();
  }

  // 通知要素を作成
  const notification = document.createElement('div');
  notification.dataset.cspNotification = 'true';

  // スタイル設定
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#d1242f',
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: '1000000',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    minWidth: '300px',
    maxWidth: '400px',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
  });

  // メインメッセージ
  const mainMessage = document.createElement('div');
  mainMessage.textContent = `以下のプラグインがサイトによりブロックされました`;
  Object.assign(mainMessage.style, {
    fontWeight: '600',
    marginBottom: '8px',
  });

  notification.appendChild(mainMessage);

  // プラグインリスト
  const pluginList = document.createElement('ul');
  Object.assign(pluginList.style, {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '13px',
  });

  blockedPlugins.forEach(plugin => {
    const listItem = document.createElement('li');
    listItem.textContent = plugin.name;
    Object.assign(listItem.style, {
      marginBottom: '4px',
    });
    pluginList.appendChild(listItem);
  });

  notification.appendChild(pluginList);
  document.body.appendChild(notification);

  // アニメーション表示
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  });

  // 5秒後に削除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(10px)';

    setTimeout(() => {
      notification.remove();
    }, 200);
  }, 5000);
}
