import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Users, Wallet, Target, TrendingUp, ArrowUpRight, ArrowDownRight,
  PieChart, CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

  const { data: transactions = [] } = useQuery({
    queryKey: ['family-transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100),
    enabled: !!family
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['family-accounts'],
    queryFn: () => base44.entities.Account.list(),
    enabled: !!family
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['family-goals'],
    queryFn: () => base44.entities.Goal.list(),
    enabled: !!family
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['family-investments'],
    queryFn: () => base44.entities.Investment.list(),
    enabled: !!family
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['family-budgets'],
    queryFn: () => base44.entities.Budget.list(),
    enabled: !!family
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMemberInfo = (email) => {
    const member = family?.members?.find(m => m.user_id === email || email.includes(m.user_id));
    return member || { name: 'Неизвестно', avatar_color: '#64748B' };
  };

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalGoals = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const totalInvestments = investments.reduce((sum, inv) => 
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
            Семейные финансы
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {family?.name}
          </p>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                  <Wallet className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-sm text-slate-500">Счета</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(totalBalance)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-slate-500">Доходы</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                +{formatCurrency(totalIncome)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                  <ArrowDownRight className="w-5 h-5 text-rose-600" />
                </div>
                <span className="text-sm text-slate-500">Расходы</span>
              </div>
              <p className="text-2xl font-bold text-rose-600">
                -{formatCurrency(totalExpense)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-sm text-slate-500">Цели</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(totalGoals)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 dark:bg-slate-800/80">
            <TabsTrigger value="transactions">Операции</TabsTrigger>
            <TabsTrigger value="accounts">Счета</TabsTrigger>
            <TabsTrigger value="goals">Цели</TabsTrigger>
            <TabsTrigger value="investments">Инвестиции</TabsTrigger>
          </TabsList>

          {/* Transactions */}
          <TabsContent value="transactions">
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Последние операции</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {transactions.slice(0, 20).map((transaction) => {
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
                {transactions.length === 0 && (
                  <p className="text-center text-slate-500 py-8">Нет операций</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts */}
          <TabsContent value="accounts">
            <div className="grid sm:grid-cols-2 gap-4">
              {accounts.map((account) => {
                const member = getMemberInfo(account.created_by);
                return (
                  <Card key={account.id} className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {account.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: member.avatar_color }}
                          />
                          <span>{member.name}</span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(account.balance || 0)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
              {accounts.length === 0 && (
                <p className="text-center text-slate-500 py-8 col-span-2">Нет счетов</p>
              )}
            </div>
          </TabsContent>

          {/* Goals */}
          <TabsContent value="goals">
            <div className="grid sm:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const member = getMemberInfo(goal.created_by);
                const typeInfo = GOAL_TYPES[goal.type] || GOAL_TYPES.other;
                const progress = goal.target_amount > 0 
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0;

                return (
                  <Card key={goal.id} className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {goal.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: member.avatar_color }}
                          />
                          <span>{member.name}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">
                            {formatCurrency(goal.current_amount || 0)}
                          </span>
                          <span className="font-semibold" style={{ color: typeInfo.color }}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${progress}%`,
                              backgroundColor: typeInfo.color
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {goals.length === 0 && (
                <p className="text-center text-slate-500 py-8 col-span-2">Нет целей</p>
              )}
            </div>
          </TabsContent>

          {/* Investments */}
          <TabsContent value="investments">
            <div className="space-y-3">
              {investments.map((investment) => {
                const member = getMemberInfo(investment.created_by);
                const currentPrice = investment.current_price || investment.purchase_price;
                const value = investment.quantity * currentPrice;
                const cost = investment.quantity * investment.purchase_price;
                const profit = value - cost;

                return (
                  <Card key={investment.id} className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">📈</div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {investment.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: member.avatar_color }}
                              />
                              <span>{member.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-slate-900 dark:text-white">
                            {formatCurrency(value)}
                          </p>
                          <p className={`text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {investments.length === 0 && (
                <p className="text-center text-slate-500 py-8">Нет инвестиций</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}