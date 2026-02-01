import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS = {
  'Еда': '🍔',
  'Транспорт': '🚗',
  'Жильё': '🏠',
  'Развлечения': '🎮',
  'Здоровье': '💊',
  'Одежда': '👕',
  'Подписки': '📱',
  'Образование': '📚',
  'Зарплата': '💰',
  'Фриланс': '💻',
  'Инвестиции': '📈',
  'Подарки': '🎁',
  'Другое': '📦'
};

export default function SwipeableTransaction({ 
  transaction, 
  index, 
  onDelete, 
  onEdit, 
  formatCurrency
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 group bg-white dark:bg-slate-800"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-sm ${
          transaction.type === 'income' 
            ? 'bg-emerald-100 dark:bg-emerald-900/30' 
            : 'bg-rose-100 dark:bg-rose-900/30'
        }`}>
          {CATEGORY_ICONS[transaction.category] || '📦'}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            {transaction.category || 'Без категории'}
          </p>
          {transaction.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
              {transaction.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className={`font-semibold text-lg whitespace-nowrap ${
          transaction.type === 'income' 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-rose-600 dark:text-rose-400'
        }`}>
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 sm:opacity-0 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(transaction)}
            className="h-8 w-8 text-slate-400 hover:text-violet-600"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(transaction.id)}
            className="h-8 w-8 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}