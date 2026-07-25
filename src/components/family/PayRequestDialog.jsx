import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SelectItem } from '@/components/ui/select';
import MobileSelect from '@/components/mobile/MobileSelect';
import { HandCoins } from 'lucide-react';

// Диалог оплаты запроса денег: выбор своего счёта, с которого спишется сумма.
// Сама сумма переводится на счёт запросившего — общий баланс семьи не меняется,
// меняются только балансы двух конкретных счетов.
export default function PayRequestDialog({ open, onOpenChange, message, requesterName, accounts, onConfirm }) {
  const [accountId, setAccountId] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) setAccountId(accounts[0]?.id || '');
  }, [open, accounts]);

  const handleConfirm = async () => {
    if (!accountId || isSending) return;
    setIsSending(true);
    try {
      await onConfirm(accountId);
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <HandCoins className="w-5 h-5" />
            Оплатить запрос
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {requesterName} запросил(а) <span className="font-semibold text-foreground">{message?.amount?.toLocaleString('ru-RU')} ₽</span>.
            Выберите счёт, с которого списать сумму:
          </p>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">У вас нет счетов для перевода.</p>
          ) : (
            <MobileSelect value={accountId} onValueChange={setAccountId} placeholder="Счёт" title="Выберите счёт" triggerClassName="w-full h-10 rounded-xl">
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} · {(acc.balance || 0).toLocaleString('ru-RU')} ₽
                </SelectItem>
              ))}
            </MobileSelect>
          )}
          <Button
            onClick={handleConfirm}
            disabled={!accountId || isSending}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            {isSending ? 'Отправка...' : 'Подтвердить оплату'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}