import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Loader2, Bot, Mic, MicOff, Wallet, Plus, User as UserIcon } from
'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getInvestmentValue } from '@/lib/investmentValue';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useScopeMode } from '@/hooks/useScopeMode';
import { isOwnRecord, isFamilyVisibleRecord } from '@/lib/recordOwnership';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const QUICK_PROMPTS = [
{ icon: '📊', text: 'Проанализируй мои расходы', prompt: 'Проанализируй мои расходы за последний месяц и дай рекомендации по оптимизации бюджета.' },
{ icon: '📅', text: 'Отчёт за сегодня', prompt: 'Дай отчёт по моим тратам и доходам за сегодня.' },
{ icon: '🎯', text: 'Как достичь целей быстрее?', prompt: 'Дай советы как быстрее достичь моих финансовых целей.' },
{ icon: '⚠️', text: 'Где я перерасходую?', prompt: 'В каких категориях у меня перерасход? Дай конкретные рекомендации.' }];


const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Привет! 👋 Я твой персональный финансовый ассистент. Я умею:\n\n- отвечать на вопросы и присылать отчёты по тратам и доходам (за сегодня, за месяц, по категориям);\n- добавлять транзакции, если ты расскажешь (текстом или голосом) о покупке или доходе;\n- редактировать и удалять уже внесённые операции по твоей просьбе.\n\n*Обратите внимание: я не даю юридических или инвестиционных гарантий.*\n\nЧем могу помочь?'
};

