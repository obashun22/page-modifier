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
 * CSP警告バナーを表示
 *
 * @param blockedPlugins - ブロックされたプラグインの配列
 * @returns 作成したバナー要素
 */
export function showCSPWarningBanner(blockedPlugins: Array<{id: string, name: string}>): HTMLDivElement {
  // 既存のバナーがあれば削除
  const existingBanner = document.querySelector('[data-csp-warning-banner]');
  if (existingBanner) {
    existingBanner.remove();
  }

  // バナーコンテナを作成
  const banner = document.createElement('div');
  banner.dataset.cspWarningBanner = 'true';

  // スタイル設定
  Object.assign(banner.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    backgroundColor: '#991b1b', // 赤背景
    color: 'white',
    padding: '12px 20px',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  });

  // メッセージコンテナ
  const messageContainer = document.createElement('div');
  Object.assign(messageContainer.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  });

  // 警告アイコン
  const icon = document.createElement('span');
  icon.textContent = '⚠️';
  icon.style.fontSize = '16px';

  // メッセージテキスト
  const message = document.createElement('span');
  message.textContent = `${blockedPlugins.length}個のプラグインがCSP制約により適用できませんでした（クリックで詳細表示）`;

  messageContainer.appendChild(icon);
  messageContainer.appendChild(message);

  // 閉じるボタン
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  Object.assign(closeButton.style, {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 8px',
    lineHeight: '1',
  });

  closeButton.onclick = () => {
    banner.remove();
  };

  // クリックでモーダル表示
  messageContainer.onclick = () => {
    showCSPWarningModal(blockedPlugins);
  };

  banner.appendChild(messageContainer);
  banner.appendChild(closeButton);
  document.body.appendChild(banner);

  return banner;
}

/**
 * CSP警告モーダルを表示
 *
 * @param blockedPlugins - ブロックされたプラグインの配列
 */
function showCSPWarningModal(blockedPlugins: Array<{id: string, name: string}>): void {
  // 既存のモーダルがあれば削除
  const existingModal = document.querySelector('[data-csp-warning-modal]');
  if (existingModal) {
    existingModal.remove();
    return; // トグル動作
  }

  // オーバーレイ
  const overlay = document.createElement('div');
  overlay.dataset.cspWarningModal = 'true';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: '1000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  // モーダルコンテンツ
  const modal = document.createElement('div');
  Object.assign(modal.style, {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  });

  // タイトル
  const title = document.createElement('h2');
  title.textContent = 'CSP制約によりブロックされたプラグイン';
  Object.assign(title.style, {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
  });

  // 説明文
  const description = document.createElement('p');
  description.textContent = 'このサイトのContent Security Policy（CSP）により、以下のプラグインはカスタムコード実行が許可されていません。';
  Object.assign(description.style, {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
  });

  // プラグインリスト
  const list = document.createElement('ul');
  Object.assign(list.style, {
    margin: '0 0 16px 0',
    padding: '0 0 0 24px',
    listStyle: 'disc',
  });

  blockedPlugins.forEach(plugin => {
    const item = document.createElement('li');
    item.textContent = plugin.name;
    Object.assign(item.style, {
      fontSize: '14px',
      color: '#333',
      marginBottom: '8px',
    });
    list.appendChild(item);
  });

  // 閉じるボタン
  const closeButton = document.createElement('button');
  closeButton.textContent = '閉じる';
  Object.assign(closeButton.style, {
    backgroundColor: '#0969da',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  });

  closeButton.onclick = () => {
    overlay.remove();
  };

  // オーバーレイクリックで閉じる
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };

  modal.appendChild(title);
  modal.appendChild(description);
  modal.appendChild(list);
  modal.appendChild(closeButton);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
