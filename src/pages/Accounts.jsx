import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addFamilyId } from '@/components/FamilyDataWrapper';
import { motion } from 'framer-motion';
import {
  Plus, Wallet, CreditCard, Building2, PiggyBank, 
  Edit2, Trash2, Check, ArrowUpRight, ArrowDownRight, User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Наличные', icon: '💵', color: '#10B981' },
  { value: 'card', label: 'Карта', icon: '💳', color: '#8B5CF6' },
  { value: 'bank_account', label: 'Банковский счёт', icon: '🏦', color: '#3B82F6' },
  { value: 'savings', label: 'Накопительный', icon: '🐷', color: '#EC4899' },
  { value: 'credit', label: 'Кредитная карта', icon: '💎', color: '#EF4444' },
];

const ACCOUNT_COLORS = [
  '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
  '#6366F1', '#EF4444', '#14B8A6', '#84CC16', '#A855F7'
];

export default function Accounts() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'card',
    balance: '',
    currency: 'RUB',
    color: ACCOUNT_COLORS[0]
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const { data: family } = useQuery({
    queryKey: ['my-family', currentUser?.id],
    queryFn: async () => {
      const families = await base44.entities.Family.list();
      return families.find(f => 
        f.owner_id === currentUser?.id || 
        f.members?.some(m => m.user_id === currentUser?.id)
      );
    },
    enabled: !!currentUser
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Account.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Account.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDeleteId(null);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'card',
      balance: '',
      currency: 'RUB',
      color: ACCOUNT_COLORS[0]
    });
    setShowAddModal(false);
    setEditAccount(null);
  };

  const handleEdit = (account) => {
    setEditAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance?.toString() || '0',
      currency: account.currency || 'RUB',
      color: account.color || ACCOUNT_COLORS[0]
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    const data = await addFamilyId({
      ...formData,
      balance: parseFloat(formData.balance) || 0,
      is_active: true
    });

    if (editAccount) {
      updateMutation.mutate({ id: editAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate account stats
  const getAccountStats = (accountId) => {
    const accountTransactions = transactions.filter(t => t.account_id === accountId);
    const income = accountTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = accountTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expenses };
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const getOwnerName = (createdBy) => {
    if (createdBy === currentUser?.email) return 'Мой счёт';
    if (!family?.members) return null;
    const member = family.members.find(m => m.user_id === createdBy || createdBy.includes(m.user_id));
    return member ? member.name : null;
  };

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
            Счета
          </h1>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить
          </Button>
        </motion.div>

        {/* Total Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            <CardContent className="p-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl" />
              <div className="relative">
                <p className="text-slate-400 text-sm mb-1">Общий баланс</p>
                <p className="text-4xl font-bold text-white">{formatCurrency(totalBalance)}</p>
                <p className="text-slate-400 text-sm mt-2">{accounts.length} счетов</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Accounts Grid */}
        {accounts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((account, index) => {
              const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.type) || ACCOUNT_TYPES[1];
              const stats = getAccountStats(account.id);

              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    <div 
                      className="h-1"
                      style={{ backgroundColor: account.color || typeInfo.color }}
                    />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: `${account.color || typeInfo.color}20` }}
                          >
                            {typeInfo.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {account.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {typeInfo.label}
                              </p>
                              {getOwnerName(account.created_by) && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {getOwnerName(account.created_by)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {account.created_by === currentUser?.email && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(account);
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
                                setDeleteId(account.id);
                              }}
                              className="h-8 w-8 text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <p className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        {formatCurrency(account.balance || 0)}
                      </p>

                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1 text-emerald-600">
                          <ArrowUpRight className="w-4 h-4" />
                          <span>{formatCurrency(stats.income)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-rose-600">
                          <ArrowDownRight className="w-4 h-4" />
                          <span>{formatCurrency(stats.expenses)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Нет счетов
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Добавьте первый счёт для учёта финансов
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить счёт
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={() => resetForm()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editAccount ? 'Редактировать счёт' : 'Новый счёт'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Основная карта"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Тип счёта</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Баланс</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  placeholder="0"
                  className="rounded-xl pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>Цвет</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {editAccount ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить счёт?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Связанные транзакции не будут удалены.
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