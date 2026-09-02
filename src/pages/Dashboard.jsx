import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useLanguage } from '@/lib/LanguageContext';
import { formatCurrencyFor } from '@/lib/formatCurrency';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, Plus, Wallet,
  PiggyBank, Target, ChevronRight, Sparkles, CreditCard, Calendar } from
'lucide-react';
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
import GamificationWidget from '@/components/dashboard/GamificationWidget';
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
import FamilyTierBanner from '@/components/dashboard/FamilyTierBanner';
import { useIsMobile } from '@/hooks/use-mobile';
import TemplatesManager from '@/components/transactions/TemplatesManager';
import PullToRefresh from '@/components/PullToRefresh';
import { useActiveWorkspaceId, filterByWorkspace } from '@/components/workspace/WorkspaceContext';
import MemberAvatar from '@/components/family/MemberAvatar';
import MemberSpendingBreakdown from '@/components/dashboard/MemberSpendingBreakdown';
import { INVESTMENT_CATEGORY } from '@/lib/investmentConstants';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { groupBalancesByCurrency, buildAccountCurrencyMap, groupTransactionsByCurrency } from '@/lib/groupByCurrency';
import { useScopeMode } from '@/hooks/useScopeMode';
import ScopeModeSwitcher from '@/components/settings/ScopeModeSwitcher';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : ru;

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [quickAddType, setQuickAddType] = useState('expense');
  const [showTemplatesManager, setShowTemplatesManager] = useState(false);
  const [filterAccount, setFilterAccount] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [periodType, setPeriodType] = useState('month');
  const [currentPeriod, setCurrentPeriod] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const [localThemeOverride, setLocalThemeOverride] = useState(null);
  const [balanceMode, setBalanceMode] = useState('personal');

  const isMobile = useIsMobile();
  const activeWorkspaceId = useActiveWorkspaceId();
  const { scopeMode, setScopeMode, filterAccounts, filterTransactions } = useScopeMode();

  const [visibleBlocks, setVisibleBlocks] = useState({
    balance: true,
    quickStats: true,
    spendingChart: true,
    transactions: true,
    budgets: true,
    goals: true
  });
  const [blockOrder, setBlockOrder] = useState(['balance', 'quickStats', 'spendingChart', 'transactions', 'budgets', 'goals']);

  // Кэшированный запрос пользователя — при переходах между страницами данные
  // берутся мгновенно из кэша, без "мигания" на null и обнуления баланса
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const themePreference = localThemeOverride ?? user?.theme_preference ?? null;
  const businessEnabled = user?.business_enabled !== false;
  const scopeModes = ['personal', 'business', 'all'];

  useEffect(() => {
    if (!user) return;
    const blocks = user.visible_dashboard_blocks || user.data?.visible_dashboard_blocks;
    if (blocks) {
      setVisibleBlocks((prev) => ({ ...prev, ...blocks }));
    }
    const order = user.dashboard_block_order || user.data?.dashboard_block_order;
    if (order && Array.isArray(order)) {
      const defaults = ['balance', 'quickStats', 'spendingChart', 'transactions', 'budgets', 'goals'];
      const merged = [...order, ...defaults.filter((k) => !order.includes(k))];
      setBlockOrder(merged);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.family_id) return;
    base44.functions.invoke('migrateFamilyData', {}).then(() => {
      setTimeout(() => queryClient.invalidateQueries(), 1000);
    }).catch((error) => console.error('Migration error:', error));
  }, [user?.family_id]);

  useEffect(() => {
    const handler = () => queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    window.addEventListener('personalization-saved', handler);
    return () => window.removeEventListener('personalization-saved', handler);
  }, [queryClient]);

  const { data: family, isSuccess: familyLoaded } = useQuery({
    queryKey: ['my-family', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const families = await base44.entities.Family.list();
      return families.find((f) =>
      f.owner_id === user?.id ||
      f.members?.some((m) => m.user_id === user?.id)
      ) ?? null;
    },
    enabled: !!user
  });

  // familyReady: true после того как запрос семьи завершился (null = нет семьи, объект = есть)
  const familyReady = familyLoaded;

  const updatePeriod = (type) => {
    const now = new Date();
    let start, end;
    switch (type) {
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

  const { data: rawTransactions = [] } = useQuery({
    queryKey: ['transactions', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Transaction.list('-date', 200);
      return all.filter((t) =>
      t.created_by_id === user.id ||
      t.user_id === user.id ||
      family?.id && t.family_id === family.id
      );
    },
    enabled: !!user
  });

  const { data: rawAllAccounts = [] } = useQuery({
    queryKey: ['accounts', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const memberIds = family?.members?.map((m) => m.user_id) || [];
      const all = await base44.entities.Account.list();
      return all.filter((a) =>
      a.created_by_id === user.id ||
      family?.id && a.family_id === family.id ||
      // счета всех членов семьи — по их user_id / created_by_id
      memberIds.includes(a.created_by_id) ||
      memberIds.includes(a.user_id)
      );
    },
    enabled: !!user
  });

  const { data: rawBudgets = [] } = useQuery({
    queryKey: ['budgets', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Budget.filter({ is_active: true });
      return all.filter((b) =>
      b.created_by_id === user.id || b.user_id === user.id ||
      family?.id && b.is_family_budget && b.family_id === family.id ||
      family?.id && b.share_with?.includes(user.id)
      );
    },
    enabled: !!user
  });

  const { data: rawGoals = [] } = useQuery({
    queryKey: ['goals', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Goal.filter({ status: 'active' });
      return all.filter((g) =>
      g.created_by_id === user.id ||
      family?.id && g.is_family_goal && g.family_id === family.id ||
      family?.id && g.share_with?.includes(user.id)
      );
    },
    enabled: !!user
  });

  const { data: rawInvestments = [] } = useQuery({
    queryKey: ['investments', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.Investment.list();
      return all.filter((inv) =>
      inv.created_by_id === user.id ||
      family?.id && inv.family_id === family.id
      );
    },
    enabled: !!user
  });

  const { data: rawFixedAssets = [] } = useQuery({
    queryKey: ['fixed-assets', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.FixedAsset.list();
      return all.filter((fa) =>
      fa.created_by_id === user.id ||
      family?.id && fa.family_id === family.id
      );
    },
    enabled: !!user
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['transaction-templates'],
    queryFn: () => base44.entities.TransactionTemplate.list('sort_order', 50),
    enabled: !!user
  });

  const { data: rawSubscriptions = [] } = useQuery({
    queryKey: ['recurring-payments', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.RecurringPayment.list();
      return all.filter(
        (s) =>
        s.created_by_id === user.id ||
        s.user_id === user.id ||
        family?.id && s.family_id === family.id
      );
    },
    enabled: !!user
  });

  const { data: rawDebtAccounts = [] } = useQuery({
    queryKey: ['debtAccounts', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.DebtAccount.list();
      return all.filter(
        (d) =>
        d.created_by_id === user.id ||
        d.user_id === user.id ||
        family?.id && d.family_id === family.id
      );
    },
    enabled: !!user
  });

  // Этап 3: фильтрация по активному пространству (безопасна к старым записям без workspace_id)
  const wsTransactions = filterByWorkspace(rawTransactions, activeWorkspaceId);
  const wsAccounts = filterByWorkspace(rawAllAccounts, activeWorkspaceId);
  // Этап 4: фильтрация по области (Личные / Бизнес / Всё вместе)
  const transactions = filterTransactions(wsTransactions, wsAccounts);
  const allAccounts = filterAccounts(wsAccounts);
  const budgets = filterByWorkspace(rawBudgets, activeWorkspaceId);
  const goals = filterByWorkspace(rawGoals, activeWorkspaceId);
  const investments = filterByWorkspace(rawInvestments, activeWorkspaceId);
  const fixedAssets = filterByWorkspace(rawFixedAssets, activeWorkspaceId);
  const subscriptions = filterByWorkspace(rawSubscriptions, activeWorkspaceId);
  const debtAccounts = filterByWorkspace(rawDebtAccounts, activeWorkspaceId);

  const familyMembers = family?.members || [];
  const memberIds = familyMembers.map((m) => m.user_id);

  // Личный режим: только мои счета (проходят через фильтр пространства)
  const personalAccounts = allAccounts.filter((acc) =>
  acc.created_by_id === user?.id || acc.user_id === user?.id
  );
  // Семейный режим: мои счета + счета всех членов семьи.
  // Берём из rawAllAccounts (без фильтра по пространству), чтобы чужие счета не отсекались.
  const familyAccounts = filterAccounts(rawAllAccounts.filter((acc) =>
  acc.created_by_id === user?.id ||
  acc.user_id === user?.id ||
  family?.id && acc.family_id === family.id ||
  memberIds.includes(acc.created_by_id) ||
  memberIds.includes(acc.user_id)
  ));
  const displayAccounts = balanceMode === 'family' ? familyAccounts : personalAccounts;

  // Мультивалютная поддержка: хук курсов и группировка по валюте
  const { convert, hasRate, profileCurrency: hookCurrency, isMultiCurrency } = useExchangeRates();
  const balancesByCurrency = groupBalancesByCurrency(displayAccounts);
  const accountCurrencyMap = buildAccountCurrencyMap(allAccounts);

  // Общий баланс = только положительные балансы (активы без долгов), конвертируем в валюту профиля
  const totalBalance = Object.entries(balancesByCurrency).reduce((sum, [cur, bal]) => {
    const positive = Math.max(bal, 0);
    if (cur === hookCurrency) return sum + positive;
    const converted = convert(positive, cur, hookCurrency);
    return converted != null ? sum + converted : sum;
  }, 0);

  const memberBalances = familyMembers.map((member) => {
    const memberAccounts = allAccounts.filter((acc) =>
    acc.created_by_id === member.user_id || acc.user_id === member.user_id
    );
    const memberBalanceByCur = groupBalancesByCurrency(memberAccounts);
    const balance = Object.entries(memberBalanceByCur).reduce((sum, [cur, bal]) => {
      if (cur === hookCurrency) return sum + bal;
      const converted = convert(bal, cur, hookCurrency);
      return converted != null ? sum + converted : sum;
    }, 0);
    return { ...member, balance, accountsCount: memberAccounts.length };
  });

  // Личный режим: только мои операции. Семейный режим: все операции (моих + членов семьи), как раньше.
  const personalTransactions = transactions.filter((t) =>
  t.created_by_id === user?.id || t.user_id === user?.id
  );
  const modeTransactions = family && balanceMode === 'family' ? transactions : personalTransactions;

  const monthTransactions = modeTransactions.filter((t) => {
    const date = new Date(t.date);
    return date >= currentPeriod.start && date <= currentPeriod.end;
  });

  // Quick filters
  const uniqueCategories = [...new Set(monthTransactions.map((t) => t.category).filter(Boolean))].sort();

  const filteredTransactions = monthTransactions.filter((t) => {
    if (filterAccount && t.account_id !== filterAccount) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterAccount(null);
    setFilterCategory(null);
  };

  // Доходы/расходы за период — конвертируем в валюту профиля по ручным курсам
  const monthIncome = monthTransactions.
  filter((t) => t.type === 'income').
  reduce((sum, t) => {
    const cur = t.currency || accountCurrencyMap[t.account_id] || hookCurrency;
    if (cur === hookCurrency) return sum + t.amount;
    const converted = convert(t.amount, cur, hookCurrency);
    return converted != null ? sum + converted : sum;
  }, 0);

  const monthExpenses = monthTransactions.
  filter((t) => t.type === 'expense' && t.category !== INVESTMENT_CATEGORY).
  reduce((sum, t) => {
    const cur = t.currency || accountCurrencyMap[t.account_id] || hookCurrency;
    if (cur === hookCurrency) return sum + t.amount;
    const converted = convert(t.amount, cur, hookCurrency);
    return converted != null ? sum + converted : sum;
  }, 0);

  // Личный режим: только мои инвестиции. Семейный режим: все инвестиции (мои + семьи), как раньше.
  const personalInvestments = investments.filter((inv) =>
  inv.created_by_id === user?.id || inv.user_id === user?.id
  );
  const modeInvestments = family && balanceMode === 'family' ? investments : personalInvestments;

  const investmentValue = modeInvestments.reduce((sum, inv) =>
  sum + inv.quantity * (inv.current_price || inv.purchase_price), 0
  );

  const investmentProfit = modeInvestments.reduce((sum, inv) =>
  sum + inv.quantity * ((inv.current_price || inv.purchase_price) - inv.purchase_price), 0
  );

  // Личный режим: только мои фиксированные активы. Семейный режим: мои + семьи.
  const personalFixedAssets = fixedAssets.filter((fa) => fa.created_by_id === user?.id);
  const modeFixedAssets = family && balanceMode === 'family' ? fixedAssets : personalFixedAssets;

  // Валюта профиля — дефолт для всех агрегатов (общий баланс, net worth, доход/расход)
  const profileCurrency = hookCurrency;
  const formatCurrency = (amount, currency) => formatCurrencyFor(amount, language, currency || profileCurrency);

  const handleRefresh = async () => {
    await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    queryClient.invalidateQueries({ queryKey: ['goals'] }),
    queryClient.invalidateQueries({ queryKey: ['investments'] })]
    );
  };

  const handleUseTemplate = async (template) => {
    const accountId = template.account_id || allAccounts[0]?.id;
    if (!accountId) return;
    const account = allAccounts.find((a) => a.id === accountId);
    if (!account) return;

    // For expense, check non-credit account balance
    if (template.type === 'expense' && account.type !== 'credit' && (account.balance || 0) - template.amount < 0) {











      // Don't block, but could show a warning — for now just proceed
    }await base44.entities.Transaction.create({ type: template.type, amount: template.amount, category: template.category, subcategory: template.subcategory || undefined, description: template.description || template.name, account_id: accountId, date: new Date().toISOString(), user_id: user?.id, family_id: family?.id || undefined
      });

    // Update account balance
    const delta = template.type === 'income' ? template.amount : -template.amount;
    await base44.entities.Account.update(accountId, {
      balance: (account.balance || 0) + delta
    });

    queryClient.invalidateQueries();
  };

  if (user && !themePreference) {
    return (
      <ThemeSelector onComplete={(theme) => {
        setLocalThemeOverride(theme);
        window.dispatchEvent(new Event('personalization-saved'));
      }} />);

  }

  if (themePreference === 'child' && user?.role !== 'admin') {
    return (
      <ChildDashboard
        user={user}
        accounts={allAccounts}
        onTransactionAdded={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })} />);


  }

  const renderBlock = (key) => {
    switch (key) {
      case 'balance':
        return (
          <section key="balance" className="mb-6 glass-card rounded-2xl p-4 sm:p-5 space-y-4">
            {businessEnabled ? (
              <>
                {/* Индикатор областей — точки */}
                <div className="flex items-center justify-center gap-2">
                  {scopeModes.map((m) => (
                    <span key={m} className={`h-1.5 rounded-full transition-all ${scopeMode === m ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
                  ))}
                </div>
                <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
                  onDragEnd={(event, info) => {
                    const idx = scopeModes.indexOf(scopeMode);
                    if (info.offset.x < -60 || info.velocity.x < -300) {
                      setScopeMode(scopeModes[(idx + 1) % scopeModes.length]);
                    } else if (info.offset.x > 60 || info.velocity.x > 300) {
                      setScopeMode(scopeModes[(idx - 1 + scopeModes.length) % scopeModes.length]);
                    }
                  }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={scopeMode} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                      <BalanceCard totalBalance={totalBalance} monthIncome={monthIncome} monthExpenses={monthExpenses} investmentValue={investmentValue} investmentProfit={investmentProfit} formatCurrency={formatCurrency} accounts={displayAccounts} investments={modeInvestments} />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </>
            ) : family ? (
              <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
                onDragEnd={(event, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -300) setBalanceMode('family');
                  else if (info.offset.x > 60 || info.velocity.x > 300) setBalanceMode('personal');
                }}>
                <AnimatePresence mode="wait">
                  <motion.div key={balanceMode} initial={{ opacity: 0, x: balanceMode === 'family' ? 40 : -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: balanceMode === 'family' ? -40 : 40 }} transition={{ duration: 0.2 }}>
                    <BalanceCard totalBalance={totalBalance} monthIncome={monthIncome} monthExpenses={monthExpenses} investmentValue={investmentValue} investmentProfit={investmentProfit} formatCurrency={formatCurrency} accounts={displayAccounts} investments={modeInvestments} />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ) : (
              <BalanceCard totalBalance={totalBalance} monthIncome={monthIncome} monthExpenses={monthExpenses} investmentValue={investmentValue} investmentProfit={investmentProfit} formatCurrency={formatCurrency} accounts={displayAccounts} investments={modeInvestments} />
            )}
            <NetWorthCard accounts={displayAccounts} investments={modeInvestments} fixedAssets={modeFixedAssets} formatCurrency={formatCurrency} onFixedAssetAdded={() => queryClient.invalidateQueries({ queryKey: ['fixed-assets'] })} />
          </section>
        );
      case 'quickStats':
        return (
          <section key="quickStats" className="mb-6 p-0 sm:p-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => { setQuickAddType('income'); setShowQuickAdd(true); }}>
                <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /></div><span className="text-muted-foreground text-xs">{t('dashboard.income')}</span></div>
                <p className="text-emerald-500 font-bold text-lg">{formatCurrency(monthIncome)}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="glass-card rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => { setQuickAddType('expense'); setShowQuickAdd(true); }}>
                <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center"><ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /></div><span className="text-muted-foreground text-xs">{t('dashboard.expense')}</span></div>
                <p className="text-rose-500 font-bold text-lg">{formatCurrency(monthExpenses)}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Link to={createPageUrl('Investments')}>
                  <div className="glass-card rounded-2xl p-4 hover:shadow-md transition-all h-full">
                    <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-cyan-500" /></div><span className="text-muted-foreground text-xs">{t('dashboard.investments')}</span></div>
                    <p className="text-cyan-500 font-bold text-lg">{formatCurrency(investmentValue)}</p>
                  </div>
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
                <Link to={createPageUrl('AIAssistant')}>
                  <div className="glass-card rounded-2xl p-4 hover:shadow-md transition-all h-full flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-violet-500" /></div><span className="text-muted-foreground text-xs">{t('dashboard.ai')}</span></div>
                      <p className="text-foreground font-bold">{t('dashboard.ai_ask')}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              </motion.div>
              <SafeDailyLimit budgets={budgets} accounts={displayAccounts} subscriptions={subscriptions} formatCurrency={formatCurrency} />
              <EmergencyFund totalBalance={totalBalance} transactions={transactions} accounts={allAccounts} formatCurrency={formatCurrency} />
            </div>
          </section>
        );
      case 'spendingChart':
        return (
          <div key="spendingChart" className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <MobileSelect value={periodType} onValueChange={updatePeriod} placeholder={t('dashboard.period')} title={t('dashboard.period_title')} triggerClassName="w-36 h-8 text-sm rounded-lg border-border bg-muted text-muted-foreground">
                <option value="week">{t('dashboard.period_week')}</option>
                <option value="month">{t('dashboard.period_month')}</option>
                <option value="year">{t('dashboard.period_year')}</option>
                <option value="all">{t('dashboard.period_all')}</option>
              </MobileSelect>
            </div>
            <SpendingChart transactions={transactions} formatCurrency={formatCurrency} periodType={periodType} accounts={allAccounts} />
          </div>
        );
      case 'transactions':
        return <div key="transactions" className="mb-6"><RecentTransactions transactions={(filterAccount || filterCategory ? filteredTransactions : transactions).slice(0, 5)} formatCurrency={formatCurrency} onEdit={(t) => { setEditTransaction(t); setShowQuickAdd(true); }} /></div>;
      case 'budgets':
        return <div key="budgets" className="mb-6"><BudgetOverview budgets={budgets} transactions={transactions} formatCurrency={formatCurrency} currentUser={user} /></div>;
      case 'goals':
        return <div key="goals" className="mb-6"><AllGoalsProgress goals={goals} formatCurrency={formatCurrency} /></div>;
      case 'aiInsights':
        return (
          <motion.div key="aiInsights" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
            <AIInsights transactions={transactions} accounts={displayAccounts} budgets={budgets} investments={investments} formatCurrency={formatCurrency} />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen">
      <BibleVerse />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6 pt-2 lg:pt-0">
            
          <div className="bg-card/70 backdrop-blur-sm rounded-xl px-3 py-2 -mx-3 -my-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-foreground/70 text-sm mt-0.5">
              {format(new Date(), "EEEE, d MMMM", { locale: dateLocale })}
              {family && <span className="ml-2 text-foreground/70">· {family.name}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VoiceTransactionButton onTransactionCreated={() => queryClient.invalidateQueries()} />
            <Button
                onClick={() => {setQuickAddType('expense');setShowQuickAdd(true);}}
                className="rounded-lg h-9 px-4 text-sm font-semibold transition-colors bg-white text-violet-600 hover:bg-violet-600 hover:text-white dark:bg-violet-600 dark:text-white dark:hover:bg-slate-400 dark:hover:text-white">
                
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">{t('common.add')}</span>
            </Button>
          </div>
        </motion.div>

        <GamificationWidget />

        <FamilyTierBanner user={user} hasFamily={!!family} />

        {businessEnabled &&
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="mb-4">
            <ScopeModeSwitcher />
          </motion.div>
        }

        {family &&
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
            <div className="flex gap-1 p-1 bg-muted border border-border rounded-lg w-fit">
             <button onClick={() => setBalanceMode('personal')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${balanceMode === 'personal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t('dashboard.personal_mode')}
              </button>
              <button onClick={() => setBalanceMode('family')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${balanceMode === 'family' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t('dashboard.family_mode')}
              </button>
            </div>
          </motion.div>
          }

        {/* Quick Filters — instant account/category filtering */}
        {!isMobile &&
          <QuickFilters
            accounts={allAccounts.filter((a) => (a.balance || 0) !== 0 || a.type === 'credit')}
            categories={uniqueCategories}
            selectedAccount={filterAccount}
            selectedCategory={filterCategory}
            onSelectAccount={setFilterAccount}
            onSelectCategory={setFilterCategory}
            onClear={clearFilters} />

          }

        {blockOrder.filter((k) => visibleBlocks[k]).map((k) => renderBlock(k))}

        {/* Quick Templates — one-click transaction creation */}
        {!isMobile &&
          <QuickTemplates
            templates={templates}
            accounts={allAccounts}
            onUseTemplate={handleUseTemplate}
            onOpenManager={() => setShowTemplatesManager(true)} />

          }

        {balanceMode === 'family' && family && memberBalances.length > 0 &&
          <div className="mb-6"><MemberSpendingBreakdown transactions={monthTransactions} familyMembers={familyMembers} accounts={allAccounts} formatCurrency={formatCurrency} /></div>
          }

        {balanceMode === 'family' && family && memberBalances.length > 0 &&
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              <div className="px-4 py-3 text-muted-foreground text-xs uppercase tracking-widest font-medium">{t('dashboard.balance_by_members')}</div>
              {memberBalances.map((member) =>
              <div key={member.user_id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar member={member} size="sm" />
                    <div>
                      <p className="text-foreground text-sm font-medium">{member.display_name || member.name}</p>
                      <p className="text-muted-foreground text-xs">{member.accountsCount} {t('dashboard.accounts_count')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-semibold text-sm">{formatCurrency(member.balance)}</p>
                    <p className="text-muted-foreground text-xs">{totalBalance > 0 ? Math.round(member.balance / totalBalance * 100) : 0}%</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          }

        {/* ===== Секция: Аналитика и прогнозы ===== */}
        <section className="mb-6 rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5 space-y-5">
        <BudgetMonthEndBanner
            budgets={budgets}
            transactions={transactions}
            formatCurrency={formatCurrency}
            onBudgetUpdated={() => queryClient.invalidateQueries({ queryKey: ['budgets'] })} />
          

        <MonthForecast transactions={transactions} totalBalance={totalBalance} accounts={allAccounts} formatCurrency={formatCurrency} />
        </section>

        {user?.subscription_tier === 'premium' || user?.subscription_tier === 'family' ?
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-6">
            <PremiumAIAnalytics />
          </motion.div> :
          null}

      </div>

      <AnimatePresence>
        {showQuickAdd &&
          <QuickAddTransaction transaction={editTransaction} onClose={() => { setShowQuickAdd(false); setEditTransaction(null); }} accounts={allAccounts} defaultType={quickAddType} />
        }
      </AnimatePresence>

      <TemplatesManager
          open={showTemplatesManager}
          onClose={() => {
            setShowTemplatesManager(false);
            queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
          }}
          onUseTemplate={handleUseTemplate}
          accounts={allAccounts} />
        
    </div>
    </PullToRefresh>);

}