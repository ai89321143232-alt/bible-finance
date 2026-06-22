import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { startOfMonth, endOfMonth, getDaysInMonth, getDate, subMonths } from 'date-fns';

export default function MonthForecast({ transactions, totalBalance, formatCurrency }) {
  const forecast = useMemo(() => {
    const now = new Date();
    const todayDay = getDate(now);
    const daysInMonth = getDaysInMonth(now);
    const daysLeft = daysInMonth - todayDay;

    // Current month so far
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const incomeThisMonth = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenseThisMonth = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Average daily rates based on past 3 months
    const past3months = [1, 2, 3].flatMap(offset => {
      const s = startOfMonth(subMonths(now, offset));
      const e = endOfMonth(subMonths(now, offset));
      return transactions.filter(t => {
        const d = new Date(t.date);
        return d >= s && d <= e;
      });
    });

    const past3Income = past3months.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const past3Expenses = past3months.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const avgDailyIncome = past3months.length > 0 ? past3Income / 90 : 0;
    const avgDailyExpense = past3months.length > 0 ? past3Expenses / 90 : 0;

    // Forecast remaining days
    const forecastedIncome = incomeThisMonth + avgDailyIncome * daysLeft;
    const forecastedExpenses = expenseThisMonth + avgDailyExpense * daysLeft;
    const forecastedBalance = totalBalance + (avgDailyIncome - avgDailyExpense) * daysLeft;
    const netFlow = forecastedIncome - forecastedExpenses;

    return {
      forecastedBalance,
      forecastedIncome,
      forecastedExpenses,
      netFlow,
      daysLeft,
      avgDailyIncome,
      avgDailyExpense,
      hasPastData: past3months.length > 0,
    };
  }, [transactions, totalBalance]);

  const isPositive = forecast.netFlow >= 0;
  const isNeutral = Math.abs(forecast.netFlow) < 100;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const accentColor = isNeutral ? 'text-white/50' : isPositive ? 'text-emerald-400' : 'text-rose-400';
  const borderColor = isNeutral ? 'border-white/8' : isPositive ? 'border-emerald-500/20' : 'border-rose-500/20';
  const bgColor = isNeutral ? 'bg-white/3' : isPositive ? 'bg-emerald-500/5' : 'bg-rose-500/5';
  const iconBg = isNeutral ? 'bg-white/8' : isPositive ? 'bg-emerald-500/15' : 'bg-rose-500/15';

  if (!forecast.hasPastData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      className={`rounded-2xl border ${borderColor} ${bgColor} p-4 mb-6`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${accentColor}`} />
        </div>
        <span className="text-white/50 text-xs font-medium">Прогноз на конец месяца</span>
        <span className="text-white/20 text-xs ml-auto">осталось {forecast.daysLeft} дн.</span>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-white/30 text-xs mb-0.5">Ожидаемый баланс</p>
          <p className={`text-2xl font-bold ${forecast.forecastedBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {formatCurrency(forecast.forecastedBalance)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-xs mb-0.5">Чистый поток</p>
          <p className={`text-sm font-semibold ${accentColor}`}>
            {forecast.netFlow >= 0 ? '+' : ''}{formatCurrency(forecast.netFlow)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-xl px-3 py-2">
          <p className="text-white/30 text-xs mb-0.5">Доходы</p>
          <p className="text-emerald-400 text-sm font-semibold">{formatCurrency(forecast.forecastedIncome)}</p>
          <p className="text-white/20 text-xs">≈ {formatCurrency(forecast.avgDailyIncome)}/день</p>
        </div>
        <div className="bg-white/5 rounded-xl px-3 py-2">
          <p className="text-white/30 text-xs mb-0.5">Расходы</p>
          <p className="text-rose-400 text-sm font-semibold">{formatCurrency(forecast.forecastedExpenses)}</p>
          <p className="text-white/20 text-xs">≈ {formatCurrency(forecast.avgDailyExpense)}/день</p>
        </div>
      </div>
      <p className="text-white/20 text-xs mt-2 text-center">На основе среднего за последние 3 месяца</p>
    </motion.div>
  );
}