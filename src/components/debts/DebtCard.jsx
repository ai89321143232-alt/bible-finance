import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Landmark, Home, Coins, Car, HelpCircle, Trash2, Edit2, Calendar } from 'lucide-react';
import { formatDebtCurrency, monthlyRate } from '@/services/DebtService';
import { Button } from '@/components/ui/button';

const TYPE_ICONS = {
  credit_card: CreditCard,
  consumer_loan: Landmark,
  mortgage: Home,
  microloan: Coins,
  auto_loan: Car,
  other: HelpCircle,
};

const TYPE_LABELS = {
  credit_card: 'Кредитная карта',
  consumer_loan: 'Потребкредит',
  mortgage: 'Ипотека',
  microloan: 'Микрозайм',
  auto_loan: 'Автокредит',
  other: 'Другое',
};

const TYPE_COLORS = {
  credit_card: 'text-rose-400 bg-rose-500/10',
  consumer_loan: 'text-amber-400 bg-amber-500/10',
  mortgage: 'text-blue-400 bg-blue-500/10',
  microloan: 'text-red-400 bg-red-500/10',
  auto_loan: 'text-violet-400 bg-violet-500/10',
  other: 'text-muted-foreground bg-muted',
};

export default function DebtCard({ debt, onEdit, onDelete, order }) {
  const Icon = TYPE_ICONS[debt.type] || HelpCircle;
  const colorClass = TYPE_COLORS[debt.type] || TYPE_COLORS.other;
  const monthlyInterest = (debt.remaining_amount || 0) * monthlyRate(debt.interest_rate || 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {order !== undefined && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                {order + 1}
              </span>
            )}
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{debt.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {TYPE_LABELS[debt.type] || debt.type}
            {debt.creditor && ` · ${debt.creditor}`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(debt)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(debt)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Остаток долга</p>
          <p className="text-lg font-bold text-foreground">{formatDebtCurrency(debt.remaining_amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Платёж / мес.</p>
          <p className="text-lg font-bold text-foreground">{formatDebtCurrency(debt.monthly_payment)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">Ставка</p>
          <p className="text-sm font-medium text-foreground">{debt.interest_rate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">% в мес.</p>
          <p className="text-sm font-medium text-amber-500">{formatDebtCurrency(monthlyInterest)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">День платежа</p>
          <p className="text-sm font-medium text-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {debt.payment_day || '—'}
          </p>
        </div>
      </div>

      {debt.status === 'in_grace' && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium text-center">
          В льготном периоде — проценты не начисляются
        </div>
      )}
      {debt.status === 'paid_off' && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium text-center">
          ✓ Долг погашен
        </div>
      )}
    </motion.div>
  );
}