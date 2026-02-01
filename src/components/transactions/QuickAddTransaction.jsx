import React, { useState, useRef } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function QuickAddTransaction({ transaction, onClose, accounts, defaultType = 'expense' }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('manual');
  const [type, setType] = useState(transaction?.type || defaultType);
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [category, setCategory] = useState(transaction?.category || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [date, setDate] = useState(transaction?.date ? new Date(transaction.date) : new Date());
  const [accountId, setAccountId] = useState(transaction?.account_id || '');
  const [toAccountId, setToAccountId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  // Filter accounts to show only current user's accounts
  const myAccounts = accounts?.filter(acc => 
    currentUser && (acc.created_by === currentUser.email || acc.created_by.includes(currentUser.id))
  ) || [];

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Операция добавлена');
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Операция обновлена');
      onClose();
    }
  });

  const handleSubmit = async () => {
    if (!amount) return;
    if (type !== 'transfer' && !category) return;
    if (type === 'transfer' && (!accountId || !toAccountId)) return;
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
    
    // Get current user
    const user = await base44.auth.me();

    if (type === 'transfer') {
      const isSourceGoal = toAccountId.startsWith('goal_');
      const isDestGoal = toAccountId.startsWith('goal_');

      // Update source (always account for now)
      const sourceAccount = accounts.find(a => a.id === accountId);
      if (sourceAccount) {
        // Check if user owns this account
        if (sourceAccount.created_by !== user.email && !sourceAccount.created_by.includes(user.id)) {
          toast.error('Действия с данными других пользователей запрещены!');
          return;
        }
        await base44.entities.Account.update(accountId, {
          balance: sourceAccount.balance - amountNum
        });
      }

      let destName = '';
      // Update destination (account or goal)
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

      // Create transfer transaction
      const transferData = await addFamilyId({
        type: 'transfer',
        amount: amountNum,
        category: isDestGoal ? 'Перенос на цель' : 'Перенос между счетами',
        description: `${sourceAccount?.name} → ${destName}${description ? ': ' + description : ''}`,
        date: format(date, 'yyyy-MM-dd'),
        account_id: accountId
      });
      await base44.entities.Transaction.create(transferData);

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Перенос выполнен');
      onClose();
      return;
    }

    // Check if selected account belongs to the current user (for expense/income)
    if (accountId && (type === 'expense' || type === 'income')) {
      const selectedAccount = accounts.find(a => a.id === accountId);
      if (selectedAccount && selectedAccount.created_by !== user.email && !selectedAccount.created_by.includes(user.id)) {
        toast.error('Действия с данными других пользователей запрещены!');
        return;
      }
    }

    const data = await addFamilyId({
      type,
      amount: amountNum,
      category,
      description,
      date: format(date, 'yyyy-MM-dd'),
      account_id: accountId || undefined
    });

    if (transaction) {
      updateMutation.mutate({ id: transaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Scan receipt using camera or file
  const handleReceiptScan = async (file) => {
    if (!file) return;
    
    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result;
          
          // Upload file
          const { file_url } = await base44.integrations.Core.UploadFile({ file: base64String });
          
          // Extract raw data from receipt
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
              // Несколько товаров - показываем модал для уточнения категорий
              setScannedItems(items.map(item => ({
                name: item.name || 'Товар',
                price: item.price || 0,
                category: '' // AI определит в модале
              })));
              setDescription(result.output.merchant || '');
              if (result.output.date) {
                try {
                  setDate(new Date(result.output.date));
                } catch (e) {}
              }
              setShowReviewModal(true);
            } else if (items.length === 1) {
              // Один товар - определяем категорию через AI
              await categorizeAndAddSingleItem(items[0], result.output);
            } else {
              // Нет товаров, создаем одну операцию с общей суммой
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
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Receipt scan error:', error);
      toast.error('Ошибка при загрузке файла');
      setIsScanning(false);
    }
  };

  // Категоризировать один товар через AI
  const categorizeAndAddSingleItem = async (item, receiptData) => {
    try {
      const categoryNames = categories.map(c => c.name).join(', ');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Определи наиболее подходящую категорию для товара "${item.name}" стоимостью ${item.price}₽.
        
Доступные категории: ${categoryNames}

Ответь только с названием категории.`,
        add_context_from_internet: false
      });

      setAmount(item.price?.toString() || '');
      setDescription(`${receiptData.merchant || ''} - ${item.name}`);
      setCategory(response.trim());
      if (receiptData.date) {
        try {
          setDate(new Date(receiptData.date));
        } catch (e) {}
      }
      setActiveTab('manual');
      toast.success('Товар добавлен!');
    } catch (error) {
      console.error('Categorization error:', error);
      // Fallback - просто показываем товар без категории
      setAmount(item.price?.toString() || '');
      setDescription(`${receiptData.merchant || ''} - ${item.name}`);
      setActiveTab('manual');
    }
  };

  // Обработка нескольких товаров после уточнения категорий
  const handleReviewConfirm = async (itemsWithCategories) => {
    setShowReviewModal(false);
    
    // Создаем отдельные операции для каждого товара
    const user = await base44.auth.me();
    
    for (const item of itemsWithCategories) {
      const data = await addFamilyId({
        type: 'expense',
        amount: item.price,
        category: item.category,
        description: `${description} - ${item.name}`,
        date: format(date, 'yyyy-MM-dd'),
        account_id: accountId || undefined
      });
      await base44.entities.Transaction.create(data);
    }
    
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    toast.success(`Добавлено ${itemsWithCategories.length} операций`);
    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {transaction ? 'Редактировать операцию' : 'Новая операция'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

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
              
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleReceiptScan(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleReceiptScan(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              <div className="flex flex-col gap-3">
                 <Button
                   onClick={(e) => {
                     e.stopPropagation();
                     cameraInputRef.current?.click();
                   }}
                   disabled={isScanning}
                   className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                 >
                   <Camera className="w-5 h-5 mr-2" />
                   Сфотографировать чек
                 </Button>
                 <Button
                   onClick={(e) => {
                     e.stopPropagation();
                     galleryInputRef.current?.click();
                   }}
                   variant="outline"
                   disabled={isScanning}
                 >
                   <Upload className="w-5 h-5 mr-2" />
                   Загрузить из галереи
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
          <Button
            variant={type === 'expense' ? 'default' : 'outline'}
            onClick={() => setType('expense')}
            className={cn(
              'flex-1 h-12 rounded-xl transition-all',
              type === 'expense' && 'bg-rose-500 hover:bg-rose-600 border-0'
            )}
          >
            <ArrowDownRight className="w-4 h-4 mr-2" />
            Расход
          </Button>
          <Button
            variant={type === 'income' ? 'default' : 'outline'}
            onClick={() => setType('income')}
            className={cn(
              'flex-1 h-12 rounded-xl transition-all',
              type === 'income' && 'bg-emerald-500 hover:bg-emerald-600 border-0'
            )}
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Доход
          </Button>
          <Button
            variant={type === 'transfer' ? 'default' : 'outline'}
            onClick={() => setType('transfer')}
            className={cn(
              'flex-1 h-12 rounded-xl transition-all',
              type === 'transfer' && 'bg-blue-500 hover:bg-blue-600 border-0'
            )}
          >
            <ArrowUpRight className="w-4 h-4 mr-2 transform rotate-90" />
            Перенос
          </Button>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Сумма</Label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-3xl font-bold h-16 pl-4 pr-12 rounded-xl border-2 focus:border-violet-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
              ₽
            </span>
          </div>
        </div>

        {/* Category or Transfer Accounts */}
        {type === 'transfer' ? (
          <>
            <div className="mb-4">
              <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Откуда</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Выберите ваш счёт" />
                </SelectTrigger>
                <SelectContent>
                  {myAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(acc.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Куда</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Выберите счёт или цель" />
                </SelectTrigger>
                <SelectContent>
                  {myAccounts.filter(a => a.id !== accountId).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(acc.balance)})
                    </SelectItem>
                  ))}
                  {goals?.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 border-t mt-1 pt-2">
                        Цели
                      </div>
                      {goals.map((goal) => {
                        const progress = goal.target_amount > 0 
                          ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                          : 0;
                        return (
                          <SelectItem key={`goal_${goal.id}`} value={`goal_${goal.id}`}>
                            🎯 {goal.title} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(goal.current_amount || 0)} / {progress.toFixed(0)}%)
                          </SelectItem>
                        );
                      })}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-slate-500 dark:text-slate-400 text-sm">Категория</Label>
              <Link to={createPageUrl('Categories')}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-violet-600"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Добавить категорию
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {filteredCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={category === cat.name ? 'default' : 'outline'}
                  onClick={() => setCategory(cat.name)}
                  className={cn(
                    'h-auto py-3 flex-col gap-1 rounded-xl transition-all',
                    category === cat.name && 'bg-violet-500 hover:bg-violet-600 border-0'
                  )}
                >
                  <span className="text-xl drop-shadow-sm">{cat.icon === 'Utensils' ? '🍔' : cat.icon === 'Car' ? '🚗' : cat.icon === 'Home' ? '🏠' : cat.icon === 'Gamepad2' ? '🎮' : cat.icon === 'Heart' ? '💊' : cat.icon === 'Shirt' ? '👕' : cat.icon === 'CreditCard' ? '💳' : cat.icon === 'BookOpen' ? '📚' : cat.icon === 'Wallet' ? '💰' : cat.icon === 'Laptop' ? '💻' : cat.icon === 'TrendingUp' ? '📈' : cat.icon === 'Gift' ? '🎁' : '📦'}</span>
                  <span className="text-xs">{cat.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="mb-4">
          <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Дата</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-12 rounded-xl"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {format(date, 'dd.MM.yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Account */}
        {myAccounts && myAccounts.length > 0 && type !== 'transfer' && (
          <div className="mb-4">
            <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Счёт</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Выберите ваш счёт" />
              </SelectTrigger>
              <SelectContent>
                {myAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Комментарий</Label>
          <Textarea
            placeholder="Добавьте описание..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl resize-none"
            rows={2}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={
            !amount || 
            (type !== 'transfer' && !category) ||
            (type === 'transfer' && (!accountId || !toAccountId)) ||
            createMutation.isPending || 
            updateMutation.isPending ||
            isSubmitting
          }
          className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-lg shadow-lg shadow-violet-500/25"
        >
          {(createMutation.isPending || updateMutation.isPending || isSubmitting) ? (
            <span className="animate-pulse">Сохранение...</span>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              {transaction ? 'Обновить' : type === 'transfer' ? 'Перенести' : 'Сохранить'}
            </>
          )}
        </Button>
        </>
        )}
      </motion.div>
    </motion.div>
  );
}