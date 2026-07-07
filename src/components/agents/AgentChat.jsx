import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';

// ============================================================
// components/agents/AgentChat.jsx — ЧАТ С AI-АГЕНТОМ
// ============================================================
// Props:
//   agentName   → имя агента (budget_analyst | family_coordinator)
//   accentColor → tailwind-класс для акцента (bg-*), для аватара и кнопок
//   suggestions → массив строк-подсказок для быстрого старта
//
// Создаёт одну беседу на монтировании, стримит ответы через subscribeToConversation.
// ============================================================
export default function AgentChat({ agentName, accentColor = 'bg-violet-600', suggestions = [] }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const conv = base44.agents.createConversation({
      agent_name: agentName,
      metadata: { name: 'Новый диалог', description: 'Диалог с агентом' }
    });
    setConversation(conv);
  }, [agentName]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      const last = (data.messages || [])[data.messages.length - 1];
      if (last && last.role === 'assistant') setIsSending(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || isSending) return;
    setInput('');
    setIsSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] max-h-[720px]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className={`w-14 h-14 rounded-2xl ${accentColor} flex items-center justify-center mb-4`}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <p className="text-white/60 text-sm max-w-sm">
              Задайте вопрос — я проанализирую ваши данные и помогу.
            </p>
            {suggestions.length > 0 && (
              <div className="mt-5 flex flex-col gap-2 w-full max-w-sm">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message, idx) => (
          <MessageBubble key={idx} message={message} accentColor={accentColor} />
        ))}

        {isSending && (
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Анализирую данные...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
          placeholder="Напишите сообщение..."
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 max-h-32"
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isSending}
          className={`${accentColor} hover:opacity-90 text-white rounded-xl h-11 w-11 p-0 flex-shrink-0`}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message, accentColor }) {
  const isUser = message.role === 'user';

  if (!message.content && (!message.tool_calls || message.tool_calls.length === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? `${accentColor} text-white` : 'bg-white/8 text-white/90'
        }`}
      >
        {message.content && (
          isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-strong:text-white">
              {message.content}
            </ReactMarkdown>
          )
        )}
      </div>
    </motion.div>
  );
}