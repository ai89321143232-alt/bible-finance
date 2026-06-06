import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Plus, Search, Filter, ArrowUpRight, ArrowDownRight, 
  ChevronLeft, ChevronRight, Calendar, Trash2, Edit2, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QuickAddTransaction from '@/components/transactions/QuickAddTransaction';
import SwipeableTransaction from '@/components/transactions/SwipeableTransaction';

const CATEGORY_ICONS = {
  'Еда': '🍔',
  'Транспорт': '🚗',
  'Жильё': '🏠',
  'Развлечения': '🎮',
  'Здоровье': '💊',
  'Одежда': '👕',
  'Подписки': '📱',
  'Образование': '📚',
  'Зарплата': '💰',
  'Фриланс': '💻',
  'Инвестиции': '📈',
  'Подарки': '🎁',
  'Другое': '📦'
};

// ============================================================
// pages/Transactions.jsx — СТРАНИЦА ОПЕРАЦИЙ
// ============================================================
// Маршрут: "/Transactions"
//
// ФУНКЦИИ:
//   - Просмотр транзакций с разбивкой по дням
//   - Фильтрация: по месяцу, типу (доход/расход), категории, поиск
//   - Добавление / редактирование (QuickAddTransaction модал)
//   - Удаление с подтверждением (AlertDialog)
//   - Свайп на мобильном (SwipeableTransaction)
//
// ДАННЫЕ:
//   ['transactions'] → последние 100 транзакций по дате
//   ['accounts']     → счета (передаются в QuickAddTransaction)
//
// КОМПОНЕНТЫ:
//   SwipeableTransaction → строка транзакции со свайп-действиями (components/transactions/)
//   QuickAddTransaction  → модал создания/редактирования (components/transactions/)
// ============================================================
export default function Transactions() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deleteId, setDeleteId] = useState(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDeleteId(null);
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const inMonth = date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth);
    const matchesSearch = !searchQuery || 
      t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    
    return inMonth && matchesSearch && matchesType && matchesCategory;
  });

  // Group by date
  const groupedTransactions = filteredTransactions.reduce((groups, t) => {
    const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));

  // Get unique categories
  const allCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))];

  // Calculate totals
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Операции
          </h1>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить
          </Button>
        </motion.div>

        {/* Month Selector */}
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-xl text-slate-700 dark:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white capitalize">
                  {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                </h2>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-sm text-emerald-600">+{formatCurrency(totalIncome)}</span>
                  <span className="text-sm text-rose-600">-{formatCurrency(totalExpense)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-xl text-slate-700 dark:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-slate-200 dark:border-slate-700"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 rounded-xl text-slate-900 dark:text-white">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="expense">Расходы</SelectItem>
              <SelectItem value="income">Доходы</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 rounded-xl text-slate-900 dark:text-white">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {allCategories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transactions List */}
        <div className="space-y-6">
          {sortedDates.length > 0 ? (
            sortedDates.map((dateKey) => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 px-1">
                  {format(new Date(dateKey), 'd MMMM, EEEE', { locale: ru })}
                </h3>
                <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-0">
                    {groupedTransactions[dateKey].map((transaction, index) => (
                      <SwipeableTransaction
                        key={transaction.id}
                        transaction={transaction}
                        index={index}
                        onDelete={setDeleteId}
                        onEdit={(t) => {
                          setEditTransaction(t);
                          setShowAddModal(true);
                        }}
                        formatCurrency={formatCurrency}
                        showActions={false}
                      />
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-2">Нет операций за этот период</p>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="outline"
                className="rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить операцию
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <QuickAddTransaction 
            transaction={editTransaction}
            onClose={() => {
              setShowAddModal(false);
              setEditTransaction(null);
            }}
            accounts={accounts}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить операцию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Операция будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}