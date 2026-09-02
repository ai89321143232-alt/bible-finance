import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale';
import {
  Plus, TrendingDown, Snowflake, Wallet, Calendar, AlertTriangle,
  Loader2, PiggyBank, CreditCard, BarChart3, ListTodo, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  simulatePayoff, compareStrategies, formatDebtCurrency, assessDebtBurden
} from '@/services/DebtService';
import DebtForm from '@/components/debts/DebtForm';
import DebtCard from '@/components/debts/DebtCard';
import DebtPayoffChart from '@/components/debts/DebtPayoffChart';
import StrategyComparison from '@/components/debts/StrategyComparison';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useTranslation } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';

const MONTHS_BACK = 12;

const TABS = [
  { key: 'overview', labelKey: 'debts.tab_overview', icon: ListTodo },
  { key: 'plan', labelKey: 'debts.tab_plan', icon: TrendingDown },
  { key: 'analytics', labelKey: 'debts.tab_analytics', icon: BarChart3 },
];

export default function Debts({ initialTab }) {
  const queryClient = useQueryClient();
  const t = useTranslation();
  const formatCurrency = useFormatCurrency();
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [strategy, setStrategy] = useState('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debtAccounts'],
    queryFn: () => base44.entities.DebtAccount.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DebtAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['debtAccounts']);
      queryClient.invalidateQueries(['accounts']);
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DebtAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['debtAccounts']);
      queryClient.invalidateQueries(['accounts']);
      setShowForm(false);
      setEditingDebt(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DebtAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['debtAccounts']);
      setDeleteTarget(null);
    },
  });

  const activeDebts = useMemo(() =>
    debts.filter(d => d.status !== 'paid_off' && d.remaining_amount > 0),
    [debts]
  );

  // Кредитные счета без привязанного долга
  const unlinkedCreditAccounts = useMemo(() =>
    accounts.filter(a =>
      a.type === 'credit' &&
      !debts.some(d => d.linked_account_id === a.id)
    ),
    [accounts, debts]
  );

  const primaryCurrency = activeDebts[0]?.currency || 'RUB';
  const fmt = (amount) => formatDebtCurrency(amount, primaryCurrency);
  const dateLocale = ruLocale;

  // --- Симуляция погашения ---
  const simulation = useMemo(() => {
    if (activeDebts.length === 0) return null;
    return simulatePayoff(activeDebts, Number(extraPayment) || 0, strategy);
  }, [activeDebts, extraPayment, strategy]);

  const comparison = useMemo(() => {
    if (activeDebts.length === 0) return null;
    return compareStrategies(activeDebts, Number(extraPayment) || 0);
  }, [activeDebts, extraPayment]);

  const burden = useMemo(() => {
    const totalPayments = activeDebts.reduce((s, d) => s + (d.monthly_payment || 0), 0);
    return assessDebtBurden(totalPayments, Number(monthlyIncome) || 0);
  }, [activeDebts, monthlyIncome]);

  const totalDebt = activeDebts.reduce((s, d) => s + (d.remaining_amount || 0), 0);
  const totalMonthly = activeDebts.reduce((s, d) => s + (d.monthly_payment || 0), 0);
  const totalOverpayment = simulation?.summary?.totalInterest || 0;

  // --- Аналитика (из DebtAnalytics) ---
  const linkedAccountIds = useMemo(() =>
    activeDebts.map(d => d.linked_account_id).filter(Boolean),
    [activeDebts]
  );

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthTxns = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });
      const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const debtPayments = monthTxns
        .filter(t => {
          if (t.type === 'expense' && linkedAccountIds.includes(t.account_id)) return true;
          if (t.type === 'transfer' && linkedAccountIds.includes(t.to_account_id)) return true;
          return false;
        })
        .reduce((s, t) => s + t.amount, 0);
      const newDebtAdded = monthTxns
        .filter(t => t.type === 'expense' && linkedAccountIds.includes(t.account_id))
        .reduce((s, t) => s + t.amount, 0);
      months.push({
        month: format(monthDate, 'MMM yy', { locale: dateLocale }),
        fullMonth: format(monthDate, 'LLLL yyyy', { locale: dateLocale }),
        income, debtPayments, newDebtAdded,
        label: format(monthDate, 'MMM', { locale: dateLocale }),
      });
    }
    return months;
  }, [transactions, linkedAccountIds, dateLocale]);

  const debtProgression = useMemo(() => {
    let runningDebt = totalDebt;
    const result = [];
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      const m = monthlyData[i];
      const netChange = m.newDebtAdded - m.debtPayments;
      const debtAtStart = Math.max(0, runningDebt - netChange);
      result.unshift({ ...m, debtLevel: runningDebt, debtStart: debtAtStart });
      runningDebt = debtAtStart;
    }
    return result;
  }, [monthlyData, totalDebt]);

  const debtToIncomeRatio = useMemo(() =>
    monthlyData.map(m => ({ ...m, ratio: m.income > 0 ? (m.debtPayments / m.income) * 100 : 0 })),
    [monthlyData]
  );

  const avgRatio = useMemo(() => {
    const valid = debtToIncomeRatio.filter(m => m.income > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((s, m) => s + m.ratio, 0) / valid.length;
  }, [debtToIncomeRatio]);

  const totalPaymentsThisMonth = debtToIncomeRatio[debtToIncomeRatio.length - 1]?.debtPayments || 0;
  const ratioThisMonth = debtToIncomeRatio[debtToIncomeRatio.length - 1]?.ratio || 0;

  const debtTrend = useMemo(() => {
    if (debtProgression.length < 2) return 'stable';
    const first = debtProgression[0]?.debtLevel || 0;
    const last = debtProgression[debtProgression.length - 1]?.debtLevel || 0;
    if (last < first * 0.95) return 'down';
    if (last > first * 1.05) return 'up';
    return 'stable';
  }, [debtProgression]);

  const burdenColors = {
    low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    moderate: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    critical: 'text-red-500 bg-red-500/10 border-red-500/20',
    unknown: 'text-muted-foreground bg-muted',
  };
  const burdenLabels = {
    low: t('debt.burden_low'), moderate: t('debt.burden_moderate'),
    high: t('debt.burden_high'), critical: t('debt.burden_critical'),
    unknown: t('debt.burden_unknown'),
  };

  const handleSave = async (data) => {
    if (editingDebt) {
      await updateMutation.mutateAsync({ id: editingDebt.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('debts.title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('debts.subtitle')}</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted border border-border rounded-xl w-fit mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                activeDebts={activeDebts}
                unlinkedCreditAccounts={unlinkedCreditAccounts}
                totalDebt={totalDebt}
                totalMonthly={totalMonthly}
                primaryCurrency={primaryCurrency}
                fmt={fmt}
                formatCurrency={formatCurrency}
                strategy={strategy}
                onEdit={(d) => { setEditingDebt(d); setShowForm(true); }}
                onDelete={(d) => setDeleteTarget(d)}
                onAdd={() => { setEditingDebt(null); setShowForm(true); }}
                t={t}
              />
            )}

            {activeTab === 'plan' && (
              <PlanTab
                activeDebts={activeDebts}
                strategy={strategy}
                setStrategy={setStrategy}
                extraPayment={extraPayment}
                setExtraPayment={setExtraPayment}
                monthlyIncome={monthlyIncome}
                setMonthlyIncome={setMonthlyIncome}
                simulation={simulation}
                comparison={comparison}
                burden={burden}
                burdenColors={burdenColors}
                burdenLabels={burdenLabels}
                totalDebt={totalDebt}
                totalMonthly={totalMonthly}
                totalOverpayment={totalOverpayment}
                primaryCurrency={primaryCurrency}
                fmt={fmt}
                dateLocale={dateLocale}
                onEdit={(d) => { setEditingDebt(d); setShowForm(true); }}
                onDelete={(d) => setDeleteTarget(d)}
                onAdd={() => { setEditingDebt(null); setShowForm(true); }}
                t={t}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab
                activeDebts={activeDebts}
                accounts={accounts}
                transactions={transactions}
                linkedAccountIds={linkedAccountIds}
                totalCurrentDebt={totalDebt}
                monthlyData={monthlyData}
                debtProgression={debtProgression}
                debtToIncomeRatio={debtToIncomeRatio}
                avgRatio={avgRatio}
                totalPaymentsThisMonth={totalPaymentsThisMonth}
                ratioThisMonth={ratioThisMonth}
                debtTrend={debtTrend}
                primaryCurrency={primaryCurrency}
                formatCurrency={formatCurrency}
                dateLocale={dateLocale}
                t={t}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Debt Form */}
      <DebtForm
        key={editingDebt?.id || 'new'}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingDebt(null); }}
        onSave={handleSave}
        initialData={editingDebt}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('debt.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('debt.delete_desc').replace('{name}', deleteTarget?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('debt.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Вкладка: Обзор
// ============================================================
function OverviewTab({ activeDebts, unlinkedCreditAccounts, totalDebt, totalMonthly, primaryCurrency, fmt, formatCurrency, strategy, onEdit, onDelete, onAdd, t }) {
  if (activeDebts.length === 0 && unlinkedCreditAccounts.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <PiggyBank className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-foreground text-lg font-semibold mb-2">{t('debt.no_debts')}</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">{t('debt.no_debts_desc')}</p>
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-1" /> {t('debt.add_debt')}</Button>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-rose-500" />
            <span className="text-muted-foreground text-xs">{t('debt.total_debt')}</span>
          </div>
          <p className="text-rose-500 font-bold text-lg sm:text-xl">{fmt(totalDebt)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{activeDebts.length} {t('debt.credits_count')}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground text-xs">{t('debt.payments_per_month')}</span>
          </div>
          <p className="text-amber-500 font-bold text-lg sm:text-xl">{fmt(totalMonthly)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{t('debt.minimally')}</p>
        </div>
      </div>

      {/* Unlinked credit accounts warning */}
      {unlinkedCreditAccounts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-foreground text-sm font-medium">{t('debts.unlinked_accounts')}</span>
          </div>
          <p className="text-muted-foreground text-xs mb-3">{t('debts.unlinked_desc')}</p>
          <div className="space-y-2">
            {unlinkedCreditAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground text-sm">{acc.name}</span>
                </div>
                <span className="text-rose-500 text-sm font-medium">
                  {formatCurrency(Math.abs(Math.min(acc.balance || 0, 0)), acc.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debt List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">{t('debt.my_debts')}</h3>
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" /> {t('debt.add')}
          </Button>
        </div>
        <div className="space-y-3">
          <AnimatePresence>
            {activeDebts
              .sort((a, b) => {
                if (strategy === 'snowball') return (a.remaining_amount || 0) - (b.remaining_amount || 0);
                return (b.interest_rate || 0) - (a.interest_rate || 0);
              })
              .map((debt, index) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  order={index}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Вкладка: План
// ============================================================
function PlanTab({ activeDebts, strategy, setStrategy, extraPayment, setExtraPayment, monthlyIncome, setMonthlyIncome, simulation, comparison, burden, burdenColors, burdenLabels, totalDebt, totalMonthly, totalOverpayment, primaryCurrency, fmt, dateLocale, onEdit, onDelete, onAdd, t }) {
  if (activeDebts.length === 0) {
    return (
      <div className="text-center py-16">
        <PiggyBank className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">{t('debt.no_debts_desc')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-rose-500" />
            <span className="text-muted-foreground text-xs">{t('debt.total_debt')}</span>
          </div>
          <p className="text-rose-500 font-bold text-lg sm:text-xl">{fmt(totalDebt)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{activeDebts.length} {t('debt.credits_count')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground text-xs">{t('debt.payments_per_month')}</span>
          </div>
          <p className="text-amber-500 font-bold text-lg sm:text-xl">{fmt(totalMonthly)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{t('debt.minimally')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-muted-foreground text-xs">{t('debt.overpayment')}</span>
          </div>
          <p className="text-orange-500 font-bold text-lg sm:text-xl">{fmt(totalOverpayment)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{t('debt.interest_to_banks')}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${burdenColors[burden.level]}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">{t('debt.burden')}</span>
          </div>
          <p className="font-bold text-lg sm:text-xl">{burden.ratio.toFixed(0)}%</p>
          <p className="text-xs mt-0.5">{burdenLabels[burden.level]}</p>
        </div>
      </div>

      {/* Strategy Selector */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 mb-6">
        <h3 className="font-semibold text-foreground mb-3">{t('debt.strategy_title')}</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setStrategy('avalanche')}
            className={`rounded-xl border p-4 text-left transition-all ${strategy === 'avalanche' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border bg-muted/30 hover:bg-muted/50'}`}>
            <TrendingDown className={`w-5 h-5 mb-2 ${strategy === 'avalanche' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <p className="font-medium text-foreground text-sm">{t('debt.strategy_avalanche')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('debt.strategy_avalanche_desc')}</p>
          </button>
          <button
            onClick={() => setStrategy('snowball')}
            className={`rounded-xl border p-4 text-left transition-all ${strategy === 'snowball' ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-muted/30 hover:bg-muted/50'}`}>
            <Snowflake className={`w-5 h-5 mb-2 ${strategy === 'snowball' ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <p className="font-medium text-foreground text-sm">{t('debt.strategy_snowball')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('debt.strategy_snowball_desc')}</p>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{t('debt.extra_payment')}</Label>
            <Input type="number" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} placeholder="5000" />
            <p className="text-xs text-muted-foreground mt-1">{t('debt.extra_payment_hint')}</p>
          </div>
          <div>
            <Label className="text-xs">{t('debt.monthly_income')}</Label>
            <Input type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="80000" />
            <p className="text-xs text-muted-foreground mt-1">{t('debt.income_hint')}</p>
          </div>
        </div>
      </div>

      {/* Payoff Chart */}
      {simulation && (
        <div className="mb-6">
          <DebtPayoffChart simulation={simulation} currency={primaryCurrency} />
        </div>
      )}

      {/* Strategy Comparison */}
      {comparison && (
        <div className="mb-6">
          <StrategyComparison comparison={comparison} currency={primaryCurrency} />
        </div>
      )}

      {/* Payoff Summary */}
      {simulation && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-3">{t('debt.plan_summary')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('debt.payoff_date_label')}</p>
              <p className="font-bold text-foreground text-sm sm:text-base">
                {format(simulation.summary.payoffDate, 'd MMMM yyyy', { locale: dateLocale })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('debt.payoff_term')}</p>
              <p className="font-bold text-foreground text-sm sm:text-base">
                {simulation.summary.monthsToPayoff} {t('debt.analytics_months')} ({Math.ceil(simulation.summary.monthsToPayoff / 12)} {t('debt.analytics_months')})
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('debt.total_will_pay')}</p>
              <p className="font-bold text-amber-500 text-sm sm:text-base">{fmt(simulation.summary.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('debt.interest_part')}</p>
              <p className="font-bold text-orange-500 text-sm sm:text-base">{fmt(simulation.summary.totalInterest)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Debt List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">{t('debt.my_debts')}</h3>
          <Button size="sm" onClick={onAdd}><Plus className="w-4 h-4 mr-1" /> {t('debt.add')}</Button>
        </div>
        <div className="space-y-3">
          <AnimatePresence>
            {activeDebts
              .sort((a, b) => strategy === 'snowball' ? (a.remaining_amount || 0) - (b.remaining_amount || 0) : (b.interest_rate || 0) - (a.interest_rate || 0))
              .map((debt, index) => (
                <DebtCard key={debt.id} debt={debt} order={index} onEdit={onEdit} onDelete={onDelete} />
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Вкладка: Аналитика
// ============================================================
function AnalyticsTab({ activeDebts, accounts, linkedAccountIds, totalCurrentDebt, debtProgression, debtToIncomeRatio, avgRatio, totalPaymentsThisMonth, ratioThisMonth, debtTrend, primaryCurrency, formatCurrency, dateLocale, t }) {
  if (activeDebts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <PiggyBank className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-foreground text-lg font-semibold mb-2">{t('debt.analytics_no_debts')}</h2>
        <p className="text-muted-foreground text-sm">{t('debt.analytics_no_debts_desc')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-rose-500" />
            <span className="text-muted-foreground text-xs">{t('debt.analytics_total_debt')}</span>
          </div>
          <p className="text-rose-500 font-bold text-xl">{formatCurrency(totalCurrentDebt, primaryCurrency)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{activeDebts.length} {t('debt.analytics_accounts')}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground text-xs">{t('debt.analytics_payments_this_month')}</span>
          </div>
          <p className="text-amber-500 font-bold text-xl">{formatCurrency(totalPaymentsThisMonth, primaryCurrency)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{ratioThisMonth.toFixed(1)}% {t('debt.analytics_of_income')}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${debtTrend === 'down' ? 'border-emerald-500/15 bg-emerald-500/5' : debtTrend === 'up' ? 'border-rose-500/15 bg-rose-500/5' : 'border-border bg-muted/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {debtTrend === 'down' ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : <TrendingUp className="w-4 h-4 text-rose-500" />}
            <span className="text-muted-foreground text-xs">{t('debt.analytics_trend_year')}</span>
          </div>
          <p className={`font-bold text-xl ${debtTrend === 'down' ? 'text-emerald-500' : debtTrend === 'up' ? 'text-rose-500' : 'text-muted-foreground'}`}>
            {debtTrend === 'down' ? t('debt.analytics_trend_down') : debtTrend === 'up' ? t('debt.analytics_trend_up') : t('debt.analytics_trend_stable')}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">{MONTHS_BACK} {t('debt.analytics_months')}</p>
        </div>
        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-violet-500" />
            <span className="text-muted-foreground text-xs">{t('debt.analytics_avg_burden')}</span>
          </div>
          <p className="text-violet-500 font-bold text-xl">{avgRatio.toFixed(1)}%</p>
          <p className="text-muted-foreground text-xs mt-0.5">{avgRatio > 30 ? t('debt.analytics_burden_high') : avgRatio > 15 ? t('debt.analytics_burden_moderate') : t('debt.analytics_burden_low')}</p>
        </div>
      </div>

      {/* Credit Accounts List */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-6">
        <h3 className="text-foreground font-semibold mb-1">{t('debt.analytics_credit_accounts')}</h3>
        <p className="text-muted-foreground text-xs mb-4">{t('debt.analytics_credit_accounts_desc')}</p>
        <div className="space-y-2">
          {activeDebts.map(debt => {
            const acc = accounts.find(a => a.id === debt.linked_account_id);
            const limit = acc?.credit_limit || 0;
            const utilization = limit > 0 ? (debt.remaining_amount / limit) * 100 : 0;
            return (
              <div key={debt.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold bg-rose-500/10 text-rose-500">
                  {debt.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium">{debt.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {t(`debt.type_${debt.type}`)}
                    {debt.creditor && ` · ${debt.creditor}`}
                    {limit > 0 && <span className="ml-2">· {t('debt.analytics_limit')} {formatCurrency(limit, debt.currency)}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-rose-500 font-semibold text-sm">{formatCurrency(debt.remaining_amount, debt.currency)}</p>
                  {utilization > 0 && (
                    <p className={`text-xs font-medium ${utilization > 80 ? 'text-rose-500' : utilization > 50 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {utilization.toFixed(0)}% {t('debt.analytics_utilization')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
        <div className="p-5 sm:p-6 border-b border-border">
          <h3 className="text-foreground font-semibold">{t('debt.analytics_monthly_detail')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground text-xs font-medium">{t('debt.analytics_month')}</th>
                <th className="text-right px-5 py-3 text-muted-foreground text-xs font-medium">{t('debt.analytics_income_col')}</th>
                <th className="text-right px-5 py-3 text-muted-foreground text-xs font-medium">{t('debt.analytics_payments_col')}</th>
                <th className="text-right px-5 py-3 text-muted-foreground text-xs font-medium">{t('debt.analytics_new_debts')}</th>
                <th className="text-right px-5 py-3 text-muted-foreground text-xs font-medium">{t('debt.analytics_pct_income')}</th>
              </tr>
            </thead>
            <tbody>
              {[...debtToIncomeRatio].reverse().map((m, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 text-foreground text-sm">{m.fullMonth}</td>
                  <td className="px-5 py-3 text-right text-emerald-500 text-sm font-medium">{formatCurrency(m.income, primaryCurrency)}</td>
                  <td className="px-5 py-3 text-right text-amber-500 text-sm font-medium">{formatCurrency(m.debtPayments, primaryCurrency)}</td>
                  <td className="px-5 py-3 text-right text-rose-500 text-sm font-medium">{formatCurrency(m.newDebtAdded, primaryCurrency)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-sm font-semibold ${m.ratio > 30 ? 'text-rose-500' : m.ratio > 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {m.ratio.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}