import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Pencil, Check, X, HandCoins, PartyPopper } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import ReactionBar from '@/components/family/ReactionBar';

// Один пузырь сообщения в семейном чате: справа/цветной для своих,
// слева/нейтральный для чужих. Поддерживает редактирование, реакции
// и особый вид для запроса денег.
export default function ChatBubble({ message, member, isOwn, userId, totalMembers = 1, payer, onReact, onEdit, onFulfillRequest }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const name = member?.display_name || member?.name || 'Участник';
  const color = member?.avatar_color || '#8b5cf6';
  const isMoneyRequest = message.type === 'money_request';
  const isFulfilled = message.request_status === 'fulfilled';

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) onEdit(trimmed);
    setIsEditing(false);
  };

  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-1 shadow-md"
          style={{ backgroundColor: color }}
        >
          {member?.avatar_url ? (
            <img src={member.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            name[0]?.toUpperCase()
          )}
        </div>
      )}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col group`}>
        {!isOwn && (
          <span className="text-xs font-medium text-muted-foreground mb-0.5 px-1">{name}</span>
        )}

        {isMoneyRequest ? (
          <div className={`px-4 py-3 rounded-2xl text-sm shadow-md ${
            isFulfilled
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
              : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
          } ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
            <div className="flex items-center gap-1.5 font-semibold">
              <HandCoins className="w-4 h-4" />
              Запрос {message.amount?.toLocaleString('ru-RU')} ₽
            </div>
            {message.content && <p className="mt-1 opacity-95 whitespace-pre-wrap break-words">{message.content}</p>}
            {isFulfilled ? (
              <div className="mt-2 flex items-center gap-1 text-xs font-medium bg-white/25 rounded-full px-2 py-0.5 w-fit">
                <PartyPopper className="w-3 h-3" />
                Оплачено{payer ? ` — ${payer.display_name || payer.name}` : ''}
              </div>
            ) : !isOwn ? (
              <button
                onClick={onFulfillRequest}
                className="mt-2 text-xs font-semibold bg-white/90 text-orange-600 rounded-full px-3 py-1 hover:bg-white transition-colors"
              >
                Отметить оплаченным
              </button>
            ) : (
              <div className="mt-2 text-xs opacity-80">Ожидает оплаты</div>
            )}
          </div>
        ) : isEditing ? (
          <div className="w-56 flex flex-col gap-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="rounded-xl resize-none text-sm"
              rows={2}
              autoFocus
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={() => { setIsEditing(false); setDraft(message.content); }} className="p-1 rounded-full bg-muted"><X className="w-3.5 h-3.5" /></button>
              <button onClick={saveEdit} className="p-1 rounded-full bg-primary text-primary-foreground"><Check className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div
              className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-md ${
                isOwn
                  ? 'bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white rounded-br-sm'
                  : 'bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-slate-700 dark:to-slate-800 text-foreground rounded-bl-sm'
              }`}
            >
              {message.content}
            </div>
            {isOwn && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-1 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(message.created_date), 'HH:mm', { locale: ru })}
          </span>
          {message.edited && !isMoneyRequest && <span className="text-[10px] text-muted-foreground">(изменено)</span>}
          {isOwn && !isMoneyRequest && totalMembers > 1 && (
            <span className="text-[10px] text-muted-foreground">
              {(message.read_by || []).filter(id => id !== message.created_by_id).length >= totalMembers - 1
                ? '· Прочитано всеми'
                : `· Прочитано ${(message.read_by || []).filter(id => id !== message.created_by_id).length}/${totalMembers - 1}`}
            </span>
          )}
        </div>

        {!isMoneyRequest && (
          <ReactionBar reactions={message.reactions} userId={userId} onReact={onReact} isOwn={isOwn} />
        )}
      </div>
    </div>
  );
}