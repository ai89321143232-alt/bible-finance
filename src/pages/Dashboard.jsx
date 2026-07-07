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
import MobileSelect from '@/components/mobile/MobileSelect';
import QuickAddTransaction from '@/components/transactions/QuickAddTransaction';
import VoiceTransactionButton from '@/components/VoiceTransactionButton';
import BalanceCard from '@/components/dashboard/BalanceCard';
import SpendingChart from '@/components/dashboard/SpendingChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import AllGoalsProgress from '@/components/dashboard/AllGoalsProgress';
import BudgetOverview from '@/components/dashboard/BudgetOverview';
import AIInsights from '@/components/dashboard/AIInsights';
import BibleVerse from '@/components/dashboard/BibleVerse';
import ThemeSelector from '@/components/onboarding/ThemeSelector';
import ChildDashboard from '@/components/child/ChildDashboard';
import PremiumAIAnalytics from '@/components/dashboard/PremiumAIAnalytics';
import SafeDailyLimit from '@/components/dashboard/SafeDailyLimit';
import EmergencyFund from '@/components/dashboard/EmergencyFund';
import NetWorthCard from '@/components/dashboard/NetWorthCard';
import QuickTemplates from '@/components/dashboard/QuickTemplates';
import QuickFilters from '@/components/dashboard/QuickFilters';
import MonthForecast from '@/components/dashboard/MonthForecast';
import BudgetMonthEndBanner from '@/components/dashboard/BudgetMonthEndBanner';
import { useIsMobile } from '@/hooks/use-mobile';
import TemplatesManager from '@/components/transactions/TemplatesManager';
import PullToRefresh from '@/components/PullToRefresh';

