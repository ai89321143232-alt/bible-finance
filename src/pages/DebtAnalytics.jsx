import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, subMonths
} from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale';
import {
  TrendingDown, TrendingUp, AlertTriangle, CreditCard, Calendar,
  Wallet, PiggyBank
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useTranslation } from '@/lib/LanguageContext';

const MONTHS_BACK = 12;

export default function DebtAnalytics() {
  const t = useTranslation();
  const formatCurrency = useFormatCurrency();
  const dateLocale = ruLocale;

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debtAccounts'],
    queryFn: () => base44.entities.DebtAccount.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  // Долги читаются из DebtAccount (единый источник правды)
  const activeDebts = useMemo(() =>
    debts.filter(d => d.status !== 'paid_off' && d.remaining_amount > 0),
    [debts]
  );

  const primaryCurrency = activeDebts[0]?.currency || 'RUB';

  // Кредитные счета, привязанные к долгам
  const linkedAccountIds = useMemo(() =>
    activeDebts.map(d => d.linked_account_id).filter(Boolean),
    [activeDebts]
  );

  const linkedAccounts = useMemo(() =>
    accounts.filter(a => linkedAccountIds.includes(a.id)),
    [accounts, linkedAccountIds]
  );

  const totalCurrentDebt = useMemo(() =>
    activeDebts.reduce((s, d) => s + (d.remaining_amount || 0), 0),
    [activeDebts]
  );

  // Monthly data: debt level, income, debt payments
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

      const income = monthTxns
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);

      // Debt payments: transfers TO credit accounts + expenses on credit accounts
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
        income,
        debtPayments,
        newDebtAdded,
        label: format(monthDate, 'MMM', { locale: dateLocale }),
      });
    }

    return months;
  }, [transactions, linkedAccountIds, dateLocale]);

  // Calculate debt progression (backward from current)
  const debtProgression = useMemo(() => {
    let runningDebt = totalCurrentDebt;
    const result = [];
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      const m = monthlyData[i];
      const netChange = m.newDebtAdded - m.debtPayments;
      const debtAtStart = Math.max(0, runningDebt - netChange);
      result.unshift({
        ...m,
        debtLevel: runningDebt,
        debtStart: debtAtStart,
      });
      runningDebt = debtAtStart;
    }
    return result;
  }, [monthlyData, totalCurrentDebt]);

  const debtToIncomeRatio = useMemo(() => {
    return monthlyData.map(m => ({
      ...m,
      ratio: m.income > 0 ? (m.debtPayments / m.income) * 100 : 0,
    }));
  }, [monthlyData]);

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

  if (activeDebts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <PiggyBank className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-foreground text-xl font-semibold mb-2">{t('debt.analytics_no_debts')}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {t('debt.analytics_no_debts_desc')}
          </p>
          <Link to={createPageUrl('Accounts')} className="text-primary text-sm hover:underline">
            {t('debt.analytics_go_accounts')}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{t('debt.analytics_title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {t('debt.analytics_subtitle')}
          </p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-rose-500" />
              <span className="text-muted-foreground text-xs">{t('debt.analytics_total_debt')}</span>
            </div>
            <p className="text-rose-500 font-bold text-xl">{formatCurrency(totalCurrentDebt, primaryCurrency)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{activeDebts.length} {t('debt.analytics_accounts')}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground text-xs">{t('debt.analytics_payments_this_month')}</span>
            </div>
            <p className="text-amber-500 font-bold text-xl">{formatCurrency(totalPaymentsThisMonth, primaryCurrency)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{ratioThisMonth.toFixed(1)}% {t('debt.analytics_of_income')}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className={`rounded-2xl border p-4 ${debtTrend === 'down' ? 'border-emerald-500/15 bg-emerald-500/5' : debtTrend === 'up' ? 'border-rose-500/15 bg-rose-500/5' : 'border-border bg-muted/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {debtTrend === 'down' ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : <TrendingUp className="w-4 h-4 text-rose-500" />}
              <span className="text-muted-foreground text-xs">{t('debt.analytics_trend_year')}</span>
            </div>
            <p className={`font-bold text-xl ${debtTrend === 'down' ? 'text-emerald-500' : debtTrend === 'up' ? 'text-rose-500' : 'text-muted-foreground'}`}>
              {debtTrend === 'down' ? t('debt.analytics_trend_down') : debtTrend === 'up' ? t('debt.analytics_trend_up') : t('debt.analytics_trend_stable')}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">{MONTHS_BACK} {t('debt.analytics_months')}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-violet-500" />
              <span className="text-muted-foreground text-xs">{t('debt.analytics_avg_burden')}</span>
            </div>
            <p className="text-violet-500 font-bold text-xl">{avgRatio.toFixed(1)}%</p>
            <p className="text-muted-foreground text-xs mt-0.5">{avgRatio > 30 ? t('debt.analytics_burden_high') : avgRatio > 15 ? t('debt.analytics_burden_moderate') : t('debt.analytics_burden_low')}</p>
          </motion.div>
        </div>

        {/* Debt Level Chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-6">
          <h3 className="text-foreground font-semibold mb-1">{t('debt.analytics_dynamics')}</h3>
          <p className="text-muted-foreground text-xs mb-5">{t('debt.analytics_dynamics_desc')}</p>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={debtProgression}>
                <defs>
                  <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }}
                  formatter={(value) => [formatCurrency(value, primaryCurrency), t('debt.analytics_debt')]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullMonth || label}
                />
                <Area
                  type="monotone" dataKey="debtLevel" stroke="#f43f5e" strokeWidth={2.5}
                  fill="url(#debtGradient)" dot={{ fill: '#f43f5e', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Debt-to-Income Ratio Chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-6">
          <h3 className="text-foreground font-semibold mb-1">{t('debt.analytics_burden_title')}</h3>
          <p className="text-muted-foreground text-xs mb-5">{t('debt.analytics_burden_desc')}</p>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={debtToIncomeRatio}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                <YAxis
                  yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))' }}
                  formatter={(value, name) => {
                    if (name === 'ratio') return [`${value.toFixed(1)}%`, '%'];
                    if (name === 'income') return [formatCurrency(value, primaryCurrency), t('debt.analytics_income_legend')];
                    if (name === 'debtPayments') return [formatCurrency(value, primaryCurrency), t('debt.analytics_payments_legend')];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullMonth || label}
                />
                <Legend formatter={(v) => {
                  if (v === 'ratio') return '%';
                  if (v === 'income') return t('debt.analytics_income_legend');
                  if (v === 'debtPayments') return t('debt.analytics_payments_legend');
                  return v;
                }} />
                <Bar yAxisId="right" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={10} opacity={0.6} />
                <Bar yAxisId="right" dataKey="debtPayments" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={10} />
                <Line yAxisId="left" type="monotone" dataKey="ratio" stroke="#8b5cf6" strokeWidth={2.5}
                  dot={{ fill: '#8b5cf6', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground justify-center flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/60" /> {t('debt.analytics_income_legend')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('debt.analytics_payments_legend')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-500" style={{ height: 2 }} /> %</span>
          </div>
        </motion.div>

        {/* Credit Accounts List */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-6">
          <h3 className="text-foreground font-semibold mb-1">{t('debt.analytics_credit_accounts')}</h3>
          <p className="text-muted-foreground text-xs mb-4">{t('debt.analytics_credit_accounts_desc')}</p>
          <div className="space-y-2">
            {activeDebts.map(debt => {
              const acc = accounts.find(a => a.id === debt.linked_account_id);
              const limit = acc?.credit_limit || 0;
              const utilization = limit > 0 ? (debt.remaining_amount / limit) * 100 : 0;
              return (
                <div key={debt.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-all">
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
        </motion.div>

        {/* Monthly Breakdown Table */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
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
        </motion.div>
      </div>
    </div>
  );
}