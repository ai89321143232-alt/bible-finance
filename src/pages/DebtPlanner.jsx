import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale';
import {
  Plus, TrendingDown, Snowflake, Wallet, Calendar, AlertTriangle,
  Loader2, PiggyBank
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

export default function DebtPlanner() {
  const queryClient = useQueryClient();
  const t = useTranslation();
  const formatCurrency = useFormatCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [strategy, setStrategy] = useState('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debtAccounts'],
    queryFn: () => base44.entities.DebtAccount.list(),
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

  const activeDebts = debts.filter(d => d.status !== 'paid_off' && d.remaining_amount > 0);

  // Расчёт симуляции погашения
  const simulation = useMemo(() => {
    if (activeDebts.length === 0) return null;
    return simulatePayoff(activeDebts, Number(extraPayment) || 0, strategy);
  }, [activeDebts, extraPayment, strategy]);

  // Сравнение стратегий
  const comparison = useMemo(() => {
    if (activeDebts.length === 0) return null;
    return compareStrategies(activeDebts, Number(extraPayment) || 0);
  }, [activeDebts, extraPayment]);

  // Оценка долговой нагрузки
  const burden = useMemo(() => {
    const totalPayments = activeDebts.reduce((s, d) => s + (d.monthly_payment || 0), 0);
    return assessDebtBurden(totalPayments, Number(monthlyIncome) || 0);
  }, [activeDebts, monthlyIncome]);

  const totalDebt = activeDebts.reduce((s, d) => s + (d.remaining_amount || 0), 0);
  const totalMonthly = activeDebts.reduce((s, d) => s + (d.monthly_payment || 0), 0);
  const totalOverpayment = simulation?.summary?.totalInterest || 0;

  // Основная валюта — от первого долга
  const primaryCurrency = activeDebts[0]?.currency || 'RUB';
  const fmt = (amount) => formatDebtCurrency(amount, primaryCurrency);
  const dateLocale = ruLocale;

  const handleSave = async (data) => {
    if (editingDebt) {
      await updateMutation.mutateAsync({ id: editingDebt.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const burdenColors = {
    low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    moderate: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    critical: 'text-red-500 bg-red-500/10 border-red-500/20',
    unknown: 'text-muted-foreground bg-muted',
  };

  const burdenLabels = {
    low: t('debt.burden_low'),
    moderate: t('debt.burden_moderate'),
    high: t('debt.burden_high'),
    critical: t('debt.burden_critical'),
    unknown: t('debt.burden_unknown'),
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('debt.planner_title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t('debt.planner_subtitle')}
          </p>
        </motion.div>

        {activeDebts.length === 0 ? (
          /* Empty State */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-foreground text-lg font-semibold mb-2">{t('debt.no_debts')}</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              {t('debt.no_debts_desc')}
            </p>
            <Button onClick={() => { setEditingDebt(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> {t('debt.add_debt')}
            </Button>
          </motion.div>
        ) : (
          <>
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
                  className={`rounded-xl border p-4 text-left transition-all ${
                    strategy === 'avalanche'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}>
                  <TrendingDown className={`w-5 h-5 mb-2 ${strategy === 'avalanche' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-foreground text-sm">{t('debt.strategy_avalanche')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('debt.strategy_avalanche_desc')}</p>
                </button>

                <button
                  onClick={() => setStrategy('snowball')}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    strategy === 'snowball'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}>
                  <Snowflake className={`w-5 h-5 mb-2 ${strategy === 'snowball' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-foreground text-sm">{t('debt.strategy_snowball')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('debt.strategy_snowball_desc')}</p>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t('debt.extra_payment')}</Label>
                  <Input
                    type="number"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value)}
                    placeholder="5000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('debt.extra_payment_hint')}</p>
                </div>
                <div>
                  <Label className="text-xs">{t('debt.monthly_income')}</Label>
                  <Input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="80000"
                  />
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
                    <p className="font-bold text-amber-500 text-sm sm:text-base">
                      {fmt(simulation.summary.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('debt.interest_part')}</p>
                    <p className="font-bold text-orange-500 text-sm sm:text-base">
                      {fmt(simulation.summary.totalInterest)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Debt List */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">{t('debt.my_debts')}</h3>
                <Button size="sm" onClick={() => { setEditingDebt(null); setShowForm(true); }}>
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
                        onEdit={(d) => { setEditingDebt(d); setShowForm(true); }}
                        onDelete={(d) => setDeleteTarget(d)}
                      />
                    ))}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}

        {/* Debt Form Dialog */}
        <DebtForm
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
    </div>
  );
}