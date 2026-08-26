import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TransactionService } from '@/services';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, ArrowUpRight, ArrowDownRight, Check, Calendar, Camera, Loader2, Upload, Plus, QrCode } from 'lucide-react';
import ReceiptReviewModal from './ReceiptReviewModal';
import { parseFlexibleDate } from '@/lib/parseDate';
import { compressImage } from '@/lib/compressImage';
import { getCategoryEmoji } from '@/lib/categoryIcon';
import QRReceiptScanner from './QRReceiptScanner';
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
  const [toAccountId, setToAccountId] = useState(transaction?.to_account_id || '');
  const [isScanning, setIsScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const reviewSubmitLockRef = useRef(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isBankOperations, setIsBankOperations] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [budgetScope, setBudgetScope] = useState('personal');
  const [fxRate, setFxRate] = useState('');
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const debounceRef = useRef(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  // Восстановить курс обмена при редактировании fx-транзакции
  React.useEffect(() => {
    if (transaction?.tags?.some((t) => t === 'fx' || String(t).startsWith('fx:'))) {
      const rateTag = transaction.tags.find((t) => String(t).startsWith('fx:'));
      if (rateTag) setFxRate(rateTag.replace('fx:', ''));
    }
  }, [transaction]);

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

  const { data: family = null } = useQuery({
    queryKey: ['family'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user?.family_id) return null;
      const families = await base44.entities.Family.list();
      return families.find(f => f.id === user.family_id) || null;
    },
    enabled: !!currentUser?.family_id,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.filter({ is_active: true })
  });

  // Если категория расхода совпадает и с личным, и с семейным бюджетом — нужно
  // явно спросить пользователя, в какой из них засчитать эту операцию, иначе
  // расход задваивается в обоих бюджетах.
  const hasPersonalBudgetMatch = category && budgets.some(b =>
    !b.is_family_budget &&
    b.created_by_id === currentUser?.id &&
    (b.categories?.length > 0 ? b.categories : (b.category ? [b.category] : [])).includes(category)
  );
  const hasFamilyBudgetMatch = category && budgets.some(b =>
    b.is_family_budget &&
    (b.categories?.length > 0 ? b.categories : (b.category ? [b.category] : [])).includes(category)
  );
  const showBudgetScopeChoice = type === 'expense' && hasPersonalBudgetMatch && hasFamilyBudgetMatch;

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
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await handleSubmitInternal();
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Бизнес-логика перенесена в TransactionService. Компонент только вызывает
  // сервис и отображает результат — проверки прав, остатков, обновление
  // балансов и инвалидация кэша выполняются в сервисном слое.
  const handleSubmitInternal = async () => {
    if (type === 'transfer') {
      const res = await TransactionService.transfer({
        amount, description, date, account_id: accountId, toAccountId, accounts, goals,
        existingId: transaction?.id || null,
        fxRate: isFx ? fxRate : null,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(transaction ? 'Перенос обновлён' : 'Перенос выполнен');
      onClose();
      return;
    }

    const res = await TransactionService.saveEntry({
      type, amount, category, description, date,
      account_id: accountId, accounts, existingId: transaction?.id || null,
      budget_scope: showBudgetScopeChoice ? budgetScope : undefined,
    });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(type === 'expense' ? 'Расход добавлен' : 'Доход добавлен');
    onClose();
  };

  // Проверка: если дата старше 7 дней — предупреждаем и сбрасываем на сегодня
  const validateReceiptDate = (parsedDate, source = 'чека') => {
    if (!parsedDate) return new Date();
    const now = new Date();
    const diffDays = (now - parsedDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
      toast.warning(`Дата из ${source} (${parsedDate.toLocaleDateString('ru-RU')}) слишком старая. Использована сегодняшняя дата.`);
      return new Date();
    }
    return parsedDate;
  };

  // Scan receipt using camera or file
  const handleReceiptScan = async (file) => {
    if (!file) return;
    setIsScanning(true);
    setScanError(null);
    try {
      // Сжимаем фото перед загрузкой — ускоряет загрузку и AI-распознавание
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      const allCategoryNames = categories.map(c => c.name);
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Итоговая сумма операции (по модулю, без знака минус). Это может быть чек из магазина ИЛИ скриншот из банковского приложения (перевод, списание, пополнение).' },
            operation_type: { type: 'string', enum: ['expense', 'income'], description: 'Тип операции: "expense" если это списание/оплата/расход/перевод другому человеку, "income" если это пополнение/зачисление/поступление денег' },
            date: { type: 'string', description: 'Дата операции строго в формате YYYY-MM-DD (например 2025-08-09). Сегодня: 2026-08-09. Если дата на чеке старше 7 дней от сегодня или год не виден — используй сегодняшнюю дату 2026-08-09.' },
            merchant: { type: 'string' },
            card_hint: { type: 'string', description: 'Название карты или счёта, если видно на скриншоте (например "Карта Пэй", "Visa Classic")' },
            available_categories: { type: 'array', description: `Доступные категории пользователя: ${allCategoryNames.join(', ')}. Для каждого товара/операции выбери наиболее подходящую из этого списка.`, items: { type: 'string' } },
            available_categories: {
              type: 'array',
              description: 'Список доступных категорий пользователя (заполняется автоматически)',
              items: { type: 'string' }
            },
            items: {
              type: 'array',
              description: 'Товары ОДНОГО чека из магазина (позиции одной покупки на одну дату).',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                  category: { type: 'string', description: 'Категория из списка available_categories, наиболее подходящая для этого товара' }
                }
              }
            },
            operations: {
              type: 'array',
              description: 'Список ОТДЕЛЬНЫХ операций, если на изображении история/лента транзакций из банковского приложения (список отдельных платежей/переводов/пополнений с разными продавцами/получателями, даже если все они за один и тот же день) — это НЕ товары одного чека. Извлеки КАЖДУЮ видимую операцию из списка, не только последнюю.',
              items: {
                type: 'object',
                properties: {
                  merchant: { type: 'string', description: 'Название операции/получателя/магазина' },
                  amount: { type: 'number', description: 'Сумма операции по модулю' },
                  date: { type: 'string', description: 'Дата операции строго в формате YYYY-MM-DD (например 2025-08-09). Сегодня: 2026-08-09. Если дата старше 7 дней от сегодня или год не виден — используй сегодняшнюю дату 2026-08-09.' },
                  operation_type: { type: 'string', enum: ['expense', 'income'] },
                  category: { type: 'string', description: 'Категория из списка available_categories, наиболее подходящая для этой операции' }
                }
              }
            }
          }
        }
      });

      const hasOperations = (result.output?.operations || []).length > 0;
      const hasItems = (result.output?.items || []).length > 0;
      if (result.status === 'success' && result.output && (result.output.amount || hasOperations || hasItems)) {
        const items = result.output.items || [];
        if (result.output.operation_type === 'income') {
          setType('income');
        } else if (result.output.operation_type === 'expense') {
          setType('expense');
        }
        // Пытаемся определить счёт по названию карты, если оно видно на фото
        let matchedAccountId = null;
        if (result.output.card_hint) {
          const hint = result.output.card_hint.toLowerCase();
          const matchedAccount = myAccounts.find(acc =>
            acc.name && (hint.includes(acc.name.toLowerCase()) || acc.name.toLowerCase().includes(hint))
          );
          if (matchedAccount) {
            setAccountId(matchedAccount.id);
            matchedAccountId = matchedAccount.id;
          }
        }
        // Если счёт не определён по подсказке, но у пользователя только один счёт — выбираем его
        if (!matchedAccountId && myAccounts.length === 1) {
          setAccountId(myAccounts[0].id);
          matchedAccountId = myAccounts[0].id;
        }
        const operations = result.output.operations || [];
        if (operations.length > 1) {
          // Скриншот из банка со списком операций — у каждой своя дата/тип/сумма
          // Категории уже определены AI в первом запросе — второй запрос не нужен
          setIsBankOperations(true);
          setScannedItems(operations.map((op) => ({
            name: op.merchant || 'Операция',
            price: op.amount || 0,
            type: op.operation_type === 'income' ? 'income' : 'expense',
            date: op.date || null,
            category: op.category || ''
          })));
          setShowReviewModal(true);
        } else if (items.length > 1) {
          // Категории уже определены AI в первом запросе — второй запрос не нужен
          setIsBankOperations(false);
          setScannedItems(items.map((item) => ({
            name: item.name || 'Товар',
            price: item.price || 0,
            category: item.category || ''
          })));
          setDescription(result.output.merchant || '');
          const parsedDate = validateReceiptDate(parseFlexibleDate(result.output.date));
          setDate(parsedDate);
          setShowReviewModal(true);
        } else if (items.length === 1 && result.output.operation_type !== 'income') {
          await categorizeAndAddSingleItem(items[0], result.output, matchedAccountId);
        } else {
          setAmount(result.output.amount?.toString() || '');
          setDescription(result.output.merchant || '');
          setActiveTab('manual');
          toast.success('Распознано успешно!');
        }
      } else {
        const msg = 'Не удалось найти сумму на изображении. Попробуйте другое фото или введите операцию вручную.';
        toast.error(msg);
        setScanError(msg);
      }
    } catch (error) {
      console.error('Receipt scan error:', error);
      const msg = 'Ошибка при сканировании: ' + (error?.message || 'неизвестная ошибка');
      toast.error(msg);
      setScanError(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const categorizeAndAddSingleItem = async (item, receiptData, matchedAccountId) => {
    try {
      const categoryNames = categories.map(c => c.name).join(', ');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Определи наиболее подходящую категорию для товара "${item.name}" стоимостью ${item.price}₽.\n\nДоступные категории: ${categoryNames}\n\nОтвечай только с названием категории.`,
        add_context_from_internet: false
      });
      const cat = response.trim();
      const parsedDate = validateReceiptDate(parseFlexibleDate(receiptData.date));

      // Если счёт определён — сохраняем автоматически
      if (matchedAccountId) {
        const res = await TransactionService.saveEntry({
          type: 'expense',
          amount: item.price,
          category: cat,
          description: `${receiptData.merchant || ''} - ${item.name}`,
          date: parsedDate,
          account_id: matchedAccountId,
          accounts,
        });
        if (res.ok) {
          toast.success('Расход добавлен');
          onClose();
          return;
        }
        toast.error(res.error || 'Не удалось сохранить');
      }

      // Иначе — заполняем форму для ручного сохранения
      setAmount(item.price?.toString() || '');
      setDescription(`${receiptData.merchant || ''} - ${item.name}`);
      setCategory(cat);
      setDate(parsedDate);
      if (matchedAccountId) setAccountId(matchedAccountId);
      setActiveTab('manual');
      if (!matchedAccountId) {
        toast.info('Выберите счёт и нажмите «Сохранить»');
      }
    } catch (error) {
      setAmount(item.price?.toString() || '');
      setDescription(`${receiptData.merchant || ''} - ${item.name}`);
      setActiveTab('manual');
    }
  };

  // Данные, извлечённые из QR-кода чека (сумма + дата)
  const handleQRDataExtracted = (data) => {
    setAmount(data.amount?.toString() || '');
    if (data.date) {
      try {
        const parsed = new Date(data.date);
        setDate(validateReceiptDate(parsed, 'QR-кода'));
      } catch (e) {}
    }
    setDescription(data.description || '');
    setActiveTab('manual');
    setShowQRScanner(false);
  };

  const handleReviewConfirm = async (itemsWithCategories) => {
    if (reviewSubmitLockRef.current) return;
    reviewSubmitLockRef.current = true;
    try {
      const res = isBankOperations
        ? await TransactionService.addBankOperations({
            items: itemsWithCategories,
            account_id: accountId,
            accounts,
          })
        : await TransactionService.addReceiptItems({
            items: itemsWithCategories,
            description,
            date,
            account_id: accountId,
            accounts,
          });
      setShowReviewModal(false);
      toast.success(`Добавлено ${res.count} операций`);
      onClose();
    } catch (error) {
      console.error('Save receipt items error:', error);
      toast.error('Не удалось сохранить операции');
    } finally {
      reviewSubmitLockRef.current = false;
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  // Валютный обмен: если источник и получатель в разных валютах — показываем курс
  const sourceAcc = myAccounts.find(a => a.id === accountId);
  const destAcc = (accounts || []).find(a => a.id === toAccountId);
  const isFx = type === 'transfer' && sourceAcc && destAcc && (sourceAcc.currency || 'RUB') !== (destAcc.currency || 'RUB');
  const fxRateNum = parseFloat(fxRate) || 0;
  const destAmount = isFx && fxRateNum > 0 && amount ? (parseFloat(amount) / fxRateNum) : 0;

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
                  {isScanning ? 'Распознавание с помощью AI...' : 'AI-сканер операций'}
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Загрузите фото чека или скриншот истории операций из банковского приложения —
                  AI сам распознает все расходы и доходы и предложит категории
                </p>
                {scanError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-400 text-left">
                    {scanError}
                  </div>
                )}
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                  onChange={(e) => { if (e.target.files?.[0]) { handleReceiptScan(e.target.files[0]); e.target.value = ''; } }}
                  className="hidden" />
                <input ref={galleryInputRef} type="file" accept="image/*,.pdf"
                  onChange={(e) => { if (e.target.files?.[0]) { handleReceiptScan(e.target.files[0]); e.target.value = ''; } }}
                  className="hidden" />
                <div className="flex flex-col gap-3">
                  <Button onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }} disabled={isScanning}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                    <Camera className="w-5 h-5 mr-2" /> Сфотографировать чек или экран
                  </Button>
                  <Button onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click(); }} variant="outline" disabled={isScanning}>
                    <Upload className="w-5 h-5 mr-2" /> Загрузить фото или скриншот
                  </Button>
                  <Button onClick={(e) => { e.stopPropagation(); setShowQRScanner(true); }} variant="outline" disabled={isScanning}>
                    <QrCode className="w-5 h-5 mr-2" /> Сканировать QR-код чека
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
                      {(accounts || []).filter(a => a.id !== accountId && !myAccounts.find(ma => ma.id === a.id) && a.family_id).map((acc) => {
                        const memberName = acc.user_id === currentUser?.id ? 'Вы' :
                          family?.members?.find(m => m.user_id === acc.user_id)?.display_name ||
                          family?.members?.find(m => m.user_id === acc.user_id)?.name ||
                          'Член семьи';
                        return (
                          <option key={acc.id} value={acc.id}>
                            👤 {memberName}: {acc.name} ({new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(acc.balance)})
                          </option>
                        );
                      })}
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

                  {/* Блок обмена валют — только при разных валютах счетов */}
                  {isFx && (
                    <div className="mb-4 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                      <Label className="text-violet-700 dark:text-violet-300 text-sm mb-2 block">
                        Курс обмена ({sourceAcc?.currency} → {destAcc?.currency})
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={fxRate}
                        onChange={(e) => setFxRate(e.target.value)}
                        className="h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      {destAmount > 0 && (
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">
                          Получите ≈ {destAmount.toFixed(2)} {destAcc?.currency}
                        </p>
                      )}
                    </div>
                  )}
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
                          {getCategoryEmoji(cat.icon)}
                        </span>
                        <span className="text-xs">{cat.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget scope — category matches both a personal and a family budget */}
              {showBudgetScopeChoice && (
                <div className="mb-4">
                  <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Куда отнести расход</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={budgetScope === 'personal' ? 'default' : 'outline'}
                      onClick={() => setBudgetScope('personal')}
                      className={cn('flex-1 h-11 rounded-xl', budgetScope === 'personal' ? 'bg-violet-600 hover:bg-violet-700 border-0 text-white' : 'text-slate-900 dark:text-white')}
                    >
                      Личный бюджет
                    </Button>
                    <Button
                      type="button"
                      variant={budgetScope === 'family' ? 'default' : 'outline'}
                      onClick={() => setBudgetScope('family')}
                      className={cn('flex-1 h-11 rounded-xl', budgetScope === 'family' ? 'bg-violet-600 hover:bg-violet-700 border-0 text-white' : 'text-slate-900 dark:text-white')}
                    >
                      Семейный бюджет
                    </Button>
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
                  className="rounded-xl resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400" rows={2} />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!amount || myAccounts.length === 0 || !accountId || (type !== 'transfer' && !category) || (type === 'transfer' && (!toAccountId || (isFx && !fxRate))) || isSubmitting}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-lg shadow-lg shadow-violet-500/25"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Сохранение...</span>
                ) : (
                  <><Check className="w-5 h-5 mr-2" />{transaction ? 'Обновить' : type === 'transfer' ? 'Перенести' : 'Сохранить'}</>
                )}
              </Button>
            </>
          )}
    </>
  );

  return createPortal(
    <>
      {showQRScanner && (
        <QRReceiptScanner
          onDataExtracted={handleQRDataExtracted}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      <AnimatePresence>
        {showReviewModal && (
          <ReceiptReviewModal
            items={scannedItems}
            categories={categories}
            onConfirm={handleReviewConfirm}
            onClose={() => setShowReviewModal(false)}
            isLoading={isScanning}
            mode={isBankOperations ? 'bank' : 'receipt'}
            accounts={myAccounts}
            accountId={accountId}
            onAccountChange={setAccountId}
          />
        )}
      </AnimatePresence>

      {isMobile ? (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.25 }}
          className="fixed inset-0 bg-[#0f1117] z-[60] overflow-y-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div
            className="sticky top-0 bg-[#0a0d13] border-b border-white/5 px-4 py-4 flex items-center gap-3 z-10"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          >
            <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-white">
              {transaction ? 'Редактировать операцию' : 'Новая операция'}
            </h2>
          </div>
          <div className="p-4 pb-32">
            {formContent}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4"
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
    </>,
    document.body
  );
}