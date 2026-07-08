import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoalService } from '@/services';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Plus, Target, Edit2, Trash2, Check, Calendar, TrendingUp, Coins, MinusCircle,
  Users, Zap
} from 'lucide-react';
import CalendarExport from '@/components/CalendarExport';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import GoalCard from '@/components/goals/GoalCard';
import AutoDistributeModal from '@/components/goals/AutoDistributeModal';
import SubgoalsManager from '@/components/goals/SubgoalsManager';
import PullToRefresh from '@/components/PullToRefresh';
import MobileSelect from '@/components/mobile/MobileSelect';
import MobilePopover from '@/components/mobile/MobilePopover';

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
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(null);
  const [showSpendModal, setShowSpendModal] = useState(null);
  const [showAutoDistribute, setShowAutoDistribute] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [spendCategory, setSpendCategory] = useState('');
  const [spendDescription, setSpendDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [viewMode, setViewMode] = useState('personal');
  const [shareWithUsers, setShareWithUsers] = useState([]);

  const [formData, setFormData] = useState({
    title: '', type: 'savings', target_amount: '', current_amount: '0',
    deadline: null, priority: 'medium', is_family_goal: false, share_with: [], subgoals: []
  });

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const { data: family } = useQuery({
    queryKey: ['my-family', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const families = await base44.entities.Family.list();
      return families.find(f => f.owner_id === user?.id || f.members?.some(m => m.user_id === user?.id));
    },
    enabled: !!user,
    staleTime: 60000
  });

  const { data: myGoals = [] } = useQuery({
    queryKey: ['my-goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const goals = await base44.entities.Goal.list();
      return goals.filter(g => g.created_by === user?.email);
    },
    enabled: !!user,
    staleTime: 30000
  });

  const { data: sharedGoals = [] } = useQuery({
    queryKey: ['shared-goals', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const goals = await base44.entities.Goal.list();
      const familyId = family?.id;
      return goals.filter(g =>
        (g.is_family_goal && g.family_id && familyId && g.family_id === familyId) ||
        g.share_with?.includes(user?.id)
      );
    },
    enabled: !!user && !!family,
    staleTime: 30000
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Account.filter({ user_id: user.id });
    },
    enabled: !!user,
    staleTime: 30000
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'], queryFn: () => base44.entities.Category.filter({ type: 'expense' }),
    staleTime: 300000
  });

  const createMutation = useMutation({
    mutationFn: (data) => GoalService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-goals'] });
      queryClient.invalidateQueries({ queryKey: ['shared-goals'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, enrich }) => GoalService.update(id, data, { enrich: enrich !== false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-goals'] });
      queryClient.invalidateQueries({ queryKey: ['shared-goals'] });
      resetForm();
      setShowAddFundsModal(null);
      setAddFundsAmount('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => GoalService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-goals'] });
      queryClient.invalidateQueries({ queryKey: ['shared-goals'] });
      setDeleteId(null);
    }
  });

  const resetForm = () => {
    setFormData({ title: '', type: 'savings', target_amount: '', current_amount: '0', deadline: null, priority: 'medium', is_family_goal: false, share_with: [], subgoals: [] });
    setShowAddModal(false);
    setEditGoal(null);
    setShareWithUsers([]);
  };

  const handleEdit = (goal) => {
    setEditGoal(goal);
    setFormData({
      title: goal.title, type: goal.type, target_amount: goal.target_amount.toString(),
      current_amount: (goal.current_amount || 0).toString(), deadline: goal.deadline ? new Date(goal.deadline) : null,
      priority: goal.priority || 'medium', is_family_goal: goal.is_family_goal || false,
      share_with: goal.share_with || [], subgoals: goal.subgoals || []
    });
    setShareWithUsers(goal.share_with || []);
    setShowAddModal(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData, target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0,
      deadline: formData.deadline ? format(formData.deadline, 'yyyy-MM-dd') : null,
      status: 'active', share_with: shareWithUsers
    };
    if (editGoal) updateMutation.mutate({ id: editGoal.id, data });
    else createMutation.mutate(data);
  };

  const handleAddFunds = async () => {
    if (!showAddFundsModal || !addFundsAmount || !selectedAccount) return;
    const account = accounts.find(a => a.id === selectedAccount);
    await GoalService.addFunds(showAddFundsModal, account, addFundsAmount);
    queryClient.invalidateQueries({ queryKey: ['my-goals'] });
    queryClient.invalidateQueries({ queryKey: ['shared-goals'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setShowAddFundsModal(null);
    setAddFundsAmount(''); setSelectedAccount('');
  };

  const handleAutoDistribute = async (distribution, totalAmount) => {
    for (const [goalId, amount] of Object.entries(distribution)) {
      if (amount > 0) {
        const goal = (viewMode === 'personal' ? myGoals : sharedGoals).find(g => g.id === goalId);
        if (goal) {
          const newAmount = (goal.current_amount || 0) + amount;
          await GoalService.update(goalId, { current_amount: newAmount, status: newAmount >= goal.target_amount ? 'completed' : 'active' }, { enrich: false });
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['my-goals'] });
    queryClient.invalidateQueries({ queryKey: ['shared-goals'] });
    setShowAutoDistribute(false);
  };

  const handleSpendFromGoal = async () => {
    if (!showSpendModal || !spendAmount || !spendCategory) return;
    await GoalService.spend(showSpendModal, { amount: spendAmount, category: spendCategory, description: spendDescription });
    queryClient.invalidateQueries({ queryKey: ['my-goals'] });
    queryClient.invalidateQueries({ queryKey: ['shared-goals'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setShowSpendModal(null); setSpendAmount(''); setSpendCategory(''); setSpendDescription('');
  };

  useEffect(() => {
    const checkNotifications = () => {
      const allGoals = viewMode === 'personal' ? myGoals : sharedGoals;
      allGoals.forEach(goal => {
        if (goal.status === 'active' && goal.deadline && !goal.notification_sent) {
          const daysLeft = differenceInDays(new Date(goal.deadline), new Date());
          if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
            base44.integrations.Core.SendEmail({
              to: user?.email, subject: `Приближается дедлайн цели: ${goal.title}`,
              body: `У вас осталось ${daysLeft} дней до дедлайна цели "${goal.title}". Текущий прогресс: ${((goal.current_amount / goal.target_amount) * 100).toFixed(0)}%`
            });
            updateMutation.mutate({ id: goal.id, data: { notification_sent: true }, enrich: false });
          }
        }
      });
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 86400000);
    return () => clearInterval(interval);
  }, [myGoals, sharedGoals, user?.email, viewMode]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
  };

  const displayGoals = viewMode === 'personal' ? myGoals : sharedGoals;
  const activeGoals = displayGoals.filter(g => g.status === 'active');
  const completedGoals = displayGoals.filter(g => g.status === 'completed');
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-goals'] }),
      queryClient.invalidateQueries({ queryKey: ['shared-goals'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-32 sm:pb-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Цели</h1>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block"><CalendarExport budgets={[]} goals={myGoals} accounts={accounts} /></span>
              <Button onClick={() => setShowAddModal(true)} size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl">
                <Plus className="w-4 h-4" /><span className="ml-1">Создать</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {family && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6 flex gap-2">
            <button onClick={() => setViewMode('personal')} className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${viewMode === 'personal' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Мои цели</button>
            <button onClick={() => setViewMode('family')} className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'family' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Users className="w-4 h-4" />Семейные</button>
          </motion.div>
        )}

        {viewMode === 'personal' && activeGoals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
            <Button onClick={() => setShowAutoDistribute(true)} variant="outline" className="w-full rounded-xl border-violet-200 text-violet-700 dark:text-violet-400">
              <Zap className="w-4 h-4 mr-2" />Распределить {formatCurrency(totalBalance)} между целями
            </Button>
          </motion.div>
        )}

        {activeGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Активные цели</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeGoals.map((goal, index) => (
                <GoalCard key={goal.id} goal={goal} index={index}
                  isEditable={viewMode === 'personal' || goal.created_by === user?.email}
                  onEdit={handleEdit} onDelete={(id) => setDeleteId(id)}
                  onAddFunds={setShowAddFundsModal} onSpend={setShowSpendModal}
                  formatCurrency={formatCurrency} />
              ))}
            </div>
          </div>
        )}

        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Достигнутые цели 🎉</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {completedGoals.map((goal) => (
                <Card key={goal.id} className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl">✅</div>
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">{goal.title}</h3>
                        <p className="text-sm text-emerald-600">{formatCurrency(goal.target_amount)} накоплено</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {displayGoals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{viewMode === 'personal' ? 'Нет целей' : 'Нет общих целей'}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{viewMode === 'personal' ? 'Создайте первую финансовую цель' : 'Семейные члены пока не создали общих целей'}</p>
            {viewMode === 'personal' && (
              <Button onClick={() => setShowAddModal(true)} className="rounded-xl"><Plus className="w-4 h-4 mr-2" />Создать цель</Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={() => resetForm()}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editGoal ? 'Редактировать цель' : 'Новая цель'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Например: Отпуск на море" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Тип цели</Label>
              <MobileSelect value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })} placeholder="Тип цели" title="Тип цели" triggerClassName="rounded-xl mt-1 w-full">
                {GOAL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                ))}
              </MobileSelect>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Целевая сумма</Label>
                <div className="relative mt-1">
                  <Input type="number" value={formData.target_amount} onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })} placeholder="0" className="rounded-xl pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
                </div>
              </div>
              <div>
                <Label>Приоритет</Label>
                <MobileSelect value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })} placeholder="Приоритет" title="Приоритет" triggerClassName="rounded-xl mt-1 w-full">
                  <option value="low">🟢 Низкий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="high">🔴 Высокий</option>
                </MobileSelect>
              </div>
            </div>
            <div>
              <Label>Уже накоплено</Label>
              <div className="relative mt-1">
                <Input type="number" value={formData.current_amount} onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })} placeholder="0" className="rounded-xl pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>Дедлайн</Label>
              <MobilePopover title="Выберите дату"
                trigger={
                  <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl mt-1">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, 'dd.MM.yyyy') : 'Выберите дату'}
                  </Button>
                }>
                <CalendarComponent mode="single" selected={formData.deadline} onSelect={(d) => setFormData({ ...formData, deadline: d })} />
              </MobilePopover>
            </div>

            {family && (
              <>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_family_goal} onChange={(e) => setFormData({ ...formData, is_family_goal: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Это семейная цель</span>
                  </label>
                </div>
                {formData.is_family_goal && (
                  <div>
                    <Label>Поделиться с членами семьи</Label>
                    <div className="mt-2 space-y-2">
                      {family.members?.filter(m => m.user_id !== user?.id).map(member => (
                        <label key={member.user_id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={shareWithUsers.includes(member.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) setShareWithUsers([...shareWithUsers, member.user_id]);
                              else setShareWithUsers(shareWithUsers.filter(id => id !== member.user_id));
                            }} className="rounded" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{member.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <SubgoalsManager subgoals={formData.subgoals} onChange={(subgoals) => setFormData({ ...formData, subgoals })} formatCurrency={formatCurrency} />

            <Button onClick={handleSubmit} disabled={!formData.title || !formData.target_amount || createMutation.isPending || updateMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600">
              <Check className="w-4 h-4 mr-2" />{editGoal ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AutoDistributeModal open={showAutoDistribute} onOpenChange={setShowAutoDistribute} goals={activeGoals}
        availableAmount={totalBalance} onDistribute={handleAutoDistribute} formatCurrency={formatCurrency} />

      <Dialog open={!!showAddFundsModal} onOpenChange={() => { setShowAddFundsModal(null); setAddFundsAmount(''); setSelectedAccount(''); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Пополнить цель</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-500">{showAddFundsModal?.title}</p>
            <div>
              <Label>Счет списания</Label>
              <MobileSelect value={selectedAccount} onValueChange={setSelectedAccount} placeholder="Выберите счет" title="Счет списания" triggerClassName="rounded-xl mt-1 w-full">
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name} ({formatCurrency(account.balance)})</option>
                ))}
              </MobileSelect>
            </div>
            <div>
              <Label>Сумма</Label>
              <div className="relative mt-1">
                <Input type="number" value={addFundsAmount} onChange={(e) => setAddFundsAmount(e.target.value)} placeholder="0" className="rounded-xl pr-8 text-xl font-semibold h-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <Button onClick={handleAddFunds} disabled={!addFundsAmount || !selectedAccount || updateMutation.isPending} className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600">
              <Coins className="w-4 h-4 mr-2" />Пополнить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showSpendModal} onOpenChange={() => { setShowSpendModal(null); setSpendAmount(''); setSpendCategory(''); setSpendDescription(''); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Потратить из цели</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-500">{showSpendModal?.title}</p>
            <p className="text-sm text-slate-600">Доступно: {formatCurrency(showSpendModal?.current_amount || 0)}</p>
            <div>
              <Label>Сумма</Label>
              <div className="relative mt-1">
                <Input type="number" value={spendAmount} onChange={(e) => setSpendAmount(e.target.value)} placeholder="0" max={showSpendModal?.current_amount || 0} className="rounded-xl pr-8 text-xl font-semibold h-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
              </div>
            </div>
            <div>
              <Label>Категория расхода</Label>
              <MobileSelect value={spendCategory} onValueChange={setSpendCategory} placeholder="Выберите категорию" title="Категория" triggerClassName="rounded-xl mt-1 w-full">
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </MobileSelect>
            </div>
            <div>
              <Label>Комментарий</Label>
              <Input value={spendDescription} onChange={(e) => setSpendDescription(e.target.value)} placeholder="Описание расхода" className="rounded-xl mt-1" />
            </div>
            <Button onClick={handleSpendFromGoal}
              disabled={!spendAmount || !spendCategory || parseFloat(spendAmount) > (showSpendModal?.current_amount || 0) || updateMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600">
              <MinusCircle className="w-4 h-4 mr-2" />Потратить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
            <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
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