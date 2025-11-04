/**
 * Page Modifier - Message Item Component
 *
 * チャットメッセージ表示コンポーネント（吹き出し形式）
 */

import { FiUser, FiCpu } from 'react-icons/fi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-2 px-4 py-2 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* アバター */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
          isUser ? 'bg-github-blue-500 text-white' : 'bg-gray-600 dark:bg-gray-700 text-white'
        }`}
      >
        {isUser ? <FiUser size={18} /> : <FiCpu size={18} />}
      </div>

      {/* メッセージ吹き出し */}
      <div
        className={`max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
      >
        {/* メッセージバブル */}
        <div
          className={`px-3.5 py-2.5 rounded-[18px] text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
            isUser ? 'bg-github-blue-500 text-white' : 'bg-github-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
          }`}
        >
          {message.content}
        </div>

        {/* タイムスタンプ */}
        <span
          className={`text-[11px] text-gray-600 dark:text-gray-400 ${isUser ? 'pr-2' : 'pl-2'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
