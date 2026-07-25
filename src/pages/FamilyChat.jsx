import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ChatBubble from '@/components/family/ChatBubble';

// ============================================================
// FamilyChat.jsx — семейный чат
// ============================================================
// Простой мессенджер для членов одной семьи: текстовые сообщения,
// доставка в реальном времени (entities.subscribe), автопрокрутка вниз.
// ============================================================
export default function FamilyChat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: family } = useQuery({
    queryKey: ['my-family-chat', user?.id],
    queryFn: async () => {
      const families = await base44.entities.Family.list();
      return families.find(f => f.owner_id === user.id || f.members?.some(m => m.user_id === user.id)) ?? null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!family) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    base44.entities.FamilyMessage.filter({ family_id: family.id }, 'created_date', 200)
      .then(setMessages)
      .finally(() => setIsLoading(false));
  }, [family?.id]);

  useEffect(() => {
    if (!family) return;
    const unsubscribe = base44.entities.FamilyMessage.subscribe((event) => {
      if (event.data?.family_id !== family.id) return;
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      }
    });
    return unsubscribe;
  }, [family?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !family || isSending) return;
    setIsSending(true);
    setText('');
    try {
      await base44.entities.FamilyMessage.create({ family_id: family.id, content });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMember = (createdById) => family?.members?.find(m => m.user_id === createdById);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center gap-3">
        <Users className="w-10 h-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">У вас пока нет семьи</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Создайте семью или присоединитесь по коду приглашения, чтобы общаться с её участниками.
        </p>
        <Link to={createPageUrl('Family')}>
          <Button className="rounded-xl mt-1">Перейти к семье</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh)]">
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {family.name}
        </h1>
        <p className="text-xs text-muted-foreground">{family.members?.length || 0} участников</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-10">Пока нет сообщений. Напишите первым!</p>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              member={getMember(m.created_by_id)}
              isOwn={m.created_by_id === user.id}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 sm:px-6 py-3 border-t border-border flex items-end gap-2 pb-safe">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение..."
          className="rounded-xl resize-none min-h-[44px] max-h-32"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          size="icon"
          className="rounded-xl h-11 w-11 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}