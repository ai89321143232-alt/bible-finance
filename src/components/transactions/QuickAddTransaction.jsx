import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { X, ArrowUpRight, ArrowDownRight, Check, Calendar, Camera, Loader2, Upload } from 'lucide-react';
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

export default function QuickAddTransaction({ transaction, onClose, accounts }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('manual');
  const [type, setType] = useState(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [category, setCategory] = useState(transaction?.category || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [date, setDate] = useState(transaction?.date ? new Date(transaction.date) : new Date());
  const [accountId, setAccountId] = useState(transaction?.account_id || '');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
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

  const handleSubmit = () => {
    if (!amount || !category) return;

    const data = {
      type,
      amount: parseFloat(amount),
      category,
      description,
      date: format(date, 'yyyy-MM-dd'),
      account_id: accountId || undefined
    };

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
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Extract data from receipt using AI
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            date: { type: 'string' },
            merchant: { type: 'string' },
            category: { type: 'string' },
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
        setAmount(result.output.amount?.toString() || '');
        setDescription(result.output.merchant || '');
        setCategory(result.output.category || '');
        if (result.output.date) {
          try {
            setDate(new Date(result.output.date));
          } catch (e) {}
        }
        setActiveTab('manual');
        toast.success('Чек распознан успешно!');
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
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files?.[0] && handleReceiptScan(e.target.files[0])}
                className="hidden"
              />
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Сфотографировать чек
                </Button>
                <Button
                  onClick={() => {
                    const input = fileInputRef.current;
                    if (input) {
                      input.capture = '';
                      input.click();
                    }
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

        {/* Category */}
        <div className="mb-4">
          <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Категория</Label>
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
        {accounts && accounts.length > 0 && (
          <div className="mb-4">
            <Label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Счёт</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Выберите счёт" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
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
          disabled={!amount || !category || createMutation.isPending || updateMutation.isPending}
          className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-lg shadow-lg shadow-violet-500/25"
        >
          {(createMutation.isPending || updateMutation.isPending) ? (
            <span className="animate-pulse">Сохранение...</span>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              {transaction ? 'Обновить' : 'Сохранить'}
            </>
          )}
        </Button>
        </>
        )}
      </motion.div>
    </motion.div>
  );
}