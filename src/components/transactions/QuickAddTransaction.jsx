import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { X, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Check, Calendar } from 'lucide-react';
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
import { cn } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  { value: 'Еда', icon: '🍔' },
  { value: 'Транспорт', icon: '🚗' },
  { value: 'Жильё', icon: '🏠' },
  { value: 'Развлечения', icon: '🎮' },
  { value: 'Здоровье', icon: '💊' },
  { value: 'Одежда', icon: '👕' },
  { value: 'Подписки', icon: '📱' },
  { value: 'Образование', icon: '📚' },
  { value: 'Другое', icon: '📦' },
];

const INCOME_CATEGORIES = [
  { value: 'Зарплата', icon: '💰' },
  { value: 'Фриланс', icon: '💻' },
  { value: 'Инвестиции', icon: '📈' },
  { value: 'Подарки', icon: '🎁' },
  { value: 'Другое', icon: '📦' },
];

export default function QuickAddTransaction({ onClose, accounts }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [accountId, setAccountId] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
    }
  });

  const handleSubmit = () => {
    if (!amount || !category) return;

    createMutation.mutate({
      type,
      amount: parseFloat(amount),
      category,
      description,
      date: format(date, 'yyyy-MM-dd'),
      account_id: accountId || undefined
    });
  };

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Новая операция
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

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
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={category === cat.value ? 'default' : 'outline'}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'h-auto py-3 flex-col gap-1 rounded-xl transition-all',
                  category === cat.value && 'bg-violet-500 hover:bg-violet-600 border-0'
                )}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-xs">{cat.value}</span>
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
          disabled={!amount || !category || createMutation.isPending}
          className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-lg shadow-lg shadow-violet-500/25"
        >
          {createMutation.isPending ? (
            <span className="animate-pulse">Сохранение...</span>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Сохранить
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}