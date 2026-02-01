import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Users, Wallet, Target, TrendingUp, ArrowUpRight, ArrowDownRight,
  ChevronRight, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚',
  'Зарплата': '💰', 'Фриланс': '💻', 'Инвестиции': '📈', 'Подарки': '🎁', 'Другое': '📦'
};

const GOAL_TYPES = {
  'savings': { label: 'Накопления', icon: '💰', color: '#10B981' },
  'debt_payoff': { label: 'Погашение долга', icon: '📉', color: '#EF4444' },
  'investment': { label: 'Инвестиции', icon: '📈', color: '#8B5CF6' },
  'purchase': { label: 'Покупка', icon: '🛍️', color: '#F59E0B' },
  'emergency_fund': { label: 'Подушка безопасности', icon: '🛡️', color: '#3B82F6' },
  'other': { label: 'Другое', icon: '🎯', color: '#64748B' },
};

export default function FamilyFinances() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  React.useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const { data: family } = useQuery({
    queryKey: ['my-family', currentUser?.id],
    queryFn: async () => {
      const families = await base44.entities.Family.list();
      const myFamily = families.find(f => 
        f.owner_id === currentUser?.id || 
        f.members?.some(m => m.user_id === currentUser?.id)
      );
      return myFamily;
    },
    enabled: !!currentUser
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['family-transactions'],
    queryFn: async () => {
      const txs = await base44.entities.Transaction.list('-date', 500);
      // Filter only transactions from family members
      return txs.filter(tx => 
        family.members.some(m => m.user_id === tx.created_by || tx.created_by.includes(m.user_id))
      );
    },
    enabled: !!family
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['family-accounts'],
    queryFn: async () => {
      const accounts = await base44.entities.Account.list();
      // Filter only accounts from family members
      return accounts.filter(acc => 
        family.members.some(m => m.user_id === acc.created_by || acc.created_by.includes(m.user_id))
      );
    },
    enabled: !!family
  });

  const { data: allGoals = [] } = useQuery({
    queryKey: ['family-goals'],
    queryFn: async () => {
      const goals = await base44.entities.Goal.list();
      // Filter only goals from family members
      return goals.filter(g => 
        family.members.some(m => m.user_id === g.created_by || g.created_by.includes(m.user_id))
      );
    },
    enabled: !!family
  });

  const { data: allInvestments = [] } = useQuery({
    queryKey: ['family-investments'],
    queryFn: async () => {
      const investments = await base44.entities.Investment.list();
      // Filter only investments from family members
      return investments.filter(inv => 
        family.members.some(m => m.user_id === inv.created_by || inv.created_by.includes(m.user_id))
      );
    },
    enabled: !!family
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMemberInfo = (createdBy) => {
    if (!family?.members) return { name: 'Неизвестно', avatar_color: '#64748B', user_id: null };
    
    // Try to find by exact user_id match
    let member = family.members.find(m => m.user_id === createdBy);
    
    // If not found, try to find by email in user_id
    if (!member) {
      member = family.members.find(m => createdBy.includes(m.user_id));
    }
    
    return member || { name: 'Неизвестно', avatar_color: '#64748B', user_id: null };
  };

  // Calculate member stats
  const getMemberStats = (memberId) => {
    const memberAccounts = allAccounts.filter(a => a.created_by === memberId);
    const memberTransactions = allTransactions.filter(t => t.created_by === memberId);
    const memberGoals = allGoals.filter(g => g.created_by === memberId);
    const memberInvestments = allInvestments.filter(i => i.created_by === memberId);

    const balance = memberAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const income = memberTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = memberTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const goalsTotal = memberGoals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
    const investmentsTotal = memberInvestments.reduce((sum, inv) => 
      sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0
    );

    return {
      balance,
      income,
      expense,
      goalsTotal,
      investmentsTotal,
      accounts: memberAccounts,
      transactions: memberTransactions,
      goals: memberGoals,
      investments: memberInvestments
    };
  };

  // Total stats
  const totalBalance = allAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalGoals = allGoals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const totalInvestments = allInvestments.reduce((sum, inv) => 
    sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0
  );

  if (!family && currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Вы не состоите в семье
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Создайте или присоединитесь к семье во вкладке "Семья"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Финансы семьи
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {family?.name}
          </p>
        </motion.div>

        {/* Total Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            <CardContent className="p-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl" />
              <div className="relative">
                <p className="text-slate-400 text-sm mb-1">Общий баланс семьи</p>
                <p className="text-4xl font-bold text-white mb-4">{formatCurrency(totalBalance)}</p>
                
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-slate-400">Доходы</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      +{formatCurrency(totalIncome)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-slate-400">Расходы</p>
                    <p className="text-lg font-semibold text-rose-400">
                      -{formatCurrency(totalExpense)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-slate-400">Цели</p>
                    <p className="text-lg font-semibold text-indigo-400">
                      {formatCurrency(totalGoals)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-xs text-slate-400">Инвестиции</p>
                    <p className="text-lg font-semibold text-violet-400">
                      {formatCurrency(totalInvestments)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Members */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Финансы участников
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {family?.members?.map((member) => {
              const stats = getMemberStats(member.user_id);
              return (
                <Card 
                  key={member.user_id}
                  className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedMember(member)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                        style={{ backgroundColor: member.avatar_color }}
                      >
                        {member.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {member.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {member.role === 'admin' ? 'Администратор' : 'Участник'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Баланс:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(stats.balance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Доходы:</span>
                        <span className="font-semibold text-emerald-600">
                          +{formatCurrency(stats.income)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Расходы:</span>
                        <span className="font-semibold text-rose-600">
                          -{formatCurrency(stats.expense)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Последние операции семьи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allTransactions.slice(0, 15).map((transaction) => {
              const member = getMemberInfo(transaction.created_by);
              return (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      transaction.type === 'income' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                        : 'bg-rose-100 dark:bg-rose-900/30'
                    }`}>
                      {CATEGORY_ICONS[transaction.category] || '📦'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {transaction.category}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: member.avatar_color }}
                        />
                        <span>{member.name}</span>
                        <span>•</span>
                        <span>{format(new Date(transaction.date), 'd MMM', { locale: ru })}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`font-semibold ${
                    transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="rounded-2xl max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: selectedMember?.avatar_color }}
              >
                {selectedMember?.name?.[0] || '?'}
              </div>
              <span>Финансы: {selectedMember?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedMember && (() => {
            const stats = getMemberStats(selectedMember.user_id);
            return (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-500 mb-1">Баланс счетов</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.balance)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-500 mb-1">Накоплено на цели</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {formatCurrency(stats.goalsTotal)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-500 mb-1">Инвестиции</p>
                      <p className="text-2xl font-bold text-violet-600">
                        {formatCurrency(stats.investmentsTotal)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-500 mb-1">Чистый доход</p>
                      <p className={`text-2xl font-bold ${
                        stats.income - stats.expense >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {formatCurrency(stats.income - stats.expense)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="accounts" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="accounts">Счета</TabsTrigger>
                    <TabsTrigger value="goals">Цели</TabsTrigger>
                    <TabsTrigger value="investments">Инвестиции</TabsTrigger>
                    <TabsTrigger value="transactions">Операции</TabsTrigger>
                  </TabsList>

                  <TabsContent value="accounts" className="space-y-3">
                    {stats.accounts.map((account) => (
                      <Card key={account.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                          <span className="font-medium">{account.name}</span>
                          <span className="font-semibold text-lg">{formatCurrency(account.balance)}</span>
                        </CardContent>
                      </Card>
                    ))}
                    {stats.accounts.length === 0 && (
                      <p className="text-center text-slate-500 py-4">Нет счетов</p>
                    )}
                  </TabsContent>

                  <TabsContent value="goals" className="space-y-3">
                    {stats.goals.map((goal) => {
                      const typeInfo = GOAL_TYPES[goal.type] || GOAL_TYPES.other;
                      const progress = goal.target_amount > 0 
                        ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                        : 0;
                      return (
                        <Card key={goal.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{typeInfo.icon}</span>
                              <span className="font-medium">{goal.title}</span>
                            </div>
                            <Progress value={progress} className="h-2 mb-2" />
                            <div className="flex justify-between text-sm text-slate-500">
                              <span>{formatCurrency(goal.current_amount || 0)}</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {stats.goals.length === 0 && (
                      <p className="text-center text-slate-500 py-4">Нет целей</p>
                    )}
                  </TabsContent>

                  <TabsContent value="investments" className="space-y-3">
                    {stats.investments.map((investment) => {
                      const value = investment.quantity * (investment.current_price || investment.purchase_price);
                      const cost = investment.quantity * investment.purchase_price;
                      const profit = value - cost;
                      return (
                        <Card key={investment.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{investment.name}</p>
                              <p className={`text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                              </p>
                            </div>
                            <span className="font-semibold text-lg">{formatCurrency(value)}</span>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {stats.investments.length === 0 && (
                      <p className="text-center text-slate-500 py-4">Нет инвестиций</p>
                    )}
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-2">
                    {stats.transactions.slice(0, 10).map((transaction) => (
                      <div 
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                            transaction.type === 'income' 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                              : 'bg-rose-100 dark:bg-rose-900/30'
                          }`}>
                            {CATEGORY_ICONS[transaction.category] || '📦'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{transaction.category}</p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(transaction.date), 'd MMM', { locale: ru })}
                            </p>
                          </div>
                        </div>
                        <p className={`font-semibold ${
                          transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}