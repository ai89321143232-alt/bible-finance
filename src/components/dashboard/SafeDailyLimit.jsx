import React from 'react';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

// ============================================================
// SafeDailyLimit — Безопасный дневной лимит
// ============================================================
// Считает, сколько можно тратить в день до конца периода,
// чтобы не выйти за рамки бюджетов.
//
// Формула: (сумма лимитов бюджетов - сумма потраченного) / оставшиеся дни
// ============================================================
export default function SafeDailyLimit({ budgets, formatCurrency }) {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(1, endOfMonth.getDate() - now.getDate() + 1);

  const totalLimit = budgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0);

  if (totalLimit === 0) return null;

  const remaining = Math.max(0, totalLimit - totalSpent);
  const dailyLimit = remaining / daysLeft;
  const usagePercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

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
        <span className="text-muted-foreground text-xs">Безопасный лимит на день</span>
      </div>
      <p className="text-amber-500 font-bold text-lg">{formatCurrency(dailyLimit)}</p>
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
    </motion.div>
  );
}