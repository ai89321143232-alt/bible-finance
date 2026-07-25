import React, { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Строка эмодзи-реакций под сообщением + кнопка добавления новой реакции.
export default function ReactionBar({ reactions = [], userId, onReact, isOwn }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {reactions.filter(r => r.user_ids?.length > 0).map((r) => (
        <button
          key={r.emoji}
          onClick={() => onReact(r.emoji)}
          className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
            r.user_ids.includes(userId)
              ? 'bg-fuchsia-100 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:border-fuchsia-700'
              : 'bg-muted border-border'
          }`}
        >
          <span>{r.emoji}</span>
          <span className="text-muted-foreground">{r.user_ids.length}</span>
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground p-0.5 rounded-full">
            <SmilePlus className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5 flex gap-1 rounded-full" side="top">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(emoji); setOpen(false); }}
              className="text-lg hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}