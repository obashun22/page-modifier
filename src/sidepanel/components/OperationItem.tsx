/**
 * Page Modifier - Operation Item Component
 *
 * オペレーション表示の共通コンポーネント
 */

import type { Operation } from '../../shared/types';

interface OperationItemProps {
  operation: Operation;
}

export default function OperationItem({ operation }: OperationItemProps) {
  // タイプに応じた対象情報を取得
  const getTargetValue = () => {
    switch (operation.type) {
      case 'insert':
        // 挿入する要素のタグ
        const element = (operation as any).element;
        return element?.tag || '要素';

      case 'execute':
        // 実行タイミング
        const run = (operation as any).run || 'once';
        return run;

      default:
        // その他の操作はselectorを返す
        return operation.selector;
    }
  };

  const targetValue = getTargetValue();

  return (
    <div className="px-3 py-2 bg-white border border-gray-300 rounded-md text-[13px] w-full box-border">
      <div className="flex gap-2 flex-wrap items-center">
        {/* 操作タイプバッジ */}
        <span className="px-2 py-0.5 bg-github-blue-50 text-github-blue-500 rounded-xl text-[11px] font-semibold">
          {operation.type}
        </span>

        {/* 対象情報 */}
        {targetValue && (
          <code className="text-xs text-gray-600 font-mono">
            {targetValue}
          </code>
        )}
      </div>

      {/* 説明文 */}
      {operation.description && (
        <p className="m-0 text-xs text-gray-600">
          {operation.description}
        </p>
      )}
    </div>
  );
}
