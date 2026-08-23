import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2, Calendar, RefreshCw, AlertCircle, CreditCard, Landmark, Home, Coins, Car, HelpCircle } from 'lucide-react';
import { formatDebtCurrency, monthlyRate, calcMinPayment } from '@/services/DebtService';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/lib/LanguageContext';

const TYPE_ICONS = {
  credit_card: CreditCard,
  consumer_loan: Landmark,
  mortgage: Home,
  microloan: Coins,
  auto_loan: Car,
  other: HelpCircle,
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
  const t = useTranslation();
  const currency = debt.currency || 'RUB';
  const fmt = (amount) => formatDebtCurrency(amount, currency);

  const { data: linkedAccount } = useQuery({
    queryKey: ['account', debt.linked_account_id],
    queryFn: () => base44.entities.Account.get(debt.linked_account_id),
    enabled: !!debt.linked_account_id,
  });

  // Проверка расхождения: remaining_amount vs баланс связанного счёта
  const expectedRemaining = linkedAccount ? Math.abs(Math.min(linkedAccount.balance || 0, 0)) : null;
  const needsSync = expectedRemaining !== null && Math.abs(expectedRemaining - (debt.remaining_amount || 0)) > 0.01;
  const [syncing, setSyncing] = useState(false);

  const handleResync = async () => {
    if (!linkedAccount) return;
    setSyncing(true);
    try {
      const newRemaining = Math.abs(Math.min(linkedAccount.balance || 0, 0));
      const updates = { remaining_amount: newRemaining };
      if (newRemaining <= 0) updates.status = 'paid_off';
      await base44.entities.DebtAccount.update(debt.id, updates);
    } finally {
      setSyncing(false);
    }
  };

  const Icon = TYPE_ICONS[debt.type] || HelpCircle;
  const colorClass = TYPE_COLORS[debt.type] || TYPE_COLORS.other;
  const monthlyInterest = (debt.remaining_amount || 0) * monthlyRate(debt.interest_rate || 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card rounded-2xl p-4 sm:p-5"
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
            {t(`debt.type_${debt.type}`)}
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
          <p className="text-xs text-muted-foreground mb-0.5">{t('debt.card_remaining')}</p>
          <p className="text-lg font-bold text-foreground">{fmt(debt.remaining_amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t('debt.card_payment')}</p>
          <p className="text-lg font-bold text-foreground">{fmt(debt.monthly_payment || calcMinPayment(debt))}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">{t('debt.card_rate')}</p>
          <p className="text-sm font-medium text-foreground">{debt.interest_rate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('debt.card_rate_monthly')}</p>
          <p className="text-sm font-medium text-amber-500">{fmt(monthlyInterest)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('debt.card_payment_day')}</p>
          <p className="text-sm font-medium text-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {debt.payment_day || '—'}
          </p>
        </div>
      </div>

      {needsSync && (
        <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('debt.card_sync_badge')}
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleResync} disabled={syncing}>
            <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {t('debt.card_resync')}
          </Button>
        </div>
      )}

      {debt.status === 'in_grace' && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium text-center">
          {t('debt.card_in_grace')}
        </div>
      )}
      {debt.status === 'paid_off' && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium text-center">
          {t('debt.card_paid_off')}
        </div>
      )}
    </motion.div>
  );
}