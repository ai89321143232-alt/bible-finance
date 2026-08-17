import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
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

export default function DebtPlanner() {
  const queryClient = useQueryClient();
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

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DebtAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['debtAccounts']);
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DebtAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['debtAccounts']);
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

  const handleSave = (data) => {
    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, data });
    } else {
      createMutation.mutate(data);
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
    low: 'Низкая нагрузка',
    moderate: 'Умеренная нагрузка',
    high: 'Высокая нагрузка',
    critical: 'Критическая нагрузка!',
    unknown: 'Укажите доход',
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">План выхода из долгов</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Стратегия погашения кредитов с учётом российских условий
          </p>
        </motion.div>

        {activeDebts.length === 0 ? (
          /* Empty State */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-foreground text-lg font-semibold mb-2">Долгов нет</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Добавьте свои кредиты, кредитные карты и займы, чтобы составить персональный план погашения
            </p>
            <Button onClick={() => { setEditingDebt(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Добавить долг
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-rose-500" />
                  <span className="text-muted-foreground text-xs">Общий долг</span>
                </div>
                <p className="text-rose-500 font-bold text-lg sm:text-xl">{formatDebtCurrency(totalDebt)}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{activeDebts.length} кредитов</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="text-muted-foreground text-xs">Платежей / мес.</span>
                </div>
                <p className="text-amber-500 font-bold text-lg sm:text-xl">{formatDebtCurrency(totalMonthly)}</p>
                <p className="text-muted-foreground text-xs mt-0.5">минимально</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-muted-foreground text-xs">Переплата</span>
                </div>
                <p className="text-orange-500 font-bold text-lg sm:text-xl">{formatDebtCurrency(totalOverpayment)}</p>
                <p className="text-muted-foreground text-xs mt-0.5">проценты банкам</p>
              </div>

              <div className={`rounded-2xl border p-4 ${burdenColors[burden.level]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs">Нагрузка</span>
                </div>
                <p className="font-bold text-lg sm:text-xl">{burden.ratio.toFixed(0)}%</p>
                <p className="text-xs mt-0.5">{burdenLabels[burden.level]}</p>
              </div>
            </div>

            {/* Strategy Selector */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Стратегия погашения</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setStrategy('avalanche')}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    strategy === 'avalanche'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}>
                  <TrendingDown className={`w-5 h-5 mb-2 ${strategy === 'avalanche' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-foreground text-sm">Лавина</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Сначала долг с высокой ставкой</p>
                </button>

                <button
                  onClick={() => setStrategy('snowball')}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    strategy === 'snowball'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}>
                  <Snowflake className={`w-5 h-5 mb-2 ${strategy === 'snowball' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-foreground text-sm">Снежный ком</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Сначала маленький долг</p>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Доп. платёж ₽/мес.</Label>
                  <Input
                    type="number"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value)}
                    placeholder="5000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Сверху минимальных платежей</p>
                </div>
                <div>
                  <Label className="text-xs">Доход ₽/мес.</Label>
                  <Input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="80000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Для расчёта нагрузки</p>
                </div>
              </div>
            </div>

            {/* Payoff Chart */}
            {simulation && (
              <div className="mb-6">
                <DebtPayoffChart simulation={simulation} />
              </div>
            )}

            {/* Strategy Comparison */}
            {comparison && (
              <div className="mb-6">
                <StrategyComparison comparison={comparison} />
              </div>
            )}

            {/* Payoff Summary */}
            {simulation && (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 mb-6">
                <h3 className="font-semibold text-foreground mb-3">Итоги плана</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Дата освобождения</p>
                    <p className="font-bold text-foreground text-sm sm:text-base">
                      {format(simulation.summary.payoffDate, 'd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Срок погашения</p>
                    <p className="font-bold text-foreground text-sm sm:text-base">
                      {simulation.summary.monthsToPayoff} мес. ({Math.ceil(simulation.summary.monthsToPayoff / 12)} г.)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Всего заплатите</p>
                    <p className="font-bold text-amber-500 text-sm sm:text-base">
                      {formatDebtCurrency(simulation.summary.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Из них проценты</p>
                    <p className="font-bold text-orange-500 text-sm sm:text-base">
                      {formatDebtCurrency(simulation.summary.totalInterest)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Debt List */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Мои долги</h3>
                <Button size="sm" onClick={() => { setEditingDebt(null); setShowForm(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Добавить
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
              <AlertDialogTitle>Удалить долг?</AlertDialogTitle>
              <AlertDialogDescription>
                Долг «{deleteTarget?.name}» будет удалён без возможности восстановления.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}