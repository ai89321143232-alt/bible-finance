import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Один пузырь сообщения в семейном чате: справа/цветной для своих,
// слева/нейтральный для чужих сообщений — как в мессенджере.
export default function ChatBubble({ message, member, isOwn }) {
  const name = member?.display_name || member?.name || 'Участник';
  const color = member?.avatar_color || '#8b5cf6';

  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-1"
          style={{ backgroundColor: color }}
        >
          {member?.avatar_url ? (
            <img src={member.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            name[0]?.toUpperCase()
          )}
        </div>
      )}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && (
          <span className="text-xs font-medium text-muted-foreground mb-0.5 px-1">{name}</span>
        )}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {format(new Date(message.created_date), 'HH:mm', { locale: ru })}
        </span>
      </div>
    </div>
  );
}