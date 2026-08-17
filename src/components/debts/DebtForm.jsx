import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Landmark, Home, Coins, Car, HelpCircle } from 'lucide-react';

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Кредитная карта', icon: CreditCard },
  { value: 'consumer_loan', label: 'Потребкредит', icon: Landmark },
  { value: 'mortgage', label: 'Ипотека', icon: Home },
  { value: 'microloan', label: 'Микрозайм (МФО)', icon: Coins },
  { value: 'auto_loan', label: 'Автокредит', icon: Car },
  { value: 'other', label: 'Другое', icon: HelpCircle },
];

const PAYMENT_TYPES = [
  { value: 'annuity', label: 'Аннуитетный (равные платежи)' },
  { value: 'differentiated', label: 'Дифференцированный' },
  { value: 'interest_only', label: 'Только проценты' },
];

export default function DebtForm({ open, onClose, onSave, initialData }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'consumer_loan',
    creditor: initialData?.creditor || '',
    total_amount: initialData?.total_amount || '',
    remaining_amount: initialData?.remaining_amount || '',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      total_amount: Number(form.total_amount) || 0,
      remaining_amount: Number(form.remaining_amount) || 0,
      interest_rate: Number(form.interest_rate) || 0,
      monthly_payment: Number(form.monthly_payment) || 0,
      min_payment_percent: Number(form.min_payment_percent) || 0,
      payment_day: Number(form.payment_day) || 15,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать долг' : 'Добавить долг'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название *</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Например: Кредитная карта Тинькофф"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Тип долга *</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Кредитор</Label>
              <Input
                value={form.creditor}
                onChange={(e) => update('creditor', e.target.value)}
                placeholder="Сбербанк, ВТБ, МФО..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Первоначальная сумма ₽</Label>
              <Input
                type="number"
                value={form.total_amount}
                onChange={(e) => update('total_amount', e.target.value)}
                placeholder="500000"
              />
            </div>
            <div>
              <Label>Остаток долга ₽ *</Label>
              <Input
                type="number"
                value={form.remaining_amount}
                onChange={(e) => update('remaining_amount', e.target.value)}
                placeholder="250000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ставка % годовых *</Label>
              <Input
                type="number"
                step="0.1"
                value={form.interest_rate}
                onChange={(e) => update('interest_rate', e.target.value)}
                placeholder="19.9"
                required
              />
            </div>
            <div>
              <Label>Ежемес. платёж ₽</Label>
              <Input
                type="number"
                value={form.monthly_payment}
                onChange={(e) => update('monthly_payment', e.target.value)}
                placeholder="15000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>День платежа</Label>
              <Input
                type="number"
                min="1" max="31"
                value={form.payment_day}
                onChange={(e) => update('payment_day', e.target.value)}
              />
            </div>
            <div>
              <Label>Тип платежа</Label>
              <Select value={form.payment_type} onValueChange={(v) => update('payment_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.type === 'credit_card' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Мин. платёж % от остатка</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.min_payment_percent}
                  onChange={(e) => update('min_payment_percent', e.target.value)}
                  placeholder="3-5%"
                />
              </div>
              <div>
                <Label>Конец льготного периода</Label>
                <Input
                  type="date"
                  value={form.grace_period_end}
                  onChange={(e) => update('grace_period_end', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Дата открытия</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
              />
            </div>
            <div>
              <Label>Дата окончания (план)</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => update('end_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Заметки</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Условия досрочного погашения, комиссии, страховка..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit">{isEdit ? 'Сохранить' : 'Добавить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}