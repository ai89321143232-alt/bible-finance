import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addFamilyId } from '@/components/FamilyDataWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Plus, Target, Edit2, Trash2, Check, Calendar, TrendingUp, Coins, MinusCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const GOAL_TYPES = [
  { value: 'savings', label: 'Накопления', icon: '💰', color: '#10B981' },
  { value: 'debt_payoff', label: 'Погашение долга', icon: '📉', color: '#EF4444' },
  { value: 'investment', label: 'Инвестиции', icon: '📈', color: '#8B5CF6' },
  { value: 'purchase', label: 'Покупка', icon: '🛍️', color: '#F59E0B' },
  { value: 'emergency_fund', label: 'Подушка безопасности', icon: '🛡️', color: '#3B82F6' },
  { value: 'other', label: 'Другое', icon: '🎯', color: '#64748B' },
];

export default function Goals() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(null);
  const [showSpendModal, setShowSpendModal] = useState(null);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCategory, setSpendCategory] = useState('');
  const [spendDescription, setSpendDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    type: 'savings',
    target_amount: '',
    current_amount: '0',
    deadline: null,
    priority: 'medium'
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.filter({ type: 'expense' })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      resetForm();
      setShowAddFundsModal(null);
      setAddFundsAmount('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setDeleteId(null);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'savings',
      target_amount: '',
      current_amount: '0',
      deadline: null,
      priority: 'medium'
    });
    setShowAddModal(false);
    setEditGoal(null);
  };

  const handleEdit = (goal) => {
    setEditGoal(goal);
    setFormData({
      title: goal.title,
      type: goal.type,
      target_amount: goal.target_amount.toString(),
      current_amount: (goal.current_amount || 0).toString(),
      deadline: goal.deadline ? new Date(goal.deadline) : null,
      priority: goal.priority || 'medium'
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    const data = await addFamilyId({
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0,
      deadline: formData.deadline ? format(formData.deadline, 'yyyy-MM-dd') : null,
      status: 'active'
    });

    if (editGoal) {
      updateMutation.mutate({ id: editGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddFunds = async () => {
    if (!showAddFundsModal || !addFundsAmount || !selectedAccount) return;
    
    const amount = parseFloat(addFundsAmount);
    const newAmount = (showAddFundsModal.current_amount || 0) + amount;
    const isCompleted = newAmount >= showAddFundsModal.target_amount;
    
    // Update account balance
    const account = accounts.find(a => a.id === selectedAccount);
    if (account) {
      await base44.entities.Account.update(selectedAccount, {
        balance: account.balance - amount
      });
    }
    
    // Update goal
    updateMutation.mutate({
      id: showAddFundsModal.id,
      data: {
        current_amount: newAmount,
        status: isCompleted ? 'completed' : 'active'
      }
    });
    
    // Create transfer transaction (not expense!)
    await base44.entities.Transaction.create({
      type: 'transfer',
      amount: amount,
      category: 'Перенос на цель',
      description: `${account?.name} → Цель: ${showAddFundsModal.title}`,
      date: format(new Date(), 'yyyy-MM-dd'),
      account_id: selectedAccount
    });
    
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleSpendFromGoal = async () => {
    if (!showSpendModal || !spendAmount || !spendCategory) return;
    
    const amount = parseFloat(spendAmount);
    const newAmount = Math.max((showSpendModal.current_amount || 0) - amount, 0);
    
    // Update goal
    updateMutation.mutate({
      id: showSpendModal.id,
      data: {
        current_amount: newAmount
      }
    });
    
    // Create expense transaction
    await base44.entities.Transaction.create({
      type: 'expense',
      amount: amount,
      category: spendCategory,
      description: `${spendDescription || ''} (из цели: ${showSpendModal.title})`,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setShowSpendModal(null);
    setSpendAmount('');
    setSpendCategory('');
    setSpendDescription('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

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
            Цели
          </h1>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Создать
          </Button>
        </motion.div>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Активные цели
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeGoals.map((goal, index) => {
                const typeInfo = GOAL_TYPES.find(t => t.value === goal.type) || GOAL_TYPES[5];
                const progress = goal.target_amount > 0 
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0;
                const daysLeft = goal.deadline 
                  ? differenceInDays(new Date(goal.deadline), new Date())
                  : null;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-all overflow-hidden group cursor-pointer"
                      onClick={() => handleEdit(goal)}
                    >
                      <div 
                        className="h-1"
                        style={{ 
                          background: `linear-gradient(to right, ${typeInfo.color} ${progress}%, transparent ${progress}%)`
                        }}
                      />
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                              style={{ backgroundColor: `${typeInfo.color}20` }}
                            >
                              {typeInfo.icon}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {goal.title}
                              </h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {typeInfo.label}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(goal);
                              }}
                              className="h-8 w-8"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(goal.id);
                              }}
                              className="h-8 w-8 text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(goal.current_amount || 0)}
                              </p>
                              <p className="text-sm text-slate-500">
                                из {formatCurrency(goal.target_amount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold" style={{ color: typeInfo.color }}>
                                {progress.toFixed(0)}%
                              </p>
                              {daysLeft !== null && daysLeft > 0 && (
                                <p className="text-sm text-slate-500">
                                  {daysLeft} дн. осталось
                                </p>
                              )}
                            </div>
                          </div>

                          <Progress 
                            value={progress} 
                            className="h-2"
                            style={{ '--progress-color': typeInfo.color }}
                          />

                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAddFundsModal(goal);
                              }}
                              className="rounded-xl"
                            >
                              <Coins className="w-4 h-4 mr-2" />
                              Пополнить
                            </Button>
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSpendModal(goal);
                              }}
                              className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                              disabled={(goal.current_amount || 0) === 0}
                            >
                              <MinusCircle className="w-4 h-4 mr-2" />
                              Потратить
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Достигнутые цели 🎉
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {completedGoals.map((goal) => {
                const typeInfo = GOAL_TYPES.find(t => t.value === goal.type) || GOAL_TYPES[5];
                
                return (
                  <Card key={goal.id} className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl">
                          ✅
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {goal.title}
                          </h3>
                          <p className="text-sm text-emerald-600">
                            {formatCurrency(goal.target_amount)} накоплено
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Нет целей
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Создайте первую финансовую цель
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать цель
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={() => resetForm()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editGoal ? 'Редактировать цель' : 'Новая цель'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Отпуск на море"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Тип цели</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Целевая сумма</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="0"
                  className="rounded-xl pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>Уже накоплено</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  placeholder="0"
                  className="rounded-xl pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>Дедлайн</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal rounded-xl mt-1"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.deadline 
                      ? format(formData.deadline, 'dd.MM.yyyy')
                      : 'Выберите дату'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(d) => setFormData({ ...formData, deadline: d })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title || !formData.target_amount}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {editGoal ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Funds Modal */}
      <Dialog open={!!showAddFundsModal} onOpenChange={() => { 
        setShowAddFundsModal(null); 
        setAddFundsAmount(''); 
        setSelectedAccount('');
      }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Пополнить цель</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-500">
              {showAddFundsModal?.title}
            </p>
            <div>
              <Label>Счет списания</Label>
              <Select 
                value={selectedAccount} 
                onValueChange={setSelectedAccount}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Выберите счет" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.icon} {account.name} ({formatCurrency(account.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Сумма</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  placeholder="0"
                  className="rounded-xl pr-8 text-xl font-semibold h-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <Button
              onClick={handleAddFunds}
              disabled={!addFundsAmount || !selectedAccount}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600"
            >
              <Coins className="w-4 h-4 mr-2" />
              Пополнить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spend from Goal Modal */}
      <Dialog open={!!showSpendModal} onOpenChange={() => { 
        setShowSpendModal(null); 
        setSpendAmount(''); 
        setSpendCategory('');
        setSpendDescription('');
      }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Потратить из цели</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-500">
              {showSpendModal?.title}
            </p>
            <p className="text-sm text-slate-600">
              Доступно: {formatCurrency(showSpendModal?.current_amount || 0)}
            </p>
            <div>
              <Label>Сумма</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={spendAmount}
                  onChange={(e) => setSpendAmount(e.target.value)}
                  placeholder="0"
                  max={showSpendModal?.current_amount || 0}
                  className="rounded-xl pr-8 text-xl font-semibold h-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>Категория расхода</Label>
              <Select value={spendCategory} onValueChange={setSpendCategory}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon === 'Utensils' ? '🍔' : cat.icon === 'Car' ? '🚗' : cat.icon === 'Home' ? '🏠' : '📦'} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Комментарий</Label>
              <Input
                value={spendDescription}
                onChange={(e) => setSpendDescription(e.target.value)}
                placeholder="Описание расхода"
                className="rounded-xl mt-1"
              />
            </div>
            <Button
              onClick={handleSpendFromGoal}
              disabled={!spendAmount || !spendCategory || parseFloat(spendAmount) > (showSpendModal?.current_amount || 0)}
              className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600"
            >
              <MinusCircle className="w-4 h-4 mr-2" />
              Потратить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить.
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