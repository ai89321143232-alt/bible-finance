import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Landmark, Home, Coins, Car, HelpCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useFormatCurrency } from '@/lib/formatCurrency';
import { useTranslation } from '@/lib/LanguageContext';

const DEBT_TYPES = [
  { value: 'credit_card', icon: CreditCard },
  { value: 'consumer_loan', icon: Landmark },
  { value: 'mortgage', icon: Home },
  { value: 'microloan', icon: Coins },
  { value: 'auto_loan', icon: Car },
  { value: 'other', icon: HelpCircle },
];

const PAYMENT_TYPES = [
  { value: 'annuity' },
  { value: 'differentiated' },
  { value: 'interest_only' },
];

export default function DebtForm({ open, onClose, onSave, initialData }) {
  const isEdit = !!initialData;
  const t = useTranslation();
  const formatCurrency = useFormatCurrency();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  // Кредитные счета: type=credit или отрицательный баланс
  const creditAccounts = useMemo(() =>
    accounts.filter(a => a.type === 'credit' || (a.balance || 0) < 0),
    [accounts]
  );

  const [form, setForm] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'consumer_loan',
    creditor: initialData?.creditor || '',
    total_amount: initialData?.total_amount || '',
    interest_rate: initialData?.interest_rate || '',
    monthly_payment: initialData?.monthly_payment || '',
    min_payment_percent: initialData?.min_payment_percent || '',
    payment_day: initialData?.payment_day || 15,
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    grace_period_end: initialData?.grace_period_end || '',
    payment_type: initialData?.payment_type || 'annuity',
    linked_account_id: initialData?.linked_account_id || '',
    notes: initialData?.notes || '',
    ...initialData,
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const selectedAccount = accounts.find(a => a.id === form.linked_account_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.linked_account_id) return;
    const payload = {
      ...form,
      total_amount: Number(form.total_amount) || 0,
      interest_rate: Number(form.interest_rate) || 0,
      monthly_payment: Number(form.monthly_payment) || 0,
      min_payment_percent: Number(form.min_payment_percent) || 0,
      payment_day: Number(form.payment_day) || 15,
      // remaining_amount и currency наследуются от связанного счёта (авто-синхронизация)
      remaining_amount: selectedAccount ? Math.abs(Math.min(selectedAccount.balance || 0, 0)) : 0,
      currency: selectedAccount?.currency || 'RUB',
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('debt.form_edit') : t('debt.form_add')}</DialogTitle>
        </DialogHeader>

        {creditAccounts.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground text-sm mb-4">{t('debt.form_no_accounts')}</p>
            <Button variant="outline" onClick={() => onClose()}>{t('debt.form_go_to_accounts')}</Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('debt.form_name')}</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('debt.form_name_placeholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('debt.form_type')}</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map(item => (
                    <SelectItem key={item.value} value={item.value}>{t(`debt.type_${item.value}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('debt.form_creditor')}</Label>
              <Input
                value={form.creditor}
                onChange={(e) => update('creditor', e.target.value)}
                placeholder={t('debt.form_creditor_placeholder')}
              />
            </div>
          </div>

          <div>
            <Label>{t('debt.form_linked_account')}</Label>
            <Select value={form.linked_account_id} onValueChange={(v) => update('linked_account_id', v)}>
              <SelectTrigger><SelectValue placeholder={t('debt.form_linked_account_placeholder')} /></SelectTrigger>
              <SelectContent>
                {creditAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} · {formatCurrency(Math.abs(Math.min(acc.balance || 0, 0)), acc.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('debt.form_remaining')}: {formatCurrency(Math.abs(Math.min(selectedAccount.balance || 0, 0)), selectedAccount.currency)} · {t('debt.form_currency')}: {selectedAccount.currency || 'RUB'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('debt.form_initial_amount')}</Label>
              <Input
                type="number"
                value={form.total_amount}
                onChange={(e) => update('total_amount', e.target.value)}
                placeholder="500000"
              />
            </div>
            <div>
              <Label>{t('debt.form_rate')}</Label>
              <Input
                type="number"
                step="0.1"
                value={form.interest_rate}
                onChange={(e) => update('interest_rate', e.target.value)}
                placeholder="19.9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('debt.form_monthly_payment')}</Label>
              <Input
                type="number"
                value={form.monthly_payment}
                onChange={(e) => update('monthly_payment', e.target.value)}
                placeholder="15000"
              />
            </div>
            <div>
              <Label>{t('debt.form_payment_day')}</Label>
              <Input
                type="number"
                min="1" max="31"
                value={form.payment_day}
                onChange={(e) => update('payment_day', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('debt.form_payment_type')}</Label>
              <Select value={form.payment_type} onValueChange={(v) => update('payment_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(item => (
                    <SelectItem key={item.value} value={item.value}>{t(`debt.pt_${item.value}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.type === 'credit_card' && (
              <div>
                <Label>{t('debt.form_min_percent')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.min_payment_percent}
                  onChange={(e) => update('min_payment_percent', e.target.value)}
                  placeholder="3-5%"
                />
              </div>
            )}
          </div>

          {form.type === 'credit_card' && (
            <div>
              <Label>{t('debt.form_grace_end')}</Label>
              <Input
                type="date"
                value={form.grace_period_end}
                onChange={(e) => update('grace_period_end', e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('debt.form_start_date')}</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
              />
            </div>
            <div>
              <Label>{t('debt.form_end_date')}</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => update('end_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t('debt.form_notes')}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder={t('debt.form_notes_placeholder')}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={!form.linked_account_id}>{isEdit ? t('common.save') : t('common.add')}</Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}