import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Baby, BookOpen, Heart, Shirt, Gamepad2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import MobileSelect from '@/components/mobile/MobileSelect';
import { ChildExpenseService } from '@/services/ChildExpenseService';
import { useExchangeRates } from '@/hooks/useExchangeRates';

const CATEGORIES = {
  food: { icon: '🍽️', label: 'Еда', color: '#10B981' },
  education: { icon: '📚', label: 'Образование', color: '#3B82F6' },
  health: { icon: '⚕️', label: 'Здоровье', color: '#EF4444' },
  clothes: { icon: '👕', label: 'Одежда', color: '#EC4899' },
  entertainment: { icon: '🎮', label: 'Развлечения', color: '#F59E0B' },
  other: { icon: '📦', label: 'Другое', color: '#8B5CF6' }
};

export default function ChildExpenses() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    child_name: '',
    category: 'food',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    account_id: ''
  });
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [migrationAccountId, setMigrationAccountId] = useState('');
  const { profileCurrency, convertOrZero } = useExchangeRates();

  const { data: expenses = [] } = useQuery({
    queryKey: ['childExpenses'],
    queryFn: () => base44.entities.ChildExpense.list('-date')
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['childExpenseAccounts'],
    queryFn: () => base44.entities.Account.list(),
  });
  const availableAccounts = accounts.filter((account) => account.is_active !== false);

  const createMutation = useMutation({
    mutationFn: (data) => ChildExpenseService.create(data, availableAccounts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childExpenses'] });
      resetForm();
      toast.success('Расход добавлен');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ expense, data }) => ChildExpenseService.update(expense, data, availableAccounts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childExpenses'] });
      resetForm();
      toast.success('Расход обновлён');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (expense) => ChildExpenseService.remove(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childExpenses'] });
      toast.success('Расход удалён');
    }
  });

  const migrationMutation = useMutation({
    mutationFn: async () => (await base44.functions.invoke('migrateChildExpenses', { default_account_id: migrationAccountId })).data,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['childExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['childExpenseAccounts'] });
      setMigrationOpen(false);
      toast.success(`Перенесено расходов: ${result.migrated}`);
      if (result.failed?.length) toast.error(`Не удалось перенести: ${result.failed.length}`);
    }
  });

  const handleSave = () => {
    if (!formData.child_name.trim()) {
      toast.error('Введите имя ребёнка');
      return;
    }
    if (!formData.account_id) {
      toast.error('Выберите счёт');
      return;
    }

    const data = {
      ...formData,
      amount: parseFloat(formData.amount)
    };

    if (editingExpense) {
      updateMutation.mutate({ expense: editingExpense, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const resetForm = () => {
    setFormData({
      child_name: '',
      category: 'food',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      account_id: ''
      });
    setEditingExpense(null);
    setShowModal(false);
  };

  const openModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        child_name: expense.child_name,
        category: expense.category,
        amount: expense.amount.toString(),
        date: expense.date,
        description: expense.description || '',
        account_id: expense.account_id || ''
      });
    }
    setShowModal(true);
  };

  const formatCurrency = (amount, currency = profileCurrency) => new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount);

  // Группируем по детям
  const expensesByChild = expenses.reduce((acc, exp) => {
    if (!acc[exp.child_name]) {
      acc[exp.child_name] = [];
    }
    acc[exp.child_name].push(exp);
    return acc;
  }, {});

  // Статистика по категориям
  const categoryStats = Object.entries(CATEGORIES).reduce((acc, [key, val]) => {
    const total = expenses.filter(e => e.category === key).reduce((s, e) => s + e.amount, 0);
    if (total > 0) {
      acc.push({ category: key, ...val, total });
    }
    return acc;
  }, []);

  const totalExpenses = expenses.reduce((sum, expense) => sum + convertOrZero(expense.amount, expense.currency || 'RUB'), 0);
  const pendingMigration = expenses.filter((expense) => !expense.transaction_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {pendingMigration.length > 0 && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
            <span>Нужно привязать к счёту: {pendingMigration.length} {pendingMigration.length === 1 ? 'старый расход' : 'старых расходов'}.</span>
            <Button size="sm" onClick={() => setMigrationOpen(true)}>Привязать счёт</Button>
          </div>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Расходы на детей
            </h1>
            <Button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 gap-2"
            >
              <Plus className="w-5 h-5" />
              Добавить расход
            </Button>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Отслеживайте расходы на каждого ребёнка
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Всего потрачено</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Детей</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{Object.keys(expensesByChild).length}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Записей</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{expenses.length}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        {categoryStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>По категориям</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryStats.sort((a, b) => b.total - a.total).map((stat) => (
                    <div key={stat.category} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{stat.icon}</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{stat.label}</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(stat.total)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* By Child */}
        {Object.entries(expensesByChild).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(expensesByChild).map(([childName, childExpenses], childIdx) => {
              const childTotal = childExpenses.reduce((s, e) => s + e.amount, 0);
              return (
                <motion.div
                  key={childName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + childIdx * 0.05 }}
                >
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                            <span className="text-lg">👶</span>
                          </div>
                          <div>
                            <CardTitle>{childName}</CardTitle>
                            <p className="text-sm text-slate-500">{childExpenses.length} записей</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-violet-600">{formatCurrency(childTotal, childExpenses[0]?.currency || 'RUB')}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {childExpenses.map((expense) => {
                          const cat = CATEGORIES[expense.category];
                          return (
                            <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-lg">{cat.icon}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">{cat.label}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {format(new Date(expense.date), 'd MMM yyyy', { locale: ru })}
                                    {expense.description && ` • ${expense.description}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(expense.amount, expense.currency || 'RUB')}</p>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openModal(expense)}
                                    className="h-8 w-8"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteMutation.mutate(expense)}
                                    className="h-8 w-8 text-rose-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">Расходов нет</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={resetForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Редактировать расход' : 'Новый расход'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Имя ребёнка</Label>
              <Input
                value={formData.child_name}
                onChange={(e) => setFormData({ ...formData, child_name: e.target.value })}
                placeholder="Например: Маша"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Категория</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.icon} {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Счёт</Label>
              <MobileSelect
                value={formData.account_id}
                onValueChange={(account_id) => setFormData({ ...formData, account_id })}
                placeholder="Выберите счёт"
                title="Счёт списания"
                triggerClassName="mt-1 w-full h-10"
              >
                {availableAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name} · {account.currency || 'RUB'}</SelectItem>)}
              </MobileSelect>
            </div>

            <div>
              <Label>Сумма</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{availableAccounts.find((account) => account.id === formData.account_id)?.currency || profileCurrency}</span>
              </div>
            </div>

            <div>
              <Label>Дата</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Описание</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опционально"
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              {editingExpense ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={migrationOpen} onOpenChange={setMigrationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Привязать старые расходы</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Выберите счёт: с него будут списаны суммы всех старых расходов без привязки.</p>
            <MobileSelect value={migrationAccountId} onValueChange={setMigrationAccountId} placeholder="Выберите счёт" title="Счёт для миграции" triggerClassName="w-full h-10">
              {availableAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name} · {account.currency || 'RUB'}</SelectItem>)}
            </MobileSelect>
            <Button className="w-full" disabled={!migrationAccountId || migrationMutation.isPending} onClick={() => migrationMutation.mutate()}>
              {migrationMutation.isPending ? 'Переносим…' : 'Перенести расходы'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}