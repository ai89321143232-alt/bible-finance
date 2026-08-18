import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCategoryEmoji } from '@/lib/categoryIcon';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function BudgetTransactionsModal({
  budget,
  transactions,
  isOpen,
  onClose,
  formatCurrency,
}) {
  if (!budget) return null;

  const budgetCategories = budget.categories || (budget.category ? [budget.category] : []);
  const now = new Date();
  let periodStart;

  switch (budget.period) {
    case 'weekly': {
      const day = now.getDay();
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      break;
    }
    case 'quarterly': {
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    }
    case 'yearly':
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    case 'monthly':
    default:
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const budgetTx = transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (budgetCategories.length > 0 && !budgetCategories.includes(t.category)) return false;
      if (new Date(t.date) < periodStart) return false;
      if (budget.is_family_budget) {
        return t.budget_scope !== 'personal';
      }
      return t.budget_scope !== 'family';
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = budgetTx.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-violet-600" />
            {budget.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 mb-3">
          <span>Транзакции за период</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {budgetTx.length} шт. · {formatCurrency(total)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {budgetTx.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                Нет транзакций в этом бюджете за текущий период
              </p>
            </div>
          ) : (
            budgetTx.map(tx => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"
              >
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">
                  {getCategoryEmoji(tx.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {tx.description || tx.category}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(tx.date), 'd MMM, HH:mm', { locale: ru })}
                  </p>
                </div>
                <span className="font-semibold text-rose-600 dark:text-rose-400 text-sm shrink-0">
                  −{formatCurrency(tx.amount)}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}