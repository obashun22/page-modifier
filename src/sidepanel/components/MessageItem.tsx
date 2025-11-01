/**
 * Page Modifier - Message Item Component
 *
 * チャットメッセージ表示コンポーネント
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
        flexDirection: 'column',
        padding: '12px 16px',
        backgroundColor: isUser ? '#f6f8fa' : 'white',
        borderBottom: '1px solid #d0d7de',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isUser ? '#0969da' : '#6e7781',
          }}
        >
          {isUser ? '👤 You' : '🤖 Assistant'}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: '#6e7781',
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div
        style={{
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#24292f',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>
    </div>
  );
}
