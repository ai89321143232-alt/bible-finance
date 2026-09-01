import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import MobileSelect from '@/components/mobile/MobileSelect';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'quarterly', label: 'Ежеквартально' },
  { value: 'yearly', label: 'Ежегодно' },
];

const CATEGORY_OPTIONS = [
  'Подписки', 'Связь', 'Интернет', 'Жильё', 'Коммунальные услуги',
  'Страховка', 'Налоги', 'Транспорт', 'Образование', 'Спорт', 'Другое',
];

export default function SubscriptionForm({ initial, accounts, onClose, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSubmitting: saving, lock: lockSubmit, release: releaseSubmit } = useSubmitGuard();
  const [form, setForm] = useState({
    name: '',
    amount: '',
    currency: user?.currency || 'RUB',
    period: 'monthly',
    billing_day: 1,
    next_charge_date: '',
    category: 'Подписки',
    account_id: '',
    auto_create_transaction: false,
    reminder_days_before: 3,
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        amount: initial.amount || '',
        currency: initial.currency || 'RUB',
        period: initial.period || 'monthly',
        billing_day: initial.billing_day || 1,
        next_charge_date: initial.next_charge_date || '',
        category: initial.category || 'Подписки',
        account_id: initial.account_id || '',
        auto_create_transaction: initial.auto_create_transaction || false,
        reminder_days_before: initial.reminder_days_before ?? 3,
        notes: initial.notes || '',
        is_active: initial.is_active !== false,
      });
    } else {
      // Default next charge date: next month's billing day
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      setForm((f) => ({ ...f, next_charge_date: next.toISOString().split('T')[0] }));
    }
  }, [initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) {
      toast({ variant: 'destructive', title: 'Заполните название и сумму' });
      return;
    }
    if (!lockSubmit()) return;
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        billing_day: Number(form.billing_day),
        reminder_days_before: Number(form.reminder_days_before),
        user_id: user.id,
        visibility: 'private',
      };
      if (initial) {
        await base44.entities.RecurringPayment.update(initial.id, payload);
        toast({ title: 'Подписка обновлена' });
      } else {
        await base44.entities.RecurringPayment.create(payload);
        toast({ title: 'Подписка добавлена' });
      }
      onSaved();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Ошибка', description: err.message });
    } finally {
      releaseSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-foreground">
            {initial ? 'Редактировать' : 'Новая подписка'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-medium">Название</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Netflix, МТС, Ипотека..."
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Сумма</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Период</Label>
              <div className="mt-1">
                <MobileSelect
                  value={form.period}
                  onValueChange={(v) => setForm({ ...form, period: v })}
                  triggerClassName="w-full h-10 text-sm rounded-lg border-border bg-background"
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </MobileSelect>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">День списания</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={form.billing_day}
                onChange={(e) => setForm({ ...form, billing_day: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Следующее списание</Label>
              <Input
                type="date"
                value={form.next_charge_date}
                onChange={(e) => setForm({ ...form, next_charge_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Категория</Label>
            <div className="mt-1">
              <MobileSelect
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
                triggerClassName="w-full h-10 text-sm rounded-lg border-border bg-background"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </MobileSelect>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Счёт списания</Label>
            <div className="mt-1">
              <MobileSelect
                value={form.account_id}
                onValueChange={(v) => setForm({ ...form, account_id: v })}
                placeholder="Выберите счёт"
                triggerClassName="w-full h-10 text-sm rounded-lg border-border bg-background"
              >
                <option value="">Не выбран</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </MobileSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm font-medium">Авто-транзакция</Label>
                <p className="text-xs text-muted-foreground">Создавать в день списания</p>
              </div>
              <Switch
                checked={form.auto_create_transaction}
                onCheckedChange={(v) => setForm({ ...form, auto_create_transaction: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm font-medium">Напомнить за</Label>
                <p className="text-xs text-muted-foreground">дней до списания</p>
              </div>
              <Input
                type="number"
                min="0"
                max="30"
                value={form.reminder_days_before}
                onChange={(e) => setForm({ ...form, reminder_days_before: e.target.value })}
                className="w-16 h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Заметки</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Условия отмены, комиссии..."
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? '...' : initial ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}