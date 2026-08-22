import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Snowflake, Repeat } from 'lucide-react';

// ============================================================
// SafeDailyLimit — Безопасный дневной лимит
// ============================================================
// Показывает, сколько можно безопасно потратить сегодня,
// учитывая:
//   1. Остаток бюджетов до конца месяца
//   2. Доступный баланс (баланс - замороженные суммы)
//   3. Предстоящие списания подписок в этом периоде
//
// Итоговое значение = min(бюджетный лимит, балансный лимит)
// где балансный = (доступный баланс - предстоящие подписки) / дни
// ============================================================
export default function SafeDailyLimit({ budgets, accounts, subscriptions, formatCurrency }) {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(1, endOfMonth.getDate() - now.getDate() + 1);

  // --- 1. Бюджетный лимит ---
  const totalLimit = budgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0);
  const budgetRemaining = Math.max(0, totalLimit - totalSpent);
  const budgetDaily = budgetRemaining / daysLeft;
  const usagePercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  // --- 2. Доступный баланс (баланс - замороженные) ---
  const availableBalance = (accounts || []).reduce(
    (sum, a) => sum + Math.max((a.balance || 0) - (a.frozen_amount || 0), 0),
    0
  );
  const frozenTotal = (accounts || []).reduce(
    (sum, a) => sum + (a.frozen_amount || 0),
    0
  );

  // --- 3. Предстоящие списания подписок до конца месяца ---
  const upcomingSubs = (subscriptions || [])
    .filter((s) => s.is_active && !s.cancelled && s.next_charge_date)
    .filter((s) => {
      const d = new Date(s.next_charge_date);
      return d >= now && d <= endOfMonth;
    })
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // Балансный дневной лимит
  const balanceAfterSubs = Math.max(0, availableBalance - upcomingSubs);
  const balanceDaily = balanceAfterSubs / daysLeft;

  // Если нет бюджетов — используем только баланс
  const hasBudgets = totalLimit > 0;
  const safeDaily = hasBudgets ? Math.min(budgetDaily, balanceDaily) : balanceDaily;
  const safeSource = hasBudgets && budgetDaily <= balanceDaily ? 'budget' : 'balance';

  if (!hasBudgets && availableBalance === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="rounded-2xl border border-border bg-card shadow-sm p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Wallet className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <span className="text-muted-foreground text-xs">Безопасно потратить сегодня</span>
      </div>
      <p className="text-amber-500 font-bold text-lg">{formatCurrency(safeDaily)}</p>

      {/* Details */}
      <div className="mt-3 space-y-1.5">
        {hasBudgets && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>По бюджету</span>
            <span className="text-foreground font-medium">{formatCurrency(budgetDaily)}</span>
          </div>
        )}
        {availableBalance > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>По балансу</span>
            <span className="text-foreground font-medium">{formatCurrency(balanceDaily)}</span>
          </div>
        )}
        {upcomingSubs > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              Подписки до конца месяца
            </span>
            <span className="text-rose-500 font-medium">−{formatCurrency(upcomingSubs)}</span>
          </div>
        )}
        {frozenTotal > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Snowflake className="w-3 h-3" />
              Заморожено
            </span>
            <span className="text-blue-500 font-medium">−{formatCurrency(frozenTotal)}</span>
          </div>
        )}
      </div>

      {/* Progress bar (budget) */}
      {hasBudgets && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Потрачено {Math.round(usagePercent)}%</span>
            <span>Осталось {daysLeft} дн.</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                backgroundColor: usagePercent > 90 ? '#f87171' : usagePercent > 70 ? '#fbbf24' : '#34d399'
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}