export default function AIAssistant() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('default');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [pendingInvestment, setPendingInvestment] = useState(null);
  const [accountOptions, setAccountOptions] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [balanceMode, setBalanceMode] = useState('personal');
  const { convertOrZero, profileCurrency } = useExchangeRates();
  const { filterPLTransactions, filterAccounts, scopeMode } = useScopeMode();
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (user?.ai_active_model && user[`ai_${user.ai_active_model}_key`]) {
      setSelectedModel(user.ai_active_model);
    }
  }, [user]);

  const availableModels = [
  { key: 'default', name: 'Токены платформы' },
  ...(user?.ai_deepseek_key ? [{ key: 'deepseek', name: 'DeepSeek' }] : []),
  ...(user?.ai_openai_key ? [{ key: 'openai', name: 'ChatGPT' }] : [])];


  const checkAccess = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    // AI доступен только администратору (владельцу) или пользователям с премиум подпиской
    const access = userData.role === 'admin' || userData.subscription === 'premium' || userData.subscription === 'family';
    setHasAccess(access);
  };

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
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

  const { data: family } = useQuery({
    queryKey: ['my-family-ai', user?.id],
    queryFn: async () => {
      const families = await base44.entities.Family.list();
      return families.find((f) => f.owner_id === user.id || f.members?.some((m) => m.user_id === user.id)) ?? null;
    },
    enabled: !!user
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getFinancialContext = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = now.toISOString().slice(0, 10);
    const isFamilyMode = balanceMode === 'family' && !!family?.id;
    const belongsToMode = (record) => isFamilyMode
      ? isFamilyVisibleRecord(record, user, family)
      : isOwnRecord(record, user);
    const inScope = (record) => scopeMode === 'all' || (record.scope || 'personal') === scopeMode;
    const visibleAccounts = filterAccounts(accounts.filter(belongsToMode));
    const visibleTransactions = filterPLTransactions(transactions.filter(belongsToMode), visibleAccounts);
    const scopedBudgets = budgets.filter((b) => belongsToMode(b) && inScope(b));
    const scopedGoals = goals.filter((g) => belongsToMode(g) && inScope(g) && g.status === 'active');
    const scopedInvestments = investments.filter((i) => belongsToMode(i) && inScope(i));
    const toProfile = (record) => convertOrZero(record.amount, record.currency || profileCurrency);
    const isInvestmentExpense = (record) => record.category === 'Инвестиции' || record.category === 'Investments';
    const expenseTransactions = (list) => list.filter((t) => t.type === 'expense' && !isInvestmentExpense(t));
    const total = (list) => list.reduce((sum, record) => sum + toProfile(record), 0);
    const monthTransactions = visibleTransactions.filter((t) => new Date(t.date) >= monthStart);
    const todayTransactions = visibleTransactions.filter((t) => (t.date || '').slice(0, 10) === todayStr);
    const monthIncome = total(monthTransactions.filter((t) => t.type === 'income'));
    const monthExpenses = total(expenseTransactions(monthTransactions));
    const todayIncome = total(todayTransactions.filter((t) => t.type === 'income'));
    const todayExpenses = total(expenseTransactions(todayTransactions));
    const expensesByCategory = expenseTransactions(monthTransactions).reduce((acc, t) => {
      const category = t.category || 'Другое';
      acc[category] = (acc[category] || 0) + toProfile(t);
      return acc;
    }, {});
    const investmentValue = scopedInvestments.reduce((sum, inv) =>
      sum + convertOrZero(getInvestmentValue(inv), inv.currency || profileCurrency), 0);

    let familySection = '';
    if (isFamilyMode && family?.members?.length > 0) {
      const familyMonthExpenses = expenseTransactions(monthTransactions);
      const byMember = family.members.map((m) => {
        const memberTx = familyMonthExpenses.filter((t) => t.user_id === m.user_id || t.created_by_id === m.user_id);
        const byCat = memberTx.reduce((acc, t) => {
          const category = t.category || 'Другое';
          acc[category] = (acc[category] || 0) + toProfile(t);
          return acc;
        }, {});
        return {
          name: m.display_name || m.name,
          total: total(memberTx),
          topCat: Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
        };
      }).sort((a, b) => b.total - a.total);
      familySection = `\n\nРАСХОДЫ ЧЛЕНОВ СЕМЬИ ЗА МЕСЯЦ (${family.name}), отсортировано по убыванию суммы:\n${byMember.map((b) => `- ${b.name}: ${b.total.toLocaleString()} ${profileCurrency}${b.topCat ? ` (больше всего на «${b.topCat[0]}»: ${b.topCat[1].toLocaleString()} ${profileCurrency})` : ''}`).join('\n')}`;
    }

    return `
Финансовые данные (${isFamilyMode ? 'семейный' : 'личный'} режим, ${scopeMode === 'business' ? 'бизнес' : scopeMode === 'personal' ? 'личная область' : 'все счета'}) в ${profileCurrency}:

СЕГОДНЯ (${todayStr}):
- Доход: ${todayIncome.toLocaleString()} ${profileCurrency}
- Расходы: ${todayExpenses.toLocaleString()} ${profileCurrency}
${todayTransactions.map((t) => `- ${t.type === 'expense' ? 'расход' : 'доход'}: ${toProfile(t).toLocaleString()} ${profileCurrency} (${t.category}${t.description ? ', ' + t.description : ''})`).join('\n') || '- Операций за сегодня нет'}

ДОХОДЫ И РАСХОДЫ (текущий месяц):
- Общий доход: ${monthIncome.toLocaleString()} ${profileCurrency}
- Общие расходы: ${monthExpenses.toLocaleString()} ${profileCurrency}
- Баланс: ${(monthIncome - monthExpenses).toLocaleString()} ${profileCurrency}

РАСХОДЫ ПО КАТЕГОРИЯМ:
${Object.entries(expensesByCategory).map(([cat, amount]) => `- ${cat}: ${amount.toLocaleString()} ${profileCurrency}`).join('\n') || '- Нет данных'}

БЮДЖЕТЫ:
${scopedBudgets.map((b) => `- ${b.name}: потрачено ${convertOrZero(b.spent_amount || 0, b.currency || profileCurrency).toLocaleString()} из ${convertOrZero(b.limit_amount, b.currency || profileCurrency).toLocaleString()} ${profileCurrency}`).join('\n') || '- Нет бюджетов'}

ФИНАНСОВЫЕ ЦЕЛИ:
${scopedGoals.map((g) => `- ${g.title}: накоплено ${convertOrZero(g.current_amount || 0, g.currency || profileCurrency).toLocaleString()} из ${convertOrZero(g.target_amount, g.currency || profileCurrency).toLocaleString()} ${profileCurrency}`).join('\n') || '- Нет целей'}

ИНВЕСТИЦИОННЫЙ ПОРТФЕЛЬ:
- Общая стоимость: ${investmentValue.toLocaleString()} ${profileCurrency}
${scopedInvestments.map((i) => `- ${i.name}: ${i.quantity} шт. по ${convertOrZero(i.current_price || i.purchase_price, i.currency || profileCurrency).toLocaleString()} ${profileCurrency}`).join('\n') || ''}${familySection}`;
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
    queryClient.invalidateQueries({ queryKey: ['investments'] });
  };

  const sendMessage = async (prompt) => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setPendingTransaction(null);
    setPendingInvestment(null);
    setAccountOptions([]);

    try {
      const financialContext = getFinancialContext();
      const response = await base44.functions.invoke('aiChatAssistant', {
        message: prompt,
        model: selectedModel,
        history: messages,
        financial_context: financialContext
      });
      const data = response.data;

      if (data.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.action === 'created') {
        toast.success('Транзакция добавлена');
        refreshData();
      } else if (data.action === 'created_investment') {
        toast.success('Инвестиция добавлена');
        refreshData();
      } else if (data.action === 'updated') {
        toast.success('Операция обновлена');
        refreshData();
      } else if (data.action === 'deleted') {
        toast.success('Операция удалена');
        refreshData();
      }

      if (data.needs_account) {
        setPendingTransaction(data.pendingTransaction || null);
        setPendingInvestment(data.pendingInvestment || null);
        setAccountOptions(data.accounts || []);
        setSelectedAccountId('');
      }
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeTransaction = async () => {
    if (!pendingTransaction && !pendingInvestment || !selectedAccountId) return;
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('aiChatAssistant', {
        finalize: true,
        account_id: selectedAccountId,
        pendingTransaction: pendingTransaction || undefined,
        pendingInvestment: pendingInvestment || undefined
      });
      const data = response.data;
      if (data.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        toast.success(pendingInvestment ? 'Инвестиция добавлена' : 'Транзакция добавлена');
        refreshData();
      }
    } finally {
      setPendingTransaction(null);
      setPendingInvestment(null);
      setAccountOptions([]);
      setSelectedAccountId('');
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';else
      if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      const detectedMime = mediaRecorder.mimeType || mimeType || 'audio/webm';

      mediaRecorder.ondataavailable = (e) => {if (e.data.size > 0) chunksRef.current.push(e.data);};
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: detectedMime });
        setIsTranscribing(true);
        try {
          const file = new File([blob], 'recording.webm', { type: detectedMime });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          if (transcript?.trim()) sendMessage(transcript);
        } catch (e) {
          toast.error('Не удалось распознать голос');
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error(err.name === 'NotAllowedError' ? 'Доступ к микрофону запрещён' : 'Микрофон недоступен');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    sendMessage(prompt);
  };

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setPendingTransaction(null);
    setPendingInvestment(null);
    setAccountOptions([]);
    setInputValue('');
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
              className="inline-block">
              
              <Button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                <span className="mr-2">💬</span>
                Связаться в Telegram
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>);

  }

  return (
    <div className="flex flex-col bg-white dark:bg-slate-950" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:flex flex-1 min-w-0 items-center gap-2">
          <h1 className="text-base font-semibold text-slate-900 dark:text-white truncate">AI Ассистент</h1>
          <span className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium">
            {scopeMode === 'business' ? 'Бизнес' : scopeMode === 'personal' ? 'Личные' : 'Все счета'}
          </span>
        </div>
        {family?.id && <div className="flex rounded-lg bg-muted p-0.5">
          <button onClick={() => setBalanceMode('personal')} className={`px-2 py-1 rounded-md text-sm ${balanceMode === 'personal' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Личные</button>
          <button onClick={() => setBalanceMode('family')} className={`px-2 py-1 rounded-md text-sm ${balanceMode === 'family' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Семейные</button>
        </div>}
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-24 sm:w-36 h-8 rounded-lg text-xs flex-1 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((m) =>
            <SelectItem key={m.key} value={m.key}>{m.name}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleNewChat} className="h-8 w-8 rounded-lg flex-shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
          <AnimatePresence initial={false}>
            {messages.map((message, index) =>
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mb-6">
              
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'assistant' ?
              'bg-gradient-to-br from-violet-500 to-indigo-600' :
              'bg-slate-200 dark:bg-slate-700'}`
              }>
                  {message.role === 'assistant' ?
                <Bot className="w-4 h-4 text-white" /> :

                <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-200" />
                }
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  {message.role === 'assistant' ?
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-slate-800 dark:text-slate-100">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div> :

                <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{message.content}</p>
                }
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading &&
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 mb-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                <span className="text-sm text-slate-500">Думаю...</span>
              </div>
            </motion.div>
          }

          {/* Account picker for a pending transaction or investment purchase */}
          {(pendingTransaction || pendingInvestment) && accountOptions.length > 0 &&
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-3 mb-6">
              <div className="flex items-center gap-2 mb-2 text-sm text-slate-700 dark:text-slate-200">
                <Wallet className="w-4 h-4 text-violet-600" />
                {pendingInvestment ? 'С какого счёта списать деньги на покупку?' : pendingTransaction.type === 'expense' ? 'С какого счёта списать?' : 'На какой счёт зачислить?'}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {accountOptions.map((acc) =>
              <button
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                selectedAccountId === acc.id ?
                'bg-violet-600 text-white border-violet-600' :
                'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`
                }>
                
                    {acc.name}
                  </button>
              )}
              </div>
              <Button
              size="sm"
              disabled={!selectedAccountId || isLoading}
              onClick={finalizeTransaction}
              className="rounded-lg bg-violet-600 hover:bg-violet-700 w-full">
              
                Подтвердить
              </Button>
            </div>
          }

          {/* Quick Prompts */}
          {messages.length === 1 && !pendingTransaction && !pendingInvestment &&
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((item, index) =>
            <Button
              key={index}
              variant="outline"
              onClick={() => handleQuickPrompt(item.prompt)}
              className="h-auto min-w-0 w-full py-3 px-4 justify-start text-left rounded-xl whitespace-normal hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 transition-all">
              
                  <span className="mr-2 flex-shrink-0">{item.icon}</span>
                  <span className="text-sm break-words">{item.text}</span>
                </Button>
            )}
            </div>
          }
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 mb-28 lg:mb-0"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-3xl mx-auto w-full flex items-end gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputValue);
              }
            }}
            placeholder="Напишите сообщение или спросите об операциях..."
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-32 text-slate-900 dark:text-white placeholder:text-slate-400 opacity-100"
            disabled={isLoading} />
          
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || isTranscribing}
            variant="ghost"
            size="icon"
            className={`rounded-full flex-shrink-0 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}>
            
            {isTranscribing ?
            <Loader2 className="w-4 h-4 animate-spin" /> :
            isRecording ?
            <MicOff className="w-4 h-4" /> :

            <Mic className="w-4 h-4" />
            }
          </Button>
          <Button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="rounded-full flex-shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
            
            {isLoading ?
            <Loader2 className="w-4 h-4 animate-spin" /> :

            <Send className="w-4 h-4" />
            }
          </Button>
        </div>
        <p className="text-[11px] text-slate-400 text-center mt-2">
          AI-ассистент не даёт юридических и инвестиционных гарантий.
        </p>
      </div>
    </div>);

}