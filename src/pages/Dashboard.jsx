import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, Plus, Wallet,
  PiggyBank, Target, ChevronRight, Sparkles, CreditCard, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QuickAddTransaction from '@/components/transactions/QuickAddTransaction';
import BalanceCard from '@/components/dashboard/BalanceCard';
import SpendingChart from '@/components/dashboard/SpendingChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import AllGoalsProgress from '@/components/dashboard/AllGoalsProgress';
import BudgetOverview from '@/components/dashboard/BudgetOverview';
import AIInsights from '@/components/dashboard/AIInsights';
import BibleVerse from '@/components/dashboard/BibleVerse';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState('expense');
  const [periodType, setPeriodType] = useState('month');
  const [currentPeriod, setCurrentPeriod] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [user, setUser] = useState(null);
  const [balanceMode, setBalanceMode] = useState('personal'); // 'personal' or 'family'
  const [visibleBlocks, setVisibleBlocks] = useState({
    balance: true,
    quickStats: true,
    spendingChart: true,
    transactions: true,
    budgets: true,
    goals: true
  });

  useEffect(() => {
    loadUser();
    migrateUserData();
  }, []);

  const migrateUserData = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.family_id) {
        const result = await base44.functions.invoke('migrateFamilyData', {});
        console.log('Migration result:', result.data);
        // Refresh data after migration
        setTimeout(() => {
          queryClient.invalidateQueries();
        }, 1000);
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  };

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    if (userData.data?.visible_dashboard_blocks) {
      setVisibleBlocks(userData.data.visible_dashboard_blocks);
    }
  };

  // Check if user is in a family
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
    enabled: !!user
  });

  const updatePeriod = (type) => {
    const now = new Date();
    let start, end;
    
    switch(type) {
      case 'week':
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        end = new Date(now.setDate(start.getDate() + 6));
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'all':
        start = new Date(2000, 0, 1);
        end = new Date(2099, 11, 31);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }
    
    setCurrentPeriod({ start, end });
    setPeriodType(type);
  };

  // Fetch all data - RLS will automatically filter based on family_id
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', user?.family_id],
    queryFn: () => base44.entities.Transaction.list('-date', 200),
    enabled: !!user
  });

  const { data: allAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts', user?.family_id],
    queryFn: () => base44.entities.Account.list(),
    enabled: !!user
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.family_id],
    queryFn: () => base44.entities.Budget.filter({ is_active: true }),
    enabled: !!user
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.family_id],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' }),
    enabled: !!user
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments', user?.family_id],
    queryFn: () => base44.entities.Investment.list(),
    enabled: !!user
  });

  // Load all users to map user_id to email
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!family && balanceMode === 'family'
  });

  // Get family members for display
  const familyMembers = family?.members || [];
  
  // Filter accounts based on mode
  const personalAccounts = allAccounts.filter(acc => acc.created_by === user?.email);
  const familyAccounts = allAccounts; // RLS automatically filters by family_id

  // Calculate totals based on mode
  const displayAccounts = balanceMode === 'family' ? familyAccounts : personalAccounts;
  const totalBalance = displayAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  // Calculate balance per family member
  const memberBalances = familyMembers.map(member => {
    // Find user by ID to get email
    const memberUser = allUsers.find(u => u.id === member.user_id);
    const memberEmail = memberUser?.email;
    
    const memberAccounts = allAccounts.filter(acc => 
      memberEmail && acc.created_by === memberEmail
    );
    const balance = memberAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    return {
      ...member,
      balance,
      accountsCount: memberAccounts.length
    };
  });
  
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date >= currentPeriod.start && date <= currentPeriod.end;
  });

  const monthIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const investmentValue = investments.reduce((sum, inv) => 
    sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0
  );

  const investmentProfit = investments.reduce((sum, inv) => 
    sum + (inv.quantity * ((inv.current_price || inv.purchase_price) - inv.purchase_price)), 0
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <BibleVerse />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Привет! 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {format(new Date(), "EEEE, d MMMM", { locale: ru })}
              {family && (
                <span className="ml-2 text-violet-600">• {family.name}</span>
              )}
            </p>
          </div>
          <Button
            onClick={() => {
              setQuickAddType('expense');
              setShowQuickAdd(true);
            }}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl h-11 px-5"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Добавить</span>
          </Button>
        </motion.div>

        {/* Balance Mode Selector */}
        {family && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-4"
          >
            <div className="flex gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
             <button
               onClick={() => setBalanceMode('personal')}
               className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all pointer-events-auto cursor-pointer ${
                 balanceMode === 'personal'
                   ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
               }`}
             >
               Личный баланс
             </button>
             <button
               onClick={() => setBalanceMode('family')}
               className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all pointer-events-auto cursor-pointer ${
                 balanceMode === 'family'
                   ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
               }`}
             >
               Семейный баланс
             </button>
            </div>
          </motion.div>
        )}

        {/* Main Balance Card */}
        {visibleBlocks.balance && (
          <BalanceCard 
            totalBalance={totalBalance}
            monthIncome={monthIncome}
            monthExpenses={monthExpenses}
            investmentValue={investmentValue}
            investmentProfit={investmentProfit}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Family Members Balance Breakdown */}
        {balanceMode === 'family' && family && memberBalances.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Баланс по членам семьи</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {memberBalances.map((member, idx) => (
                    <motion.div
                      key={member.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx }}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: member.avatar_color || '#8B5CF6' }}
                        >
                          {member.display_name?.[0] || member.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {member.display_name || member.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {member.accountsCount} {member.accountsCount === 1 ? 'счёт' : 'счетов'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(member.balance)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {totalBalance > 0 ? Math.round((member.balance / totalBalance) * 100) : 0}%
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-600" />
                  <span className="font-medium text-slate-900 dark:text-white">Период статистики</span>
                </div>
                <Select value={periodType} onValueChange={updatePeriod}>
                  <SelectTrigger className="w-full sm:w-40 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Неделя</SelectItem>
                    <SelectItem value="month">Месяц</SelectItem>
                    <SelectItem value="year">Год</SelectItem>
                    <SelectItem value="all">Всё время</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        {visibleBlocks.quickStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card 
                className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setQuickAddType('income');
                  setShowQuickAdd(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                      <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Доходы</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(monthIncome)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card 
                className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setQuickAddType('expense');
                  setShowQuickAdd(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                      <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Расходы</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(monthExpenses)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link to={createPageUrl('Investments')}>
                <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                        <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Инвестиции</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(investmentValue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Link to={createPageUrl('AIAssistant')}>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/20">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80">AI Ассистент</p>
                        <p className="text-lg font-semibold text-white flex items-center gap-1">
                          Спросить
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </div>
        )}

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <AIInsights 
            transactions={transactions}
            accounts={displayAccounts}
            budgets={budgets}
            investments={investments}
            formatCurrency={formatCurrency}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Chart & Transactions */}
          <div className="lg:col-span-2 space-y-6">
            {visibleBlocks.spendingChart && (
              <SpendingChart transactions={monthTransactions} formatCurrency={formatCurrency} />
            )}
            {visibleBlocks.transactions && (
              <RecentTransactions transactions={transactions.slice(0, 5)} formatCurrency={formatCurrency} />
            )}
          </div>

          {/* Right Column - Budgets & Goals */}
          <div className="space-y-6">
            {visibleBlocks.budgets && (
              <BudgetOverview budgets={budgets} formatCurrency={formatCurrency} />
            )}
            {visibleBlocks.goals && (
              <AllGoalsProgress goals={goals} formatCurrency={formatCurrency} />
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showQuickAdd && (
          <QuickAddTransaction 
            onClose={() => setShowQuickAdd(false)}
            accounts={allAccounts}
            defaultType={quickAddType}
          />
        )}
      </AnimatePresence>
    </div>
  );
}