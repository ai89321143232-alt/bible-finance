import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import CreatorTag from '@/components/shared/CreatorTag';

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

const DELETE_WIDTH = 88;

export default function SwipeableTransaction({
  transaction,
  index,
  onDelete,
  onEdit,
  formatCurrency,
  family,
  currentUser,
  isOpen = false,
  onOpenChange = () => {}
}) {
  const isOwner = !currentUser || transaction.created_by_id === currentUser.id;

  const handleDragEnd = (_event, info) => {
    onOpenChange(info.offset.x < -DELETE_WIDTH / 2);
  };

  return (
    <div className="relative overflow-hidden border-b border-slate-100 dark:border-slate-700 last:border-0">
      {/* Delete action revealed by swiping left — only for own transactions */}
      {isOwner && (
        <div
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ width: DELETE_WIDTH }}
        >
          <button
            onClick={() => { onDelete(transaction.id); onOpenChange(false); }}
            className="flex-1 bg-rose-600 hover:bg-rose-700 flex flex-col items-center justify-center gap-1 text-white transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-xs font-medium">Удалить</span>
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, x: isOwner && isOpen ? -DELETE_WIDTH : 0 }}
        transition={{ delay: index * 0.03, x: { type: 'spring', damping: 30, stiffness: 300 } }}
        drag={isOwner ? "x" : false}
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={0.05}
        onDragEnd={isOwner ? handleDragEnd : undefined}
        onClick={(e) => { if (isOpen) { e.stopPropagation(); onOpenChange(false); } }}
        className="relative z-10 flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group bg-white dark:bg-slate-800"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-lg shadow-sm ${
            transaction.type === 'income'
              ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : 'bg-rose-100 dark:bg-rose-900/30'
          }`}>
            {CATEGORY_ICONS[transaction.category] || '📦'}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {transaction.category || 'Без категории'}
            </p>
            {transaction.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {transaction.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] font-medium ${
                transaction.source === 'telegram_bot'
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                {transaction.source === 'telegram_bot' ? '#бот' : '#вручную'}
              </span>
              <CreatorTag creatorId={transaction.created_by_id} family={family} currentUser={currentUser} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className={`font-semibold text-lg whitespace-nowrap ${
            transaction.type === 'income'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </p>
          {isOwner && (
            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-slate-400 hover:text-violet-600"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }}
                className="hidden sm:inline-flex min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}