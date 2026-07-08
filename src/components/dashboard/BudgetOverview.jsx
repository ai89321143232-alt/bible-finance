import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, AlertCircle, Layers } from 'lucide-react';

// Вычисляет расходы по бюджету из транзакций текущего месяца (динамически)
function calcBudgetSpent(budget, transactions) {
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

export default function BudgetOverview({ budgets, transactions = [], formatCurrency }) {
  const totalLimit = budgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + calcBudgetSpent(b, transactions), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <div className="rounded-2xl border border-white/8 bg-[#141820] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-widest font-semibold">Бюджеты</span>
          <Link to={createPageUrl('Budgets')}>
            <span className="text-white/35 hover:text-white/70 text-xs flex items-center gap-1 transition-colors">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {budgets.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/2">
            <span className="text-white/40 text-xs">Общий бюджет</span>
            <span className="text-cyan-400 font-extrabold text-base">
              {formatCurrency(totalSpent)} <span className="text-white/30 font-medium text-sm">/ {formatCurrency(totalLimit)}</span>
            </span>
          </div>
        )}

        {budgets.length > 0 ? (
          <div className="p-4 space-y-4">
            {budgets.slice(0, 4).map((budget, idx) => {
              const spent = calcBudgetSpent(budget, transactions);
              const progress = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
              const isOver = progress > 100;
              const isWarn = progress >= (budget.notify_at_percent || 80) && !isOver;
              
              const barColor = isOver 
                ? 'bg-gradient-to-r from-rose-500 to-rose-400' 
                : isWarn 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400' 
                  : 'bg-gradient-to-r from-violet-500 to-cyan-400';

              return (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 text-sm font-medium">{budget.name}</span>
                    <div className="flex items-center gap-1.5">
                      {(isOver || isWarn) && (
                        <AlertCircle className={`w-3.5 h-3.5 ${isOver ? 'text-rose-400' : 'text-amber-400'}`} />
                      )}
                      <span className={`text-xs font-medium ${isOver ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-white/35'}`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className={`text-xs font-bold ${isOver ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-cyan-400'}`}>{formatCurrency(spent)}</span>
                    <span className="text-fuchsia-400 text-xs font-bold">{formatCurrency(budget.limit_amount)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-white/25 text-sm mb-3">Нет бюджетов</p>
            <Link to={createPageUrl('Budgets')}>
              <span className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-all">
                <Plus className="w-3.5 h-3.5" /> Создать
              </span>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}