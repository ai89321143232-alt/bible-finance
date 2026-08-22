import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, AlertCircle, Layers } from 'lucide-react';

function calcBudgetSpent(budget, transactions, currentUserId) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const categories = budget.categories || (budget.category ? [budget.category] : []);
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (categories.length > 0 && !categories.includes(t.category)) return false;
      if (new Date(t.date) < periodStart) return false;
      // Личный бюджет считает только свои транзакции, семейный — все транзакции семьи.
      // budget_scope разделяет расход между личным и семейным бюджетом, если категория совпадает у обоих.
      if (budget.is_family_budget) return t.budget_scope !== 'personal';
      return (t.created_by_id === currentUserId || t.user_id === currentUserId) && t.budget_scope !== 'family';
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export default function BudgetOverview({ budgets, transactions = [], formatCurrency, currentUser }) {
  const currentUserId = currentUser?.id;
  const totalLimit = budgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + calcBudgetSpent(b, transactions, currentUserId), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <span className="text-muted-foreground text-xs uppercase tracking-widest font-semibold">Бюджеты</span>
          <Link to={createPageUrl('Budgets')}>
            <span className="text-muted-foreground/70 hover:text-foreground text-xs flex items-center gap-1 transition-colors">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {budgets.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-muted-foreground text-xs">Общий бюджет</span>
            <span className="text-cyan-500 font-extrabold text-base">
              {formatCurrency(totalSpent)} <span className="text-muted-foreground font-medium text-sm">/ {formatCurrency(totalLimit)}</span>
            </span>
          </div>
        )}

        {budgets.length > 0 ? (
          <div className="p-4 space-y-4">
            {budgets.slice(0, 4).map((budget, idx) => {
              const spent = calcBudgetSpent(budget, transactions, currentUserId);
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
                    <span className="text-foreground text-sm font-medium">{budget.name}</span>
                    <div className="flex items-center gap-1.5">
                      {(isOver || isWarn) && (
                        <AlertCircle className={`w-3.5 h-3.5 ${isOver ? 'text-rose-500' : 'text-amber-500'}`} />
                      )}
                      <span className={`text-xs font-medium ${isOver ? 'text-rose-500' : isWarn ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className={`text-xs font-bold ${isOver ? 'text-rose-500' : isWarn ? 'text-amber-500' : 'text-cyan-500'}`}>{formatCurrency(spent)}</span>
                    <span className="text-fuchsia-500 text-xs font-bold">{formatCurrency(budget.limit_amount)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm mb-3">Нет бюджетов</p>
            <Link to={createPageUrl('Budgets')}>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border hover:border-foreground/20 rounded-lg px-3 py-1.5 transition-all">
                <Plus className="w-3.5 h-3.5" /> Создать
              </span>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}