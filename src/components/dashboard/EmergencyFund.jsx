import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// ============================================================
// EmergencyFund — Подушка безопасности
// ============================================================
// Считает, на сколько месяцев хватит текущего баланса
// при текущем уровне месячных расходов.
//
// Формула: общий баланс / средние месячные расходы за последние 3 месяца
// ============================================================
export default function EmergencyFund({ totalBalance, transactions, formatCurrency }) {
  const { t } = useLanguage();
  const now = new Date();

  // Считаем средние месячные расходы за последние 3 месяца
  const monthlyExpenses = [];
  for (let i = 0; i < 3; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const monthTotal = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    if (monthTotal > 0) monthlyExpenses.push(monthTotal);
  }

  const avgMonthly = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((s, v) => s + v, 0) / monthlyExpenses.length
    : 0;

  const months = avgMonthly > 0 ? totalBalance / avgMonthly : 0;
  const monthsDisplay = months >= 100 ? '99+' : months.toFixed(1);

  let statusColor = 'text-rose-500';
  let statusIcon = 'bg-rose-500/15 text-rose-500';
  let message = t('emergency.start_saving');

  if (months >= 6) {
    statusColor = 'text-emerald-500';
    statusIcon = 'bg-emerald-500/15 text-emerald-500';
    message = t('emergency.great_cushion');
  } else if (months >= 3) {
    statusColor = 'text-amber-500';
    statusIcon = 'bg-amber-500/15 text-amber-500';
    message = t('emergency.good_start');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${statusIcon}`}>
          <Shield className="w-3.5 h-3.5" />
        </div>
        <span className="text-muted-foreground text-xs">{t('emergency.title')}</span>
      </div>
      <p className={`${statusColor} font-bold text-lg`}>
        {avgMonthly === 0 ? t('emergency.no_data') : `${monthsDisplay} ${t('emergency.months_short')}`}
      </p>
      {avgMonthly > 0 && (
        <div className="mt-3">
          <p className="text-muted-foreground text-xs">{message}</p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            {t('emergency.spending_month')} ~{formatCurrency(avgMonthly)}/{t('emergency.months_short')} · {t('emergency.balance')} {formatCurrency(totalBalance)}
          </p>
        </div>
      )}
      {avgMonthly === 0 && (
        <p className="text-muted-foreground/70 text-xs mt-3">{t('emergency.add_expenses')}</p>
      )}
    </motion.div>
  );
}