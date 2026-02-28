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
import ThemeSelector from '@/components/onboarding/ThemeSelector';
import ChildDashboard from '@/components/child/ChildDashboard';

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
  const [themePreference, setThemePreference] = useState(null);
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
    setThemePreference(userData.theme_preference || null);
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

  // Get family members for display
  const familyMembers = family?.members || [];
  
  // Filter accounts based on mode - используем user_id
  const personalAccounts = allAccounts.filter(acc => acc.user_id === user?.id);
  const familyAccounts = allAccounts; // RLS automatically filters by family_id

  // Calculate totals based on mode
  const displayAccounts = balanceMode === 'family' ? familyAccounts : personalAccounts;
  const totalBalance = displayAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  // Calculate balance per family member - используем user_id напрямую
  const memberBalances = familyMembers.map(member => {
    const memberAccounts = allAccounts.filter(acc => acc.user_id === member.user_id);
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

  // Show theme selector for new users
  if (user && themePreference === null) {
    return (
      <ThemeSelector
        onComplete={(theme) => setThemePreference(theme)}
      />
    );
  }

  // Show child dashboard
  if (themePreference === 'child') {
    return (
      <ChildDashboard
        user={user}
        accounts={allAccounts}
        onTransactionAdded={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <BibleVerse />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 pt-2 lg:pt-0"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">
              Главная
            </h1>
            <p className="text-white/35 text-sm mt-0.5">
              {format(new Date(), "EEEE, d MMMM", { locale: ru })}
              {family && (
                <span className="ml-2 text-white/50">· {family.name}</span>
              )}
            </p>
          </div>
          <Button
            onClick={() => {
              setQuickAddType('expense');
              setShowQuickAdd(true);
            }}
            className="bg-white text-black hover:bg-white/90 rounded-lg h-9 px-4 text-sm font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Добавить</span>
          </Button>
        </motion.div>

        {/* Balance Mode Selector */}
        {family && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-4"
          >
            <div className="flex gap-1 p-1 bg-white/5 border border-white/8 rounded-lg w-fit">
             <button
               onClick={() => setBalanceMode('personal')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 balanceMode === 'personal'
                   ? 'bg-white text-black'
                   : 'text-white/40 hover:text-white/70'
               }`}
             >
               Личный
             </button>
             <button
               onClick={() => setBalanceMode('family')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 balanceMode === 'family'
                   ? 'bg-white text-black'
                   : 'text-white/40 hover:text-white/70'
               }`}
             >
               Семейный
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <div className="rounded-xl border border-white/8 bg-[#141820] divide-y divide-white/5">
              <div className="px-4 py-3 text-white/40 text-xs uppercase tracking-widest font-medium">
                Баланс по членам семьи
              </div>
              {memberBalances.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: member.avatar_color || '#555' }}
                    >
                      {member.display_name?.[0] || member.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">{member.display_name || member.name}</p>
                      <p className="text-white/30 text-xs">{member.accountsCount} счетов</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{formatCurrency(member.balance)}</p>
                    <p className="text-white/30 text-xs">{totalBalance > 0 ? Math.round((member.balance / totalBalance) * 100) : 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5 flex items-center gap-3"
        >
          <Calendar className="w-4 h-4 text-white/30" />
          <Select value={periodType} onValueChange={updatePeriod}>
            <SelectTrigger className="w-36 h-8 text-sm rounded-lg border-white/8 bg-white/5 text-white/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="year">Год</SelectItem>
              <SelectItem value="all">Всё время</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Quick Stats */}
        {visibleBlocks.quickStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div
              className="rounded-xl border border-white/8 bg-[#141820] p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => { setQuickAddType('income'); setShowQuickAdd(true); }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span className="text-white/40 text-xs">Доходы</span>
              </div>
              <p className="text-white font-semibold text-lg">{formatCurrency(monthIncome)}</p>
            </div>

            <div
              className="rounded-xl border border-white/8 bg-[#141820] p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => { setQuickAddType('expense'); setShowQuickAdd(true); }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                <span className="text-white/40 text-xs">Расходы</span>
              </div>
              <p className="text-white font-semibold text-lg">{formatCurrency(monthExpenses)}</p>
            </div>

            <Link to={createPageUrl('Investments')}>
              <div className="rounded-xl border border-white/8 bg-[#141820] p-4 hover:bg-white/5 transition-colors h-full">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-white/50" />
                  <span className="text-white/40 text-xs">Инвестиции</span>
                </div>
                <p className="text-white font-semibold text-lg">{formatCurrency(investmentValue)}</p>
              </div>
            </Link>

            <Link to={createPageUrl('AIAssistant')}>
              <div className="rounded-xl border border-white/8 bg-[#141820] p-4 hover:bg-white/5 transition-colors h-full flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-white/50" />
                    <span className="text-white/40 text-xs">AI Ассистент</span>
                  </div>
                  <p className="text-white font-semibold">Спросить</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </div>
            </Link>
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