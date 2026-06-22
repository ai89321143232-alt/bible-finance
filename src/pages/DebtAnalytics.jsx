import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, subMonths
} from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  TrendingDown, TrendingUp, AlertTriangle, CreditCard, Calendar,
  Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, ChevronDown
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

const MONTHS_BACK = 12;

export default function DebtAnalytics() {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 1000),
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0
  }).format(amount);

  // Identify debt accounts: credit type or negative balance
  const debtAccounts = useMemo(() => 
    accounts.filter(a => a.type === 'credit' || (a.balance || 0) < 0),
    [accounts]
  );

  const totalCurrentDebt = useMemo(() =>
    debtAccounts.reduce((sum, a) => sum + Math.abs(Math.min(a.balance || 0, 0)), 0),
    [debtAccounts]
  );

  // Monthly data: debt level, income, debt payments
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      // Transactions in this month
      const monthTxns = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });

      const income = monthTxns
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);

      // Debt payments: expenses on credit accounts + transfers TO credit accounts (paying off)
      const debtAccountIds = debtAccounts.map(a => a.id);
      const debtPayments = monthTxns
        .filter(t => {
          if (t.type === 'expense' && debtAccountIds.includes(t.account_id)) return true;
          // Transfer TO a credit account = paying off debt
          if (t.type === 'transfer' && debtAccountIds.includes(t.account_id)) return true;
          return false;
        })
        .reduce((s, t) => s + t.amount, 0);

      // Also count income transactions ON credit accounts (refunds, cashback reducing debt)
      const debtReductions = monthTxns
        .filter(t => t.type === 'income' && debtAccountIds.includes(t.account_id))
        .reduce((s, t) => s + t.amount, 0);

      // Total debt change this month (new debt - paid off)
      const newDebtAdded = monthTxns
        .filter(t => t.type === 'expense' && debtAccountIds.includes(t.account_id))
        .reduce((s, t) => s + t.amount, 0);
      
      const debtPaidOff = debtPayments + debtReductions - newDebtAdded >= 0 
        ? debtPayments + debtReductions 
        : newDebtAdded;

      // Estimate debt level at end of this month
      // Start from current debt and work backwards
      months.push({
        month: format(monthDate, 'MMM yy', { locale: ru }),
        fullMonth: format(monthDate, 'LLLL yyyy', { locale: ru }),
        income,
        debtPayments: debtPayments + debtReductions,
        newDebtAdded,
        label: format(monthDate, 'MMM', { locale: ru }),
      });
    }

    return months;
  }, [transactions, debtAccounts]);

  // Calculate debt progression (backward from current)
  const debtProgression = useMemo(() => {
    let runningDebt = totalCurrentDebt;
    const result = [];
    // Go backwards through months to reconstruct debt levels
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      const m = monthlyData[i];
      const netChange = m.newDebtAdded - m.debtPayments;
      // At start of this month, debt was runningDebt - netChange
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

  if (debtAccounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <PiggyBank className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Долгов нет</h2>
          <p className="text-white/40 text-sm mb-6">
            У вас нет кредитных счетов или счетов с отрицательным балансом. Отличная работа!
          </p>
          <Link to={createPageUrl('Accounts')} className="text-emerald-400 text-sm hover:underline">
            Перейти к счетам →
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Анализ долгов</h1>
          <p className="text-white/35 text-sm mt-0.5">
            Отслеживание задолженности и платежей по кредитам
          </p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-rose-400" />
              <span className="text-white/40 text-xs">Общий долг</span>
            </div>
            <p className="text-rose-400 font-bold text-xl">{formatCurrency(totalCurrentDebt)}</p>
            <p className="text-white/25 text-xs mt-0.5">{debtAccounts.length} счетов</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-white/40 text-xs">Платежи в этом мес.</span>
            </div>
            <p className="text-amber-400 font-bold text-xl">{formatCurrency(totalPaymentsThisMonth)}</p>
            <p className="text-white/25 text-xs mt-0.5">{ratioThisMonth.toFixed(1)}% от дохода</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className={`rounded-2xl border p-4 ${debtTrend === 'down' ? 'border-emerald-500/15 bg-emerald-500/5' : debtTrend === 'up' ? 'border-rose-500/15 bg-rose-500/5' : 'border-white/5 bg-white/3'}`}>
            <div className="flex items-center gap-2 mb-2">
              {debtTrend === 'down' ? <TrendingDown className="w-4 h-4 text-emerald-400" /> : <TrendingUp className="w-4 h-4 text-rose-400" />}
              <span className="text-white/40 text-xs">Тренд за год</span>
            </div>
            <p className={`font-bold text-xl ${debtTrend === 'down' ? 'text-emerald-400' : debtTrend === 'up' ? 'text-rose-400' : 'text-white/40'}`}>
              {debtTrend === 'down' ? 'Снижается' : debtTrend === 'up' ? 'Растёт' : 'Стабильно'}
            </p>
            <p className="text-white/25 text-xs mt-0.5">за {MONTHS_BACK} месяцев</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-violet-400" />
              <span className="text-white/40 text-xs">Долг/Доход в сред.</span>
            </div>
            <p className="text-violet-400 font-bold text-xl">{avgRatio.toFixed(1)}%</p>
            <p className="text-white/25 text-xs mt-0.5">{avgRatio > 30 ? 'Высокая нагрузка' : avgRatio > 15 ? 'Умеренно' : 'Низкая'}</p>
          </motion.div>
        </div>

        {/* Debt Level Chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/8 bg-[#141820] p-5 sm:p-6 mb-6">
          <h3 className="text-white font-semibold mb-1">Динамика задолженности</h3>
          <p className="text-white/35 text-xs mb-5">Изменение общего долга за последние 12 месяцев</p>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={debtProgression}>
                <defs>
                  <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1f2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  formatter={(value) => [formatCurrency(value), 'Долг']}
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
          className="rounded-2xl border border-white/8 bg-[#141820] p-5 sm:p-6 mb-6">
          <h3 className="text-white font-semibold mb-1">Нагрузка на доход</h3>
          <p className="text-white/35 text-xs mb-5">Какой % дохода уходит на выплату долгов каждый месяц</p>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={debtToIncomeRatio}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} />
                <YAxis 
                  yAxisId="left" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis 
                  yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1f2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  formatter={(value, name) => {
                    if (name === 'ratio') return [`${value.toFixed(1)}%`, 'Доля от дохода'];
                    if (name === 'income') return [formatCurrency(value), 'Доход'];
                    if (name === 'debtPayments') return [formatCurrency(value), 'Платежи'];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullMonth || label}
                />
                <Legend formatter={(v) => {
                  if (v === 'ratio') return '% от дохода';
                  if (v === 'income') return 'Доход';
                  if (v === 'debtPayments') return 'Платежи по долгам';
                  return v;
                }} />
                <Bar yAxisId="right" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={10} opacity={0.6} />
                <Bar yAxisId="right" dataKey="debtPayments" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={10} />
                <Line yAxisId="left" type="monotone" dataKey="ratio" stroke="#8b5cf6" strokeWidth={2.5}
                  dot={{ fill: '#8b5cf6', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-white/35 justify-center flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/60" /> Доход</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" /> Платежи</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-500" style={{ height: 2 }} /> % от дохода</span>
          </div>
        </motion.div>

        {/* Credit Accounts List */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/8 bg-[#141820] p-5 sm:p-6 mb-6">
          <h3 className="text-white font-semibold mb-1">Кредитные счета</h3>
          <p className="text-white/35 text-xs mb-4">Детализация по каждому счёту</p>
          <div className="space-y-2">
            {debtAccounts.map(acc => {
              const debt = Math.abs(Math.min(acc.balance || 0, 0));
              const limit = acc.credit_limit || 0;
              const utilization = limit > 0 ? (debt / limit) * 100 : 0;
              return (
                <div key={acc.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: (acc.color || '#ef4444') + '20', color: acc.color || '#ef4444' }}>
                    {acc.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{acc.name}</p>
                    <p className="text-white/30 text-xs">
                      {acc.type === 'credit' ? 'Кредитная карта' : 'Отрицательный баланс'}
                      {limit > 0 && <span className="ml-2">· Лимит {formatCurrency(limit)}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-400 font-semibold text-sm">{formatCurrency(-debt)}</p>
                    {utilization > 0 && (
                      <p className={`text-xs font-medium ${utilization > 80 ? 'text-rose-400' : utilization > 50 ? 'text-amber-400' : 'text-white/30'}`}>
                        {utilization.toFixed(0)}% использ.
                      </p>
                    )}
                    {acc.balance > 0 && acc.type === 'credit' && (
                      <p className="text-emerald-400 text-xs">Переплата</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Monthly Breakdown Table */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/8 bg-[#141820] overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-white/5">
            <h3 className="text-white font-semibold">Помесячная детализация</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-white/35 text-xs font-medium">Месяц</th>
                  <th className="text-right px-5 py-3 text-white/35 text-xs font-medium">Доход</th>
                  <th className="text-right px-5 py-3 text-white/35 text-xs font-medium">Платежи</th>
                  <th className="text-right px-5 py-3 text-white/35 text-xs font-medium">Новые долги</th>
                  <th className="text-right px-5 py-3 text-white/35 text-xs font-medium">% от дохода</th>
                </tr>
              </thead>
              <tbody>
                {[...debtToIncomeRatio].reverse().map((m, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-white/70 text-sm">{m.fullMonth}</td>
                    <td className="px-5 py-3 text-right text-emerald-400 text-sm font-medium">{formatCurrency(m.income)}</td>
                    <td className="px-5 py-3 text-right text-amber-400 text-sm font-medium">{formatCurrency(m.debtPayments)}</td>
                    <td className="px-5 py-3 text-right text-rose-400 text-sm font-medium">{formatCurrency(m.newDebtAdded)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-sm font-semibold ${m.ratio > 30 ? 'text-rose-400' : m.ratio > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
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