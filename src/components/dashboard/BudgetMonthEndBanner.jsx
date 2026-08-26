import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingDown, TrendingUp, AlertCircle, Sparkles, ChevronRight, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Показывается за 5 дней до конца месяца
function shouldShowBanner() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = endOfMonth.getDate() - now.getDate();
  return daysLeft <= 5;
}

function getDaysLeft() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return endOfMonth.getDate() - now.getDate();
}

// Вычисляет расходы по бюджету из транзакций текущего месяца
function calcSpent(budget, transactions) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const categories = budget.categories || (budget.category ? [budget.category] : []);
  return transactions
    .filter(t =>
      t.type === 'expense' &&
      (categories.length === 0 || categories.includes(t.category)) &&
      new Date(t.date) >= periodStart
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export default function BudgetMonthEndBanner({ budgets, transactions, formatCurrency, onBudgetUpdated }) {
  const [dismissed, setDismissed] = useState(() => {
    const key = `budget_banner_dismissed_${new Date().getMonth()}_${new Date().getFullYear()}`;
    return localStorage.getItem(key) === 'true';
  });
  const [updatedIds, setUpdatedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  if (!shouldShowBanner() || dismissed || budgets.length === 0) return null;

  const daysLeft = getDaysLeft();

  const budgetAnalysis = budgets.map(budget => {
    const spent = calcSpent(budget, transactions);
    const limit = budget.limit_amount || 0;
    const saved = Math.max(0, limit - spent);
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    const annualSavings = saved * 12;
    return { budget, spent, limit, saved, percent, annualSavings };
  });

  const wellManagedBudgets = budgetAnalysis.filter(b => b.percent < 80 && b.saved > 0);
  const overBudgets = budgetAnalysis.filter(b => b.percent > 100);
  const warningBudgets = budgetAnalysis.filter(b => b.percent >= 80 && b.percent <= 100);

  const handleKeepLimit = async (item) => {
    setLoading(true);
    await base44.entities.Budget.update(item.budget.id, {
      limit_amount: item.limit,
      spent_amount: 0,
      notification_sent: false
    });
    setUpdatedIds(prev => new Set([...prev, item.budget.id]));
    setLoading(false);
    onBudgetUpdated?.();
  };

  const handleReduceLimit = async (item) => {
    // Предложить снизить лимит до фактических расходов
    const newLimit = Math.ceil(item.spent / 100) * 100; // округлить вверх до сотен
    setLoading(true);
    await base44.entities.Budget.update(item.budget.id, {
      limit_amount: Math.max(newLimit, item.spent + 500), // минимум +500₽ от потраченного
      spent_amount: 0,
      notification_sent: false
    });
    setUpdatedIds(prev => new Set([...prev, item.budget.id]));
    setLoading(false);
    onBudgetUpdated?.();
  };

  const handleDismiss = () => {
    const key = `budget_banner_dismissed_${new Date().getMonth()}_${new Date().getFullYear()}`;
    localStorage.setItem(key, 'true');
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card mb-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-indigo-950/60 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Конец месяца близко</p>
            <p className="text-white/40 text-xs">Осталось {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'} · Бюджеты обновятся 1-го числа</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      <div className="p-4 space-y-3">

        {/* Хорошо управляемые бюджеты */}
        {wellManagedBudgets.map(item => (
          <motion.div
            key={item.budget.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">🎉 {item.budget.name}</p>
                <p className="text-emerald-400 text-xs mt-0.5">
                  Потрачено {Math.round(item.percent)}% лимита — отлично!
                  Сэкономлено {formatCurrency(item.saved)}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Если сохранить такой темп — за год это +{formatCurrency(item.annualSavings)} в финансовую подушку
                </p>

                {updatedIds.has(item.budget.id) ? (
                  <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs">
                    <Check className="w-3.5 h-3.5" /> Бюджет обновлён
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleKeepLimit(item)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Оставить лимит {formatCurrency(item.limit)}
                    </button>
                    <button
                      onClick={() => handleReduceLimit(item)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Снизить до ~{formatCurrency(item.spent + 500)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Предупреждения */}
        {warningBudgets.map(item => (
          <motion.div
            key={item.budget.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">⚠️ {item.budget.name}</p>
                <p className="text-amber-400 text-xs mt-0.5">
                  Потрачено {Math.round(item.percent)}% — осторожно, лимит близко
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Осталось {formatCurrency(item.saved)} до конца месяца
                </p>
                {updatedIds.has(item.budget.id) ? (
                  <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs">
                    <Check className="w-3.5 h-3.5" /> Бюджет обновлён
                  </div>
                ) : (
                  <button
                    onClick={() => handleKeepLimit(item)}
                    disabled={loading}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    Оставить на следующий месяц
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Превышены */}
        {overBudgets.map(item => (
          <motion.div
            key={item.budget.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl bg-rose-500/8 border border-rose-500/15 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">🚨 {item.budget.name}</p>
                <p className="text-rose-400 text-xs mt-0.5">
                  Превышен на {formatCurrency(item.spent - item.limit)} ({Math.round(item.percent)}%)
                </p>
                <p className="text-white/40 text-xs mt-1">
                  В следующем месяце стоит пересмотреть лимит или снизить расходы в этой категории
                </p>
                {updatedIds.has(item.budget.id) ? (
                  <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs">
                    <Check className="w-3.5 h-3.5" /> Бюджет обновлён
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleKeepLimit(item)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Оставить лимит {formatCurrency(item.limit)}
                    </button>
                    <button
                      onClick={() => handleReduceLimit(item)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Поднять до {formatCurrency(Math.ceil(item.spent / 1000) * 1000)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

      </div>
    </motion.div>
  );
}