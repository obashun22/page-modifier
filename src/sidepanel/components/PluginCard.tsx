/**
 * Page Modifier - Plugin Card Component
 *
 * プラグインカードコンポーネント（新規/編集の統一表示）
 */

import { FaPlus, FaTimes, FaUndo } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import type { Plugin } from '../../shared/types';
import OperationItem from './OperationItem';

type ChatPluginMode =
  | 'referencing'    // 編集のために参照中（バツボタンで削除可能）
  | 'referenced'     // 編集要望送信済み（削除不可、表示のみ）
  | 'update_preview' // 更新プレビュー（編集から生成、承認待ち）
  | 'add_preview'    // 追加プレビュー（新規生成、承認待ち）
  | 'updated'        // 更新済み（「編集済み」バッジ、元に戻すボタン）
  | 'added';         // 追加済み（「適用済み」バッジ、元に戻すボタン）

interface PluginCardProps {
  plugin: Plugin;
  mode: ChatPluginMode;
  onApprove?: (plugin: Plugin) => void;
  onReject?: () => void;
  onDismiss?: () => void;
  onUndo?: () => void;
}

export default function PluginCard({ plugin, mode, onApprove, onReject, onDismiss, onUndo }: PluginCardProps) {
  const getBorderColor = () => {
    switch (mode) {
      case 'add_preview':
      case 'update_preview':
        return '#0969da'; // 青：プレビュー
      case 'referencing':
      case 'referenced':
        return '#d4a72c'; // 黄：編集中
      case 'added':
      case 'updated':
        return '#28a745'; // 緑：適用済み
      default:
        return '#d0d7de';
    }
  };

  return (
    <div
      className="relative p-4 rounded-lg bg-gray-50"
      style={{ border: `2px solid ${getBorderColor()}` }}
    >
      {/* 削除ボタン（referencingモード時のみ右上に表示） */}
      {mode === 'referencing' && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-0 w-6 h-6 bg-transparent border-none cursor-pointer flex items-center justify-center text-gray-600 transition-colors hover:text-red-600"
          title="削除"
        >
          <IoClose size={20} />
        </button>
      )}

      {/* ヘッダー */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="m-0 text-base font-semibold text-gray-800">
            {plugin.name}
          </h3>
          {(mode === 'referencing' || mode === 'referenced') && (
            <span className="px-2 py-0.5 text-[11px] bg-yellow-100 text-yellow-800 rounded-xl font-semibold">
              参照中
            </span>
          )}
          {mode === 'updated' && (
            <span className="px-2 py-0.5 text-[11px] bg-green-100 text-green-800 rounded-xl font-semibold">
              編集済み
            </span>
          )}
          {mode === 'added' && (
            <span className="px-2 py-0.5 text-[11px] bg-green-100 text-green-800 rounded-xl font-semibold">
              追加済み
            </span>
          )}
        </div>
        <p className="m-0 text-[13px] text-gray-600">
          {plugin.description || 'No description'}
        </p>
      </div>

      {/* メタ情報 */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">
          <span>バージョン: {plugin.version}</span>
        </div>
        <div className="text-xs text-gray-600">
          対象ドメイン: {plugin.targetDomains.join(', ')}
        </div>
      </div>

      {/* 操作内容 */}
      <div className="mb-4">
        <h4 className="m-0 mb-2 text-sm font-semibold text-gray-800">
          操作内容 ({plugin.operations.length}件)
        </h4>
        <div className="flex flex-col gap-2 -mx-4 px-4">
          {plugin.operations.map((op, index) => (
            <OperationItem key={index} operation={op} />
          ))}
        </div>
      </div>

      {/* アクションボタン */}
      {(mode === 'added' || mode === 'updated') && (
        <div className="flex flex-col gap-2">
          {onUndo && (
            <button
              onClick={onUndo}
              className="px-4 py-2 text-sm bg-white text-gray-800 border border-gray-300 rounded-md cursor-pointer font-semibold flex items-center justify-center gap-1.5"
            >
              <FaUndo size={14} />
              元に戻す
            </button>
          )}
        </div>
      )}
      {(mode === 'add_preview' || mode === 'update_preview') && onApprove && onReject && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(plugin)}
            className="flex-1 px-4 py-2 text-sm bg-green-600 text-white border-none rounded-md cursor-pointer font-semibold flex items-center justify-center gap-1.5"
          >
            <FaPlus size={14} />
            追加する
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 text-sm bg-white text-gray-800 border border-gray-300 rounded-md cursor-pointer font-semibold flex items-center justify-center gap-1.5"
          >
            <FaTimes size={14} />
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
