import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, Loader2, TrendingUp, PiggyBank, 
  AlertTriangle, Lightbulb, RefreshCw, Bot
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  { icon: '📊', text: 'Проанализируй мои расходы', prompt: 'Проанализируй мои расходы за последний месяц и дай рекомендации по оптимизации бюджета.' },
  { icon: '💰', text: 'Сколько могу инвестировать?', prompt: 'Исходя из моих доходов и расходов, сколько я могу безопасно инвестировать ежемесячно?' },
  { icon: '🎯', text: 'Как достичь целей быстрее?', prompt: 'Дай советы как быстрее достичь моих финансовых целей.' },
  { icon: '⚠️', text: 'Где я перерасходую?', prompt: 'В каких категориях у меня перерасход? Дай конкретные рекомендации.' },
];

export default function AIAssistant() {
  const [user, setUser] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Привет! 👋 Я твой персональный финансовый ассистент. Могу проанализировать твои расходы, помочь с планированием бюджета и дать рекомендации по инвестициям.\n\n*Обратите внимание: я не даю юридических или инвестиционных гарантий. Мои рекомендации носят информационный характер.*\n\nЧем могу помочь?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    // AI доступен только администратору (владельцу) или пользователям с премиум подпиской
    const access = userData.role === 'admin' || userData.data?.subscription === 'premium' || userData.data?.subscription === 'family';
    setHasAccess(access);
  };

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100)
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.list()
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list()
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => base44.entities.Investment.list()
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getFinancialContext = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    const expensesByCategory = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category || 'Другое'] = (acc[t.category || 'Другое'] || 0) + t.amount;
        return acc;
      }, {});

    const activeGoals = goals.filter(g => g.status === 'active');
    const totalGoalTarget = activeGoals.reduce((s, g) => s + g.target_amount, 0);
    const totalGoalCurrent = activeGoals.reduce((s, g) => s + (g.current_amount || 0), 0);

    const investmentValue = investments.reduce((sum, inv) => 
      sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0
    );

    return `
Финансовые данные пользователя:

ДОХОДЫ И РАСХОДЫ (текущий месяц):
- Общий доход: ${monthIncome.toLocaleString()} ₽
- Общие расходы: ${monthExpenses.toLocaleString()} ₽
- Баланс: ${(monthIncome - monthExpenses).toLocaleString()} ₽

РАСХОДЫ ПО КАТЕГОРИЯМ:
${Object.entries(expensesByCategory).map(([cat, amount]) => `- ${cat}: ${amount.toLocaleString()} ₽`).join('\n') || '- Нет данных'}

БЮДЖЕТЫ:
${budgets.map(b => `- ${b.name} (${b.category}): потрачено ${(b.spent_amount || 0).toLocaleString()} из ${b.limit_amount.toLocaleString()} ₽`).join('\n') || '- Нет бюджетов'}

ФИНАНСОВЫЕ ЦЕЛИ:
${activeGoals.map(g => `- ${g.title}: накоплено ${(g.current_amount || 0).toLocaleString()} из ${g.target_amount.toLocaleString()} ₽`).join('\n') || '- Нет целей'}

ИНВЕСТИЦИОННЫЙ ПОРТФЕЛЬ:
- Общая стоимость: ${investmentValue.toLocaleString()} ₽
${investments.map(i => `- ${i.name}: ${i.quantity} шт. по ${(i.current_price || i.purchase_price).toLocaleString()} ₽`).join('\n') || ''}
`;
  };

  const sendMessage = async (prompt) => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const financialContext = getFinancialContext();
      
      const systemPrompt = `Ты — умный и дружелюбный финансовый ассистент. Твоя задача — помогать пользователю управлять личными финансами.

ПРАВИЛА:
1. Отвечай на русском языке
2. Будь конкретным и практичным в советах
3. Используй эмодзи умеренно для наглядности
4. НЕ давай юридических гарантий или обещаний конкретной доходности
5. Если данных недостаточно — скажи об этом
6. Форматируй ответ с использованием markdown для лучшей читаемости

${financialContext}

Вопрос пользователя: ${prompt}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: null
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    sendMessage(prompt);
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              AI Ассистент Premium
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Для доступа к AI-ассистенту необходима Premium подписка. Обратитесь к владельцу приложения для активации.
            </p>
            <a 
              href="https://t.me/RussianExpert" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                <span className="mr-2">💬</span>
                Связаться в Telegram
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              AI Ассистент
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ваш персональный финансовый советник
            </p>
          </div>
        </motion.div>

        {/* Chat Area */}
        <Card className="flex-1 border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                      }`}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                      <span className="text-sm text-slate-500">Анализирую...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="px-4 pb-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Быстрые вопросы:</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((item, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleQuickPrompt(item.prompt)}
                    className="h-auto py-3 px-4 justify-start text-left rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 transition-all"
                  >
                    <span className="mr-2">{item.icon}</span>
                    <span className="text-sm">{item.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                placeholder="Задайте вопрос о ваших финансах..."
                className="rounded-xl border-slate-200 dark:border-slate-600 focus:border-violet-500"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 text-center mt-4 px-4">
          AI-ассистент не даёт юридических и инвестиционных гарантий. 
          Рекомендации носят информационный характер.
        </p>
      </div>
    </div>
  );
}