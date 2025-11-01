/**
 * Page Modifier - Message Item Component
 *
 * チャットメッセージ表示コンポーネント（吹き出し形式）
 */

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
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '8px',
        padding: '8px 16px',
        alignItems: 'flex-start',
      }}
    >
      {/* アバター */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: isUser ? '#0969da' : '#6e7781',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
        }}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* メッセージ吹き出し */}
      <div
        style={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* メッセージバブル */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '18px',
            backgroundColor: isUser ? '#0969da' : '#f6f8fa',
            color: isUser ? '#ffffff' : '#24292f',
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
        >
          {message.content}
        </div>

        {/* タイムスタンプ */}
        <span
          style={{
            fontSize: '11px',
            color: '#6e7781',
            paddingLeft: isUser ? '0' : '8px',
            paddingRight: isUser ? '8px' : '0',
          }}
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
