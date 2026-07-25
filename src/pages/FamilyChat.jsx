import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Users, Loader2, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ChatBubble from '@/components/family/ChatBubble';
import MoneyRequestDialog from '@/components/family/MoneyRequestDialog';
import PayRequestDialog from '@/components/family/PayRequestDialog';

// ============================================================
// FamilyChat.jsx — семейный чат
// ============================================================
// Мессенджер для членов одной семьи: текстовые сообщения и запросы
// денег в реальном времени (entities.subscribe), реакции-эмодзи,
// редактирование своих сообщений, автопрокрутка вниз.
// ============================================================
export default function FamilyChat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMoneyRequest, setShowMoneyRequest] = useState(false);
  const [payingMessage, setPayingMessage] = useState(null);
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

  const { data: familyAccounts = [] } = useQuery({
    queryKey: ['family-accounts-chat', family?.id],
    queryFn: async () => {
      const memberIds = family.members?.map(m => m.user_id) || [];
      const all = await base44.entities.Account.list();
      return all.filter(a =>
        a.family_id === family.id ||
        memberIds.includes(a.created_by_id) ||
        memberIds.includes(a.user_id)
      );
    },
    enabled: !!family,
  });

  const myAccounts = familyAccounts.filter(a => a.created_by_id === user?.id || a.user_id === user?.id);

  useEffect(() => {
    if (!family) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    base44.entities.FamilyMessage.filter({ family_id: family.id }, 'created_date', 200)
      .then((data) => {
        setMessages(data);
        markMessagesRead(data);
      })
      .finally(() => setIsLoading(false));
  }, [family?.id]);

  // Отмечает чужие непрочитанные сообщения прочитанными текущим пользователем
  const markMessagesRead = (list) => {
    if (!user) return;
    const unread = list.filter(m => m.created_by_id !== user.id && !(m.read_by || []).includes(user.id));
    if (unread.length === 0) return;
    setMessages(prev => prev.map(m => unread.some(u => u.id === m.id) ? { ...m, read_by: [...(m.read_by || []), user.id] } : m));
    Promise.all(unread.map(m =>
      base44.entities.FamilyMessage.update(m.id, { read_by: [...(m.read_by || []), user.id] })
    ));
  };

  useEffect(() => {
    if (!family) return;
    const unsubscribe = base44.entities.FamilyMessage.subscribe((event) => {
      if (event.data?.family_id !== family.id) return;
      if (event.type === 'create') {
        setMessages(prev => prev.some(m => m.id === event.data.id) ? prev : [...prev, event.data]);
        markMessagesRead([event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.data.id ? event.data : m));
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
      await base44.entities.FamilyMessage.create({ family_id: family.id, content, read_by: [user.id] });
    } finally {
      setIsSending(false);
    }
  };

  const handleMoneyRequest = async ({ amount, note }) => {
    if (!family) return;
    await base44.entities.FamilyMessage.create({
      family_id: family.id,
      content: note?.trim() || '',
      type: 'money_request',
      amount,
      request_status: 'pending',
      read_by: [user.id],
    });
  };

  const handleReact = async (message, emoji) => {
    const reactions = message.reactions || [];
    const existing = reactions.find(r => r.emoji === emoji);
    let updated;
    if (existing) {
      const hasUser = existing.user_ids.includes(user.id);
      const newUserIds = hasUser ? existing.user_ids.filter(id => id !== user.id) : [...existing.user_ids, user.id];
      updated = newUserIds.length > 0
        ? reactions.map(r => r.emoji === emoji ? { ...r, user_ids: newUserIds } : r)
        : reactions.filter(r => r.emoji !== emoji);
    } else {
      updated = [...reactions, { emoji, user_ids: [user.id] }];
    }
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: updated } : m));
    await base44.entities.FamilyMessage.update(message.id, { reactions: updated });
  };

  const handleEdit = async (message, newContent) => {
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, content: newContent, edited: true } : m));
    await base44.entities.FamilyMessage.update(message.id, { content: newContent, edited: true });
  };

  const handleFulfillRequest = async (message, payerAccountId) => {
    const requester = getMember(message.created_by_id);
    const requesterName = requester?.display_name || requester?.name || 'участника семьи';
    const payerName = getMember(user.id)?.display_name || getMember(user.id)?.name || user.full_name;
    const payerAccount = myAccounts.find(a => a.id === payerAccountId);
    const requesterAccount = familyAccounts.find(a => a.created_by_id === message.created_by_id || a.user_id === message.created_by_id);

    if (payerAccount) {
      await base44.entities.Account.update(payerAccount.id, { balance: (payerAccount.balance || 0) - message.amount });
    }
    if (requesterAccount) {
      await base44.entities.Account.update(requesterAccount.id, { balance: (requesterAccount.balance || 0) + message.amount });
    }

    const transaction = await base44.entities.Transaction.create({
      type: 'transfer',
      amount: message.amount,
      category: 'Семейные переводы',
      subcategory: 'outgoing',
      description: `Перевод для ${requesterName} (запрос в чате)`,
      date: new Date().toISOString(),
      family_id: family.id,
      user_id: user.id,
      account_id: payerAccount?.id,
      source: 'app',
      visibility: 'shared',
    });

    if (requesterAccount) {
      await base44.entities.Transaction.create({
        type: 'transfer',
        amount: message.amount,
        category: 'Семейные переводы',
        subcategory: 'incoming',
        description: `Перевод от ${payerName} (запрос в чате)`,
        date: new Date().toISOString(),
        family_id: family.id,
        user_id: message.created_by_id,
        account_id: requesterAccount.id,
        source: 'app',
        visibility: 'shared',
      });
    }

    const updates = { request_status: 'fulfilled', paid_by: user.id, transaction_id: transaction.id };
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, ...updates } : m));
    await base44.entities.FamilyMessage.update(message.id, updates);
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
    <div className="flex flex-col h-[calc(100vh-4rem-env(safe-area-inset-top,0px))] lg:!h-screen">
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 shadow-md flex-shrink-0">
        <h1 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          {family.name}
        </h1>
        <p className="text-xs text-white/80">{family.members?.length || 0} участников</p>
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
              userId={user.id}
              totalMembers={family.members?.length || 1}
              payer={getMember(m.paid_by)}
              onReact={(emoji) => handleReact(m, emoji)}
              onEdit={(content) => handleEdit(m, content)}
              onFulfillRequest={() => setPayingMessage(m)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="px-4 sm:px-6 pt-3 border-t border-border flex items-end gap-2 flex-shrink-0 bg-background lg:!pb-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
      >
        <Button
          onClick={() => setShowMoneyRequest(true)}
          size="icon"
          variant="outline"
          className="rounded-xl h-11 w-11 flex-shrink-0 border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
        >
          <HandCoins className="w-5 h-5" />
        </Button>
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
          className="rounded-xl h-11 w-11 flex-shrink-0 bg-gradient-to-br from-fuchsia-500 to-violet-600 hover:from-fuchsia-600 hover:to-violet-700"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <MoneyRequestDialog
        open={showMoneyRequest}
        onOpenChange={setShowMoneyRequest}
        onSubmit={handleMoneyRequest}
      />

      <PayRequestDialog
        open={!!payingMessage}
        onOpenChange={(v) => !v && setPayingMessage(null)}
        message={payingMessage}
        requesterName={payingMessage ? (getMember(payingMessage.created_by_id)?.display_name || getMember(payingMessage.created_by_id)?.name || 'Участник') : ''}
        accounts={myAccounts}
        onConfirm={(accountId) => handleFulfillRequest(payingMessage, accountId)}
      />
    </div>
  );
}