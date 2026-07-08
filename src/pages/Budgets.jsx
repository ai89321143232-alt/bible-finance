import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from '@/services';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Plus, Wallet, AlertCircle, Edit2, Trash2, X, Check, TrendingUp, Users
} from 'lucide-react';
import CalendarExport from '@/components/CalendarExport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import BudgetCard from '@/components/budgets/BudgetCard';
import { useActiveWorkspaceId, filterByWorkspace } from '@/components/workspace/WorkspaceContext';
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

const BUDGET_CATEGORIES = [
  { value: 'Еда', icon: '🍔', color: '#F59E0B' },
  { value: 'Транспорт', icon: '🚗', color: '#3B82F6' },
  { value: 'Жильё', icon: '🏠', color: '#8B5CF6' },
  { value: 'Развлечения', icon: '🎮', color: '#EC4899' },
  { value: 'Здоровье', icon: '💊', color: '#10B981' },
  { value: 'Одежда', icon: '👕', color: '#6366F1' },
  { value: 'Подписки', icon: '📱', color: '#EF4444' },
  { value: 'Образование', icon: '📚', color: '#14B8A6' },
  { value: 'Другое', icon: '📦', color: '#64748B' },
];

// ============================================================
// pages/Budgets.jsx — СТРАНИЦА БЮДЖЕТОВ
// ============================================================
// Маршрут: "/Budgets"
//
// ФУНКЦИИ:
//   - Личные бюджеты (created_by === user.email)
//   - Общие бюджеты (share_with содержит user.id или is_family_budget + family_id)
//   - Создание / редактирование / удаление бюджета
//   - Мульти-категориальные бюджеты (можно выбрать несколько категорий)
//   - Уведомление по email при достижении notify_at_percent (по умолчанию 80%)
//
// ДАННЫЕ:
//   ['my-budgets']     → бюджеты текущего пользователя
//   ['shared-budgets'] → бюджеты, которыми поделились с пользователем
//   ['transactions']   → для подсчёта getBudgetSpent()
//
// ПОДСЧЁТ РАСХОДОВ getBudgetSpent(budget):
//   Суммирует transactions с type='expense', matching category и date >= начало месяца
//   ⚠️ Всегда считает за ТЕКУЩИЙ месяц, не за период бюджета
//
// СЕМЕЙНЫЙ БЮДЖЕТ:
//   Флаг is_family_budget + выбор участников (share_with = [user_id, ...])
//   Участники видят бюджет, но редактировать может только создатель
//
// УВЕДОМЛЕНИЯ (работают на клиенте, проверяются при каждом рендере):
//   SendEmail → user.email при percent >= notify_at_percent
//   notification_sent = true после отправки (сбрасывается вручную или в новом периоде)
// ============================================================
export default function Budgets() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('personal');
  const [shareWithUsers, setShareWithUsers] = useState([]);
  const activeWorkspaceId = useActiveWorkspaceId();

  const [formData, setFormData] = useState({
    name: '',
    categories: [],
    limit_amount: '',
    period: 'monthly',
    notify_at_percent: 80,
    is_family_budget: false,
    share_with: []
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const { data: family } = useQuery({
    queryKey: ['my-family', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const families = await base44.entities.Family.list();
      return families.find(f => 
        f.owner_id === user?.id || 
        f.members?.some(m => m.user_id === user?.id)
      );
    },
    enabled: !!user,
    staleTime: 60000
  });

  const { data: myBudgets = [] } = useQuery({
    queryKey: ['my-budgets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Синхронно с дашбордом: только активные бюджеты, созданные пользователем
      const budgets = await base44.entities.Budget.filter({ is_active: true });
      return budgets.filter(b => b.created_by_id === user?.id);
    },
    enabled: !!user,
    staleTime: 30000
  });

  const { data: sharedBudgets = [] } = useQuery({
    queryKey: ['shared-budgets', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const budgets = await base44.entities.Budget.filter({ is_active: true });
      const familyId = family?.id;
      // Show ALL family budgets (own + shared): is_family_budget with matching family_id, or explicitly shared with user
      return budgets.filter(b => 
        (b.is_family_budget && b.family_id && familyId && b.family_id === familyId) ||
        b.share_with?.includes(user?.id)
      );
    },
    enabled: !!user && !!family,
    staleTime: 30000
  });

  const { data: rawTransactions = [] } = useQuery({
    queryKey: ['transactions', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      // Синхронно с дашбордом: транзакции пользователя + семьи, а не только user_id
      const all = await base44.entities.Transaction.list('-date', 1000);
      return all.filter(t =>
        t.created_by_id === user.id ||
        (family?.id && t.family_id === family.id)
      );
    },
    enabled: !!user,
    staleTime: 30000
  });

  // Фильтрация по активному пространству — как на дашборде
  const transactions = filterByWorkspace(rawTransactions, activeWorkspaceId);

  const invalidateBudgets = () => {
    queryClient.invalidateQueries({ queryKey: ['my-budgets'] });
    queryClient.invalidateQueries({ queryKey: ['shared-budgets'] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => BudgetService.create(data),
    onSuccess: () => {
      invalidateBudgets();
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, enrich }) => BudgetService.update(id, data, { enrich: enrich !== false }),
    onSuccess: () => {
      invalidateBudgets();
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => BudgetService.remove(id),
    onSuccess: () => {
      invalidateBudgets();
      setDeleteId(null);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      categories: [],
      limit_amount: '',
      period: 'monthly',
      notify_at_percent: 80,
      is_family_budget: false,
      share_with: []
    });
    setShowAddModal(false);
    setEditBudget(null);
    setShareWithUsers([]);
  };

  const handleEdit = (budget) => {
    setEditBudget(budget);
    setFormData({
      name: budget.name,
      categories: budget.categories || (budget.category ? [budget.category] : []),
      limit_amount: budget.limit_amount.toString(),
      period: budget.period || 'monthly',
      notify_at_percent: budget.notify_at_percent || 80,
      is_family_budget: budget.is_family_budget || false,
      share_with: budget.share_with || []
    });
    setShareWithUsers(budget.share_with || []);
    setShowAddModal(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      limit_amount: parseFloat(formData.limit_amount),
      is_active: true,
      share_with: shareWithUsers
    };

    if (editBudget) {
      updateMutation.mutate({ id: editBudget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Check for budget notifications
  useEffect(() => {
    const checkNotifications = () => {
      const allBudgets = viewMode === 'personal' ? myBudgets : sharedBudgets;
      allBudgets.forEach(budget => {
        if (budget.is_active && !budget.notification_sent && viewMode === 'personal') {
          const spent = getBudgetSpent(budget);
          const percent = (spent / budget.limit_amount) * 100;
          
          if (percent >= (budget.notify_at_percent || 80)) {
            base44.integrations.Core.SendEmail({
              to: user?.email,
              subject: `Бюджет "${budget.name}" близко к лимиту`,
              body: `Вы потратили ${percent.toFixed(0)}% бюджета (${formatCurrency(spent)} из ${formatCurrency(budget.limit_amount)}) в категории "${(budget.categories || []).join(', ')}"${percent > 100 ? '. Бюджет превышен!' : '.'}`
            });
            
            updateMutation.mutate({
              id: budget.id,
              data: { notification_sent: true },
              enrich: false
            });
          }
        }
      });
    };
    
    if (user) checkNotifications();
    const interval = setInterval(checkNotifications, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, [myBudgets, viewMode, user]);

  // Calculate spent for each budget based on its period
  const getBudgetSpent = (budget) => {
    const now = new Date();
    let periodStart;

    switch (budget.period) {
      case 'weekly': {
        const day = now.getDay(); // 0=Sun
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        break;
      }
      case 'quarterly': {
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'yearly':
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      case 'monthly':
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const budgetCategories = budget.categories || (budget.category ? [budget.category] : []);
    
    return transactions
      .filter(t => 
        t.type === 'expense' && 
        (budgetCategories.length === 0 || budgetCategories.includes(t.category)) &&
        new Date(t.date) >= periodStart
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const displayBudgets = filterByWorkspace(
    viewMode === 'personal' ? myBudgets : sharedBudgets,
    activeWorkspaceId
  );
  const totalBudget = displayBudgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0);
  const totalSpent = displayBudgets.reduce((sum, b) => sum + getBudgetSpent(b), 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

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
            Бюджеты
          </h1>
          <div className="flex items-center gap-2">
            <CalendarExport budgets={myBudgets} goals={[]} accounts={[]} />
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Создать
            </Button>
          </div>
        </motion.div>

        {/* View Mode Selector */}
        {family && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 flex gap-2"
          >
            <button
              onClick={() => setViewMode('personal')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                viewMode === 'personal'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Мои бюджеты
            </button>
            <button
              onClick={() => setViewMode('family')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                viewMode === 'family'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Общие
            </button>
          </motion.div>
        )}

        {/* Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-600 to-indigo-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-violet-200 text-sm">Общий бюджет на месяц</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(totalBudget)}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
              <Progress 
                value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} 
                className="h-3 bg-white/20 [&>div]:bg-white"
              />
              <div className="flex justify-between mt-2 text-sm text-violet-200">
                <span>Потрачено: {formatCurrency(totalSpent)}</span>
                <span>Осталось: {formatCurrency(totalBudget - totalSpent)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Budgets Grid */}
        {displayBudgets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {displayBudgets.map((budget, index) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                index={index}
                spent={getBudgetSpent(budget)}
                isEditable={viewMode === 'personal' || budget.created_by_id === user?.id}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteId(id)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {viewMode === 'personal' ? 'Нет бюджетов' : 'Нет общих бюджетов'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {viewMode === 'personal' 
                ? 'Создайте первый бюджет для контроля расходов'
                : 'Члены семьи пока не поделились бюджетами'
              }
            </p>
            {viewMode === 'personal' && (
              <Button
                onClick={() => setShowAddModal(true)}
                className="rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать бюджет
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={() => resetForm()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editBudget ? 'Редактировать бюджет' : 'Новый бюджет'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Еда на месяц"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Категории (можно выбрать несколько)</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {BUDGET_CATEGORIES.map(cat => {
                  const isSelected = formData.categories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setFormData({ 
                            ...formData, 
                            categories: formData.categories.filter(c => c !== cat.value) 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            categories: [...formData.categories, cat.value] 
                          });
                        }
                      }}
                      className={`h-auto py-3 flex flex-col items-center gap-1 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl drop-shadow-sm">{cat.icon}</span>
                      <span className="text-xs font-medium">{cat.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Лимит</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={formData.limit_amount}
                  onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
                  placeholder="0"
                  className="rounded-xl pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>Период</Label>
              <Select 
                value={formData.period} 
                onValueChange={(v) => setFormData({ ...formData, period: v })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Неделя</SelectItem>
                  <SelectItem value="monthly">Месяц</SelectItem>
                  <SelectItem value="quarterly">Квартал</SelectItem>
                  <SelectItem value="yearly">Год</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {family && (
              <>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_family_budget}
                      onChange={(e) => setFormData({ ...formData, is_family_budget: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Это общий семейный бюджет
                    </span>
                  </label>
                </div>
                {formData.is_family_budget && (
                  <div>
                    <Label>Поделиться с членами семьи</Label>
                    <div className="mt-2 space-y-2">
                      {family.members
                        ?.filter(m => m.user_id !== user?.id)
                        .map(member => (
                          <label key={member.user_id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={shareWithUsers.includes(member.user_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setShareWithUsers([...shareWithUsers, member.user_id]);
                                } else {
                                  setShareWithUsers(shareWithUsers.filter(id => id !== member.user_id));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {member.name}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.limit_amount || createMutation.isPending || updateMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {editBudget ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить бюджет?</AlertDialogTitle>
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