export default function Dashboard() {
  const queryClient = useQueryClient();

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState('expense');
  const [showTemplatesManager, setShowTemplatesManager] = useState(false);
  const [filterAccount, setFilterAccount] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [periodType, setPeriodType] = useState('month');
  const [currentPeriod, setCurrentPeriod] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const [user, setUser] = useState(null);
  const [themePreference, setThemePreference] = useState(null);
  const [balanceMode, setBalanceMode] = useState('personal');

  const isMobile = useIsMobile();

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
    const handler = () => loadUser();
    window.addEventListener('personalization-saved', handler);
    return () => window.removeEventListener('personalization-saved', handler);
  }, []);

  const migrateUserData = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.family_id) {
        await base44.functions.invoke('migrateFamilyData', {});
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
    const blocks = userData.visible_dashboard_blocks || userData.data?.visible_dashboard_blocks;
    if (blocks) {
      setVisibleBlocks(prev => ({ ...prev, ...blocks }));
    }
  };

  const { data: family, isSuccess: familyLoaded } = useQuery({
    queryKey: ['my-family', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const families = await base44.entities.Family.list();
      return families.find(f => 
        f.owner_id === user?.id || 
        f.members?.some(m => m.user_id === user?.id)
      ) ?? null;
    },
    enabled: !!user
  });

  // familyReady: true после того как запрос семьи завершился (null = нет семьи, объект = есть)
  const familyReady = familyLoaded;

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

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Transaction.list('-date', 200);
      return all.filter(t =>
        t.created_by === user.email ||
        (family?.id && t.family_id === family.id)
      );
    },
    enabled: !!user && familyReady
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['accounts', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Account.list();
      return all.filter(a =>
        a.created_by === user.email ||
        (family?.id && a.family_id === family.id)
      );
    },
    enabled: !!user && familyReady
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Budget.filter({ is_active: true });
      return all.filter(b =>
        b.created_by === user.email ||
        (family?.id && b.is_family_budget && b.family_id === family.id) ||
        (family?.id && b.share_with?.includes(user.id))
      );
    },
    enabled: !!user && familyReady
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Goal.filter({ status: 'active' });
      return all.filter(g =>
        g.created_by === user.email ||
        (family?.id && g.is_family_goal && g.family_id === family.id) ||
        (family?.id && g.share_with?.includes(user.id))
      );
    },
    enabled: !!user && familyReady
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Investment.list();
      return all.filter(inv =>
        inv.created_by === user.email ||
        (family?.id && inv.family_id === family.id)
      );
    },
    enabled: !!user && familyReady
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['transaction-templates'],
    queryFn: () => base44.entities.TransactionTemplate.list('sort_order', 50),
    enabled: !!user
  });

  const familyMembers = family?.members || [];
  const personalAccounts = allAccounts.filter(acc => acc.user_id === user?.id);
  const familyAccounts = allAccounts.filter(acc => acc.family_id === family?.id);
  const displayAccounts = balanceMode === 'family' ? familyAccounts : personalAccounts;
  // Общий баланс = только положительные балансы (активы без долгов)
  const totalBalance = displayAccounts.reduce((sum, acc) => sum + Math.max(acc.balance || 0, 0), 0);
  
  const memberBalances = familyMembers.map(member => {
    const memberAccounts = allAccounts.filter(acc => acc.user_id === member.user_id);
    const balance = memberAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    return { ...member, balance, accountsCount: memberAccounts.length };
  });
  
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date >= currentPeriod.start && date <= currentPeriod.end;
  });

  // Quick filters
  const uniqueCategories = [...new Set(monthTransactions.map(t => t.category).filter(Boolean))].sort();

  const filteredTransactions = monthTransactions.filter(t => {
    if (filterAccount && t.account_id !== filterAccount) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterAccount(null);
    setFilterCategory(null);
  };

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

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['investments'] }),
    ]);
  };

  const handleUseTemplate = async (template) => {
    const accountId = template.account_id || (allAccounts[0]?.id);
    if (!accountId) return;
    const account = allAccounts.find(a => a.id === accountId);
    if (!account) return;

    // For expense, check non-credit account balance
    if (template.type === 'expense' && account.type !== 'credit' && (account.balance || 0) - template.amount < 0) {
      // Don't block, but could show a warning — for now just proceed
    }

    await base44.entities.Transaction.create({
      type: template.type,
      amount: template.amount,
      category: template.category,
      subcategory: template.subcategory || undefined,
      description: template.description || template.name,
      account_id: accountId,
      date: new Date().toISOString(),
      user_id: user?.id,
      family_id: family?.id || undefined
    });

    // Update account balance
    const delta = template.type === 'income' ? template.amount : -template.amount;
    await base44.entities.Account.update(accountId, {
      balance: (account.balance || 0) + delta
    });

    queryClient.invalidateQueries();
  };

  if (user && themePreference === null) {
    return (
      <ThemeSelector onComplete={(theme) => setThemePreference(theme)} />
    );
  }

  if (themePreference === 'child' && user?.role !== 'admin') {
    return (
      <ChildDashboard
        user={user}
        accounts={allAccounts}
        onTransactionAdded={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
      />
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-[#0f1117]">
      <BibleVerse />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 pt-2 lg:pt-0"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">Главная</h1>
            <p className="text-white/35 text-sm mt-0.5">
              {format(new Date(), "EEEE, d MMMM", { locale: ru })}
              {family && (<span className="ml-2 text-white/50">· {family.name}</span>)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VoiceTransactionButton onTransactionCreated={() => queryClient.invalidateQueries()} />
            <Button
              onClick={() => { setQuickAddType('expense'); setShowQuickAdd(true); }}
              className="bg-white text-black hover:bg-white/90 rounded-lg h-9 px-4 text-sm font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Добавить</span>
            </Button>
          </div>
        </motion.div>

        {family && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
            <div className="flex gap-1 p-1 bg-white/5 border border-white/8 rounded-lg w-fit">
             <button onClick={() => setBalanceMode('personal')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${balanceMode === 'personal' ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
                Личный
              </button>
              <button onClick={() => setBalanceMode('family')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${balanceMode === 'family' ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
                Семейный
              </button>
            </div>
          </motion.div>
        )}

        {visibleBlocks.balance && (
          <BalanceCard 
            totalBalance={totalBalance} monthIncome={monthIncome} monthExpenses={monthExpenses}
            investmentValue={investmentValue} investmentProfit={investmentProfit}
            formatCurrency={formatCurrency}
            accounts={displayAccounts} investments={investments}
          />
        )}

        {/* Net Worth Card — shows assets vs debts breakdown */}
        <NetWorthCard
          accounts={displayAccounts}
          investments={investments}
          formatCurrency={formatCurrency}
        />

        {/* Quick Filters — instant account/category filtering */}
        {!isMobile && (
          <QuickFilters
            accounts={allAccounts.filter(a => (a.balance || 0) !== 0 || a.type === 'credit')}
            categories={uniqueCategories}
            selectedAccount={filterAccount}
            selectedCategory={filterCategory}
            onSelectAccount={setFilterAccount}
            onSelectCategory={setFilterCategory}
            onClear={clearFilters}
          />
        )}

        {/* Quick Templates — one-click transaction creation */}
        {!isMobile && (
          <QuickTemplates
            templates={templates}
            accounts={allAccounts}
            onUseTemplate={handleUseTemplate}
            onOpenManager={() => setShowTemplatesManager(true)}
          />
        )}

        {balanceMode === 'family' && family && memberBalances.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-4">
            <div className="rounded-xl border border-white/8 bg-[#141820] divide-y divide-white/5">
              <div className="px-4 py-3 text-white/40 text-xs uppercase tracking-widest font-medium">Баланс по членам семьи</div>
              {memberBalances.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: member.avatar_color || '#555' }}>
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

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-white/30" />
          <MobileSelect value={periodType} onValueChange={updatePeriod} placeholder="Период" title="Выберите период" triggerClassName="w-36 h-8 text-sm rounded-lg border-white/8 bg-white/5 text-white/70">
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="year">Год</option>
            <option value="all">Всё время</option>
          </MobileSelect>
        </motion.div>

        {visibleBlocks.quickStats && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 cursor-pointer hover:bg-emerald-500/10 transition-all"
              onClick={() => { setQuickAddType('income'); setShowQuickAdd(true); }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /></div>
                <span className="text-white/40 text-xs">Доходы</span>
              </div>
              <p className="text-emerald-400 font-bold text-lg">{formatCurrency(monthIncome)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4 cursor-pointer hover:bg-rose-500/10 transition-all"
              onClick={() => { setQuickAddType('expense'); setShowQuickAdd(true); }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center"><ArrowDownRight className="w-3.5 h-3.5 text-rose-400" /></div>
                <span className="text-white/40 text-xs">Расходы</span>
              </div>
              <p className="text-rose-400 font-bold text-lg">{formatCurrency(monthExpenses)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Link to={createPageUrl('Investments')}>
                <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 hover:bg-cyan-500/10 transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-cyan-400" /></div>
                    <span className="text-white/40 text-xs">Инвестиции</span>
                  </div>
                  <p className="text-cyan-400 font-bold text-lg">{formatCurrency(investmentValue)}</p>
                </div>
              </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
              <Link to={createPageUrl('AIAssistant')}>
                <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 hover:bg-violet-500/10 transition-all h-full flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-violet-400" /></div>
                      <span className="text-white/40 text-xs">AI</span>
                    </div>
                    <p className="text-violet-300 font-bold">Спросить</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
              </Link>
            </motion.div>
            <SafeDailyLimit budgets={budgets} formatCurrency={formatCurrency} />
            <EmergencyFund totalBalance={totalBalance} transactions={transactions} formatCurrency={formatCurrency} />
          </div>
        )}

        <BudgetMonthEndBanner
          budgets={budgets}
          transactions={transactions}
          formatCurrency={formatCurrency}
          onBudgetUpdated={() => queryClient.invalidateQueries({ queryKey: ['budgets'] })}
        />

        <MonthForecast transactions={transactions} totalBalance={totalBalance} formatCurrency={formatCurrency} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <AIInsights transactions={transactions} accounts={displayAccounts} budgets={budgets} investments={investments} formatCurrency={formatCurrency} />
        </motion.div>

        {user?.subscription_tier === 'premium' || user?.subscription_tier === 'family' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
            <PremiumAIAnalytics />
          </motion.div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {visibleBlocks.spendingChart && (
              <SpendingChart transactions={transactions} formatCurrency={formatCurrency} periodType={periodType} />
            )}
            {visibleBlocks.transactions && (
              <RecentTransactions transactions={(filterAccount || filterCategory ? filteredTransactions : transactions).slice(0, 5)} formatCurrency={formatCurrency} />
            )}
          </div>
          <div className="space-y-6">
            {visibleBlocks.budgets && (
              <BudgetOverview budgets={budgets} transactions={transactions} formatCurrency={formatCurrency} />
            )}
            {visibleBlocks.goals && (
              <AllGoalsProgress goals={goals} formatCurrency={formatCurrency} />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQuickAdd && (
          <QuickAddTransaction onClose={() => setShowQuickAdd(false)} accounts={allAccounts} defaultType={quickAddType} />
        )}
      </AnimatePresence>

      <TemplatesManager
        open={showTemplatesManager}
        onClose={() => {
          setShowTemplatesManager(false);
          queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
        }}
        onUseTemplate={handleUseTemplate}
        accounts={allAccounts}
      />
    </div>
    </PullToRefresh>
  );
}