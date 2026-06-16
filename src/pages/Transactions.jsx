import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Plus, Search, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import PullToRefresh from '@/components/PullToRefresh';
import MobileSelect from '@/components/mobile/MobileSelect';

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚',
  'Зарплата': '💰', 'Фриланс': '💻', 'Инвестиции': '📈', 'Подарки': '🎁', 'Другое': '📦'
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'all';
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deleteId, setDeleteId] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const allTransactions = await base44.entities.Transaction.list('-date', 100);
      const transaction = allTransactions.find(t => t.id === id);
      if (transaction?.account_id && transaction.type !== 'transfer') {
        const allAccounts = await base44.entities.Account.list();
        const account = allAccounts.find(a => a.id === transaction.account_id);
        if (account) {
          let newBalance = account.balance ?? 0;
          if (transaction.type === 'expense') newBalance += transaction.amount;
          else if (transaction.type === 'income') newBalance -= transaction.amount;
          await base44.entities.Account.update(transaction.account_id, { balance: newBalance });
        }
      }
      await base44.entities.Transaction.delete(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const prevTransactions = queryClient.getQueryData(['transactions']);
      queryClient.setQueryData(['transactions'], (old) => old ? old.filter(t => t.id !== id) : []);
      setDeleteId(null);
      return { prevTransactions };
    },
    onError: (_err, _id, context) => {
      if (context?.prevTransactions) queryClient.setQueryData(['transactions'], context.prevTransactions);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const inMonth = date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth);
    const matchesSearch = !searchQuery || t.category?.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    return inMonth && matchesSearch && matchesType && matchesCategory;
  });

  const groupedTransactions = filteredTransactions.reduce((groups, t) => {
    const d = new Date(t.date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));
  const allCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Операции</h1>
          <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl">
            <Plus className="w-5 h-5 mr-2" />Добавить
          </Button>
        </motion.div>

        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-xl text-slate-700 dark:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white capitalize">{format(currentMonth, 'LLLL yyyy', { locale: ru })}</h2>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-sm text-emerald-600">+{formatCurrency(totalIncome)}</span>
                  <span className="text-sm text-rose-600">-{formatCurrency(totalExpense)}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-xl text-slate-700 dark:text-white">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl border-slate-200 dark:border-slate-700" />
          </div>
          <MobileSelect value={filterType} onValueChange={setFilterType} placeholder="Тип" title="Тип операции" triggerClassName="w-32 rounded-xl text-slate-900 dark:text-white">
            <option value="all">Все типы</option>
            <option value="expense">Расходы</option>
            <option value="income">Доходы</option>
          </MobileSelect>
          <MobileSelect value={filterCategory} onValueChange={setFilterCategory} placeholder="Категория" title="Категория" triggerClassName="w-40 rounded-xl text-slate-900 dark:text-white">
            <option value="all">Все категории</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
            ))}
          </MobileSelect>
        </div>

        <div className="space-y-6">
          {sortedDates.length > 0 ? (
            sortedDates.map((dateKey) => (
              <motion.div key={dateKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 px-1">
                  {format(new Date(dateKey + 'T00:00:00'), 'd MMMM, EEEE', { locale: ru })}
                </h3>
                <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-0">
                    {groupedTransactions[dateKey].map((transaction, index) => (
                      <SwipeableTransaction key={transaction.id} transaction={transaction} index={index}
                        onDelete={setDeleteId} onEdit={(t) => { setEditTransaction(t); setShowAddModal(true); }}
                        formatCurrency={formatCurrency} showActions={false} />
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
              <Button onClick={() => setShowAddModal(true)} variant="outline" className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />Добавить операцию
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <QuickAddTransaction transaction={editTransaction}
            onClose={() => { setShowAddModal(false); setEditTransaction(null); }} accounts={accounts} />
        )}
      </AnimatePresence>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить операцию?</AlertDialogTitle>
            <AlertDialogDescription>Это действие нельзя отменить. Операция будет удалена навсегда.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-rose-600 hover:bg-rose-700 rounded-xl">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PullToRefresh>
  );
}