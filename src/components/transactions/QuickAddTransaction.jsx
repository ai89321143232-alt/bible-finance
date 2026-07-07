import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { addFamilyId } from '@/components/FamilyDataWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, ArrowUpRight, ArrowDownRight, Check, Calendar, Camera, Loader2, Upload, Plus } from 'lucide-react';
import ReceiptReviewModal from './ReceiptReviewModal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Нативный select для мобильных
function NativeSelect({ value, onChange, placeholder, children, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-12 rounded-xl border border-input bg-white dark:bg-slate-800 px-3 text-slate-900 dark:text-white text-sm appearance-none ${className || ''}`}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {children}
    </select>
  );
}
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================
// components/transactions/QuickAddTransaction.jsx — МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ТРАНЗАКЦИИ
// ============================================================
// Используется на страницах: Dashboard, Transactions
// Props:
//   transaction   → объект Transaction для редактирования (если null — режим создания)
//   onClose       → коллбэк закрытия модала
//   accounts      → массив Account (для выбора счёта)
//   defaultType   → начальный тип ('expense' | 'income' | 'transfer'), по умолчанию 'expense'
//
// РЕЖИМЫ РАБОТЫ:
//   1. Вручную (вкладка "Вручную") — стандартная форма
//   2. Сканирование (вкладка "Сканировать") — AI-распознавание чека через камеру/файл
//
// ТИПЫ ТРАНЗАКЦИЙ:
//   'expense'  → расход: списывает с баланса счёта, обновляет spent_amount в бюджете
//   'income'   → доход: пополняет баланс счёта
//   'transfer' → перенос: списывает с одного счёта, зачисляет на другой или на цель (Goal)
//
// ЛОГИКА TRANSFER → ЦЕЛЬ:
//   toAccountId начинается с "goal_" → берёт goalId, обновляет Goal.current_amount
//   если current_amount >= target_amount → меняет статус цели на 'completed'
//
// ЛОГИКА БЮДЖЕТА:
//   При создании расхода → updateBudgetSpent() ищет бюджеты с matching категорией
//   и увеличивает их Budget.spent_amount
//
// СКАНИРОВАНИЕ ЧЕКА:
//   1. Загружает файл через UploadFile
//   2. Извлекает данные через ExtractDataFromUploadedFile (amount, merchant, items)
//   3. Если > 1 товара → ReceiptReviewModal для ручного назначения категорий
//   4. Если 1 товар → categorizeAndAddSingleItem (InvokeLLM для автокатегории)
//   5. Если только сумма → заполняет форму вручную
//
// ЗАЩИТА ОТ ДВОЙНОГО НАЖАТИЯ:
//   isSubmitting state + disabled на кнопке + isPending мутаций
// ============================================================
export default function QuickAddTransaction({ transaction, onClose, accounts, defaultType = 'expense' }) {
  const isMobile = window.innerWidth < 640;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('manual');
  const [type, setType] = useState(transaction?.type || defaultType);
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [category, setCategory] = useState(transaction?.category || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const toLocalDatetimeString = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [date, setDate] = useState(transaction?.date ? new Date(transaction.date) : new Date());
  const [accountId, setAccountId] = useState(transaction?.account_id || '');
  const [toAccountId, setToAccountId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const debounceRef = useRef(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  // Auto-categorization: debounced AI suggestion on description change
  const suggestCategory = useCallback(async (text, cats) => {
    if (!text || text.length < 3 || type === 'transfer') {
      setSuggestedCategory(null);
      return;
    }
    const categoryNames = cats.map(c => c.name).join(', ');
    if (!categoryNames) return;

    setIsSuggesting(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Определи категорию расхода по описанию. Отвечай ТОЛЬКО названием из списка, ничего больше.

Описание: "${text}"

Категории: ${categoryNames}

Категория:`,
        add_context_from_internet: false
      });
      const suggested = response.trim();
      if (categoryNames.includes(suggested)) {
        setSuggestedCategory(suggested);
      }
    } catch (e) {
      // silently ignore
    } finally {
      setIsSuggesting(false);
    }
  }, [type]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (description && description.length >= 3 && type !== 'transfer') {
      debounceRef.current = setTimeout(() => suggestCategory(description, categories), 800);
    } else {
      setSuggestedCategory(null);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [description, suggestCategory, type]);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  // Filter accounts to show only current user's accounts
  // Show all accounts while user is loading, filter after
  const myAccounts = !currentUser 
    ? (accounts || [])
    : (accounts?.filter(acc => 
        acc.created_by === currentUser.email || 
        acc.user_id === currentUser.id ||
        acc.created_by_id === currentUser.id
      ) || []);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' })
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.filter({ is_active: true })
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const dataWithFamily = await addFamilyId(data);
      return base44.entities.Transaction.create(dataWithFamily);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const dataWithFamily = await addFamilyId(data);
      return base44.entities.Transaction.update(id, dataWithFamily);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  // Budget spent_amount обновляется автоматически через automation updateBudgetOnTransaction
  const updateBudgetSpent = async (categoryName, amountNum) => {
    // No-op: handled by entity automation
  };

  const handleSubmit = async () => {
    if (!amount) return;
    if (myAccounts.length === 0) {
      toast.error('Сначала создайте хотя бы один счёт');
      return;
    }
    if (!accountId) {
      toast.error('Выберите счёт');
      return;
    }
    if (type !== 'transfer' && !category) return;
    if (type === 'transfer' && !toAccountId) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await handleSubmitInternal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInternal = async () => {
    const amountNum = parseFloat(amount);
    const user = await base44.auth.me();

    if (type === 'transfer') {
      const isDestGoal = toAccountId.startsWith('goal_');
      const sourceAccount = accounts.find(a => a.id === accountId);

      if (sourceAccount) {
        const isOwner = sourceAccount.created_by_id === user.id || sourceAccount.user_id === user.id || sourceAccount.created_by === user.email;
        if (!isOwner) {
          toast.error('Действия с данными других пользователей запрещены!');
          return;
        }
        if (sourceAccount.type !== 'credit' && sourceAccount.balance - amountNum < 0) {
          toast.error('Недостаточно средств на счёте для выполнения операции');
          return;
        }
        await base44.entities.Account.update(accountId, {
          balance: sourceAccount.balance - amountNum
        });
      }

      let destName = '';
      if (isDestGoal) {
        const goalId = toAccountId.replace('goal_', '');
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          const newAmount = (goal.current_amount || 0) + amountNum;
          await base44.entities.Goal.update(goalId, {
            current_amount: newAmount,
            status: newAmount >= goal.target_amount ? 'completed' : 'active'
          });
          destName = `Цель: ${goal.title}`;
          queryClient.invalidateQueries({ queryKey: ['goals'] });
        }
      } else {
        const destAccount = accounts.find(a => a.id === toAccountId);
        if (destAccount) {
          await base44.entities.Account.update(toAccountId, {
            balance: destAccount.balance + amountNum
          });
          destName = destAccount.name;
        }
      }

      const transferData = {
        type: 'transfer',
        amount: amountNum,
        category: isDestGoal ? 'Перенос на цель' : 'Перенос между счетами',
        description: `${sourceAccount?.name} → ${destName}${description ? ': ' + description : ''}`,
        date: date.toISOString(),
        account_id: accountId,
        user_id: user.id
      };
      await createMutation.mutateAsync(transferData);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Перенос выполнен');
      onClose();
      return;
    }

    // Validate account ownership for expense/income
    if (accountId) {
      const selectedAccount = accounts.find(a => a.id === accountId);
      const isOwner = selectedAccount && (selectedAccount.created_by_id === user.id || selectedAccount.user_id === user.id || selectedAccount.created_by === user.email);
      if (selectedAccount && !isOwner) {
        toast.error('Действия с данными других пользователей запрещены!');
        return;
      }

      if (type === 'expense' && selectedAccount) {
        // For credit cards, allow spending below zero (debt increases)
        if (selectedAccount.type !== 'credit' && selectedAccount.balance - amountNum < 0) {
          toast.error('Недостаточно средств на счёте для выполнения операции');
          return;
        }
        // Deduct from account balance
        await base44.entities.Account.update(accountId, {
          balance: selectedAccount.balance - amountNum
        });
        // Update matching budget spent
        await updateBudgetSpent(category, amountNum);
      } else if (type === 'income' && selectedAccount) {
        // Add to account balance
        await base44.entities.Account.update(accountId, {
          balance: selectedAccount.balance + amountNum
        });
      }
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }

    const data = {
      type,
      amount: amountNum,
      category,
      description,
      date: date.toISOString(),
      account_id: accountId || undefined,
      user_id: user.id
    };

    if (transaction) {
      await updateMutation.mutateAsync({ id: transaction.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }

    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    toast.success(type === 'expense' ? 'Расход добавлен' : 'Доход добавлен');
    onClose();
  };

  // Scan receipt using camera or file
  const handleReceiptScan = async (file) => {
    if (!file) return;
    setIsScanning(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            date: { type: 'string' },
            merchant: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const items = result.output.items || [];
        if (items.length > 1) {
          setScannedItems(items.map(item => ({
            name: item.name || 'Товар',
            price: item.price || 0,
            category: ''
          })));
          setDescription(result.output.merchant || '');
          if (result.output.date) {
            try { setDate(new Date(result.output.date)); } catch (e) {}
          }
          setShowReviewModal(true);
        } else if (items.length === 1) {
          await categorizeAndAddSingleItem(items[0], result.output);
        } else {
          setAmount(result.output.amount?.toString() || '');
          setDescription(result.output.merchant || '');
          setActiveTab('manual');
          toast.success('Чек распознан успешно!');
        }
      } else {
        toast.error('Не удалось распознать чек');
      }
    } catch (error) {
      console.error('Receipt scan error:', error);
      toast.error('Ошибка при сканировании чека');
    } finally {
      setIsScanning(false);
    }
  };

  const categorizeAndAddSingleItem = async (item, receiptData) => {
    try {
      const categoryNames = categories.map(c => c.name).join(', ');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Определи наиболее подходящую категорию для товара "${item.name}" стоимостью ${item.price}₽.\n\nДоступные категории: ${categoryNames}\n\nОтвечай только с названием категории.`,
        add_context_from_internet: false
      });
      setAmount(item.price?.toString() || '');
      setDescription(`${receiptData.merchant || ''} - ${item.name}`);
      setCategory(response.trim());
      if (receiptData.date) {
        try { setDate(new Date(receiptData.date)); } catch (e) {}
      }
      setActiveTab('manual');
      toast.success('Товар добавлен!');
    } catch (error) {
      setAmount(item.price?.toString() || '');
      setDescription(`${receiptData.merchant || ''} - ${item.name}`);
      setActiveTab('manual');
    }
  };

  const handleReviewConfirm = async (itemsWithCategories) => {
    setShowReviewModal(false);
    const user = await base44.auth.me();
    const selectedAccount = accountId ? accounts.find(a => a.id === accountId) : null;

    for (const item of itemsWithCategories) {
      const data = {
        type: 'expense',
        amount: item.price,
        category: item.category,
        description: `${description} - ${item.name}`,
        date: format(date, 'yyyy-MM-dd'),
        account_id: accountId || undefined,
        user_id: user.id
      };
      await createMutation.mutateAsync(data);
      await updateBudgetSpent(item.category, item.price);
    }

    // Deduct total from account
    if (selectedAccount) {
      const totalAmount = itemsWithCategories.reduce((sum, i) => sum + i.price, 0);
      await base44.entities.Account.update(accountId, {
        balance: selectedAccount.balance - totalAmount
      });
    }

    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    toast.success(`Добавлено ${itemsWithCategories.length} операций`);
    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === type);

  const formContent = (
    <>
          {/* Header — only for desktop */}
          {!isMobile && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {transaction ? 'Редактировать операцию' : 'Новая операция'}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="manual">Вручную</TabsTrigger>
              <TabsTrigger value="scan">Сканировать</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Scan Receipt Tab */}
          {activeTab === 'scan' && (
            <div className="space-y-4 mb-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  {isScanning ? (
                    <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                  ) : (
                    <Camera className="w-10 h-10 text-violet-600" />
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {isScanning ? 'Распознавание чека...' : 'Сканирование чека'}
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Загрузите фото или скан чека для автоматического распознавания
                </p>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                  onChange={(e) => { if (e.target.files?.[0]) { handleReceiptScan(e.target.files[0]); e.target.value = ''; } }}
                  className="hidden" />
                <input ref={galleryInputRef} type="file" accept="image/*,.pdf"
                  onChange={(e) => { if (e.target.files?.[0]) { handleReceiptScan(e.target.files[0]); e.target.value = ''; } }}
                  className="hidden" />
                <div className="flex flex-col gap-3">
                  <Button onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }} disabled={isScanning}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                    <Camera className="w-5 h-5 mr-2" /> Сфотографировать чек
                  </Button>
                  <Button onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click(); }} variant="outline" disabled={isScanning}>
                    <Upload className="w-5 h-5 mr-2" /> Загрузить из галереи
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry Form */}
          {activeTab === 'manual' && (
            <>
              {/* Type Selector */}
              <div className="flex gap-2 mb-6">
                <Button variant={type === 'expense' ? 'default' : 'outline'} onClick={() => setType('expense')}
                  className={cn('flex-1 h-12 rounded-xl transition-all', type === 'expense' ? 'bg-rose-500 hover:bg-rose-600 border-0 text-white' : 'text-slate-900 dark:text-white')}>
                  <ArrowDownRight className="w-4 h-4 mr-2" /> Расход
                </Button>
                <Button variant={type === 'income' ? 'default' : 'outline'} onClick={() => setType('income')}
                  className={cn('flex-1 h-12 rounded-xl transition-all', type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 border-0 text-white' : 'text-slate-900 dark:text-white')}>
                  <ArrowUpRight className="w-4 h-4 mr-2" /> Доход
                </Button>
                <Button variant={type === 'transfer' ? 'default' : 'outline'} onClick={() => setType('transfer')}
                  className={cn('flex-1 h-12 rounded-xl transition-all', type === 'transfer' ? 'bg-blue-500 hover:bg-blue-600 border-0 text-white' : 'text-slate-900 dark:text-white')}>
                  <ArrowUpRight className="w-4 h-4 mr-2 transform rotate-90" /> Перенос
                </Button>
              </div>

              {/* Amount */}
              <div className="mb-6">
                <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Сумма</Label>
                <div className="relative">
                  <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="text-3xl font-bold h-16 pl-4 pr-12 rounded-xl border-2 focus:border-violet-500 text-slate-900 dark:text-white bg-white dark:bg-slate-800" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₽</span>
                </div>
              </div>

              {/* Category or Transfer Accounts */}
              {type === 'transfer' ? (
                <>
                  <div className="mb-4">
                    <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Откуда</Label>
                    <NativeSelect value={accountId} onChange={setAccountId} placeholder="Выберите ваш счёт">
                      {myAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(acc.balance)})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="mb-4">
                    <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Куда</Label>
                    <NativeSelect value={toAccountId} onChange={setToAccountId} placeholder="Выберите счёт или цель">
                      {myAccounts.filter(a => a.id !== accountId).map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(acc.balance)})
                        </option>
                      ))}
                      {goals?.length > 0 && goals.map((goal) => {
                        const progress = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
                        return (
                          <option key={`goal_${goal.id}`} value={`goal_${goal.id}`}>
                            🎯 {goal.title} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(goal.current_amount || 0)} / {progress.toFixed(0)}%)
                          </option>
                        );
                      })}
                    </NativeSelect>
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-500 dark:text-slate-400 text-sm">Категория</Label>
                    <Link to={createPageUrl('Categories')}>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-violet-600">
                        <Plus className="w-3 h-3 mr-1" /> Добавить категорию
                      </Button>
                    </Link>
                  </div>
                  {/* AI Category Suggestion */}
                  {suggestedCategory && !category && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xs text-violet-400">
                        {isSuggesting ? '✨ Анализирую...' : '✨ Предлагаю:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(suggestedCategory);
                          setSuggestedCategory(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-300 text-sm font-medium hover:bg-violet-500/25 transition-colors"
                      >
                        {suggestedCategory}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {filteredCategories.map((cat) => (
                      <Button key={cat.id} variant={category === cat.name ? 'default' : 'outline'} onClick={() => setCategory(cat.name)}
                        className={cn('h-auto py-3 flex-col gap-1 rounded-xl transition-all', category === cat.name ? 'bg-violet-500 hover:bg-violet-600 border-0 text-white' : 'text-slate-800 dark:text-slate-200')}>
                        <span className="text-xl drop-shadow-sm">
                          {cat.icon === 'Utensils' ? '🍔' : cat.icon === 'Car' ? '🚗' : cat.icon === 'Home' ? '🏠' : cat.icon === 'Gamepad2' ? '🎮' : cat.icon === 'Heart' ? '💊' : cat.icon === 'Shirt' ? '👕' : cat.icon === 'CreditCard' ? '💳' : cat.icon === 'BookOpen' ? '📚' : cat.icon === 'Wallet' ? '💰' : cat.icon === 'Laptop' ? '💻' : cat.icon === 'TrendingUp' ? '📈' : cat.icon === 'Gift' ? '🎁' : '📦'}
                        </span>
                        <span className="text-xs">{cat.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date & Time */}
              <div className="mb-4">
                <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Дата и время</Label>
                <input
                  type="datetime-local"
                  value={toLocalDatetimeString(date)}
                  onChange={(e) => e.target.value && setDate(new Date(e.target.value))}
                  className="w-full h-12 rounded-xl border border-input bg-white dark:bg-slate-800 px-3 text-slate-900 dark:text-white text-sm"
                />
              </div>

              {/* Account */}
              {type !== 'transfer' && (
                <div className="mb-4">
                  <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Счёт</Label>
                  {myAccounts.length === 0 ? (
                    <div className="flex items-center h-12 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 text-sm text-amber-700 dark:text-amber-400">
                      Нет счетов — <Link to={createPageUrl('Accounts')} className="ml-1 underline font-medium" onClick={onClose}>создать счёт</Link>
                    </div>
                  ) : (
                    <NativeSelect value={accountId} onChange={setAccountId} placeholder="Выберите ваш счёт">
                      {myAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(acc.balance)})
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Комментарий</Label>
                <Textarea placeholder="Добавьте описание..." value={description} onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl resize-none text-slate-900 dark:text-white placeholder:text-slate-400" rows={2} />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!amount || myAccounts.length === 0 || !accountId || (type !== 'transfer' && !category) || (type === 'transfer' && !toAccountId) || createMutation.isPending || updateMutation.isPending || isSubmitting}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-lg shadow-lg shadow-violet-500/25"
              >
                {(createMutation.isPending || updateMutation.isPending || isSubmitting) ? (
                  <span className="animate-pulse">Сохранение...</span>
                ) : (
                  <><Check className="w-5 h-5 mr-2" />{transaction ? 'Обновить' : type === 'transfer' ? 'Перенести' : 'Сохранить'}</>
                )}
              </Button>
            </>
          )}
    </>
  );

  return (
    <>
      <AnimatePresence>
        {showReviewModal && (
          <ReceiptReviewModal
            items={scannedItems}
            categories={categories}
            onConfirm={handleReviewConfirm}
            onClose={() => setShowReviewModal(false)}
            isLoading={isScanning}
          />
        )}
      </AnimatePresence>

      {isMobile ? (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.25 }}
          className="fixed inset-0 bg-[#0f1117] z-50 overflow-y-auto"
        >
          <div className="sticky top-0 bg-[#0a0d13] border-b border-white/5 px-4 py-4 flex items-center gap-3 z-10">
            <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-white">
              {transaction ? 'Редактировать операцию' : 'Новая операция'}
            </h2>
          </div>
          <div className="p-4">
            {formContent}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {formContent}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}