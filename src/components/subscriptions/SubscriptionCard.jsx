import React from 'react';
import { motion } from 'framer-motion';
import { Repeat, Trash2, Edit2, Power, Calendar } from 'lucide-react';

const PERIOD_LABELS = {
  weekly: 'нед.',
  monthly: 'мес',
  quarterly: 'кв.',
  yearly: 'год',
};

export default function SubscriptionCard({
  subscription,
  accountName,
  formatCurrency,
  onEdit,
  onDelete,
  onToggle,
}) {
  const sub = subscription;
  const isActive = sub.is_active && !sub.cancelled;
  const daysUntilCharge = sub.next_charge_date
    ? Math.ceil((new Date(sub.next_charge_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border bg-card shadow-sm p-4 transition-opacity ${
        isActive ? 'border-border' : 'border-border opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: (sub.color || '#6366f1') + '20' }}
        >
          <Repeat className="w-5 h-5" style={{ color: sub.color || '#6366f1' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{sub.name}</h3>
            {!isActive && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                отменено
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">
            {sub.category || 'Другое'}
            {accountName && ` · ${accountName}`}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(sub.amount)}
            </span>
            <span className="text-muted-foreground text-xs">
              / {PERIOD_LABELS[sub.period] || 'мес'}
            </span>
            {sub.next_charge_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <Calendar className="w-3 h-3" />
                {daysUntilCharge <= 0
                  ? 'сегодня'
                  : daysUntilCharge === 1
                  ? 'завтра'
                  : `через ${daysUntilCharge} дн.`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            isActive
              ? 'text-muted-foreground hover:bg-muted'
              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {isActive ? 'Отключить' : 'Включить'}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors min-h-[36px]"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Изменить
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto min-h-[36px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Удалить
        </button>
      </div>
    </motion.div>
  );
}