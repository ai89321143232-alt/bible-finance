import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const payoutLabels = { dividend: 'Дивиденды', coupon: 'Купон', interest: 'Проценты', rent: 'Аренда' };

export default function InvestmentHistoryDialog({ investment, open, onOpenChange, transactions, cashFlows, accounts, family, currentUser }) {
  if (!investment) return null;
  const accountName = (id) => accounts.find((account) => account.id === id)?.name || 'Без счёта';
  const authorName = (record) => {
    if (record.created_by_id === currentUser?.id || record.user_id === currentUser?.id) return 'Вы';
    return family?.members?.find((member) => member.user_id === (record.created_by_id || record.user_id))?.display_name
      || family?.members?.find((member) => member.user_id === (record.created_by_id || record.user_id))?.name
      || 'Участник';
  };
  const movements = [
    ...transactions.filter((item) => item.investment_id === investment.id).map((item) => ({
      ...item, source: 'transaction', title: item.type === 'expense' ? 'Пополнение инвестиции' : 'Продажа или вывод', positive: item.type === 'income'
    })),
    ...cashFlows.filter((item) => item.investment_id === investment.id).map((item) => ({
      ...item, source: 'cashflow', title: payoutLabels[item.type] || 'Поступление', positive: true
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const money = (amount, currency) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: currency || investment.currency || 'RUB', maximumFractionDigits: 2 }).format(amount || 0);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
      <DialogHeader><DialogTitle>История: {investment.name}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        {movements.length ? movements.map((movement) => <div key={`${movement.source}-${movement.id}`} className="flex gap-3 rounded-xl border border-border p-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${movement.positive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'}`}>
            {movement.positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{movement.title}</p><p className={`text-sm font-semibold whitespace-nowrap ${movement.positive ? 'text-emerald-600' : 'text-violet-600'}`}>{movement.positive ? '+' : '−'}{money(movement.amount, movement.currency)}</p></div>
            <p className="mt-1 text-sm text-muted-foreground">{format(new Date(movement.date), 'd MMMM yyyy, HH:mm', { locale: ru })}</p>
            <p className="text-sm text-muted-foreground">{authorName(movement)} · Счёт: {accountName(movement.account_id)}</p>
          </div>
        </div>) : <div className="py-10 text-center text-muted-foreground"><History className="mx-auto mb-3 h-8 w-8" />Движений по этой инвестиции пока нет</div>}
      </div>
    </DialogContent>
  </Dialog>;
}