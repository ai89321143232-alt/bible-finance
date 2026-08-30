import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { HandCoins } from 'lucide-react';
import { useCurrencySymbol } from '@/lib/formatCurrency';

// Диалог создания запроса денег у членов семьи — сумма + необязательная заметка.
export default function MoneyRequestDialog({ open, onOpenChange, onSubmit }) {
  const currencySymbol = useCurrencySymbol();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0 || isSending) return;
    setIsSending(true);
    try {
      await onSubmit({ amount: Number(amount), note });
      setAmount('');
      setNote('');
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <HandCoins className="w-5 h-5" />
            Запросить деньги
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Сумма, {currencySymbol}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Комментарий (необязательно)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: на продукты"
              className="rounded-xl mt-1 resize-none"
              rows={2}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0 || isSending}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            {isSending ? 'Отправка...' : 'Отправить запрос'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}