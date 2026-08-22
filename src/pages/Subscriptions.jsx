import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Repeat, Plus, Calendar, Trash2, Edit2, Power, AlertCircle, X
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import MobileSelect from '@/components/mobile/MobileSelect';
import SubscriptionForm from '@/components/subscriptions/SubscriptionForm';
import SubscriptionCard from '@/components/subscriptions/SubscriptionCard';

const PERIOD_LABELS = {
  weekly: 'в неделю',
  monthly: 'в месяц',
  quarterly: 'в квартал',
  yearly: 'в год',
};

const PERIOD_MULTIPLIER = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 4 / 12,
  yearly: 1 / 12,
};

export default function Subscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: async () => {
      const all = await base44.entities.Family.list();
      return all.find((f) => f.members?.some((m) => m.user_id === user?.id)) ?? null;
    },
    enabled: !!user,
  });

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['recurring-payments', user?.id, family?.id],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.RecurringPayment.list();
      return all.filter(
        (s) =>
          s.created_by_id === user.id ||
          s.user_id === user.id ||
          (family?.id && s.family_id === family.id)
      );
    },
    enabled: !!user,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-simple'],
    queryFn: async () => {
      const all = await base44.entities.Account.list();
      return all.filter((a) => a.created_by_id === user?.id || a.user_id === user?.id);
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringPayment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
      toast({ title: 'Подписка удалена' });
    },
  });

  const toggleActive = async (sub) => {
    await base44.entities.RecurringPayment.update(sub.id, {
      is_active: !sub.is_active,
      cancelled: !sub.is_active,
    });
    queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
  };

  const activeSubs = subscriptions.filter((s) => s.is_active && !s.cancelled);
  const monthlyTotal = activeSubs.reduce(
    (sum, s) => sum + (s.amount || 0) * (PERIOD_MULTIPLIER[s.period] || 1),
    0
  );
  const yearlyTotal = activeSubs.reduce(
    (sum, s) => sum + (s.amount || 0) * (PERIOD_MULTIPLIER[s.period] || 1) * 12,
    0
  );

  const formatCurrency = (val) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val || 0);

  const upcomingCharges = activeSubs
    .filter((s) => {
      if (!s.next_charge_date) return false;
      const d = new Date(s.next_charge_date);
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      return d <= in30;
    })
    .sort((a, b) => new Date(a.next_charge_date) - new Date(b.next_charge_date));

  return (
    <div className="min-h-screen pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Repeat className="w-6 h-6 text-primary" />
              Подписки и платежи
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Регулярные списания и подписки
            </p>
          </div>
          <Button
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="h-10 w-10 rounded-full p-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-muted-foreground text-xs mb-1">В месяц</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyTotal)}</p>
            <p className="text-muted-foreground text-xs mt-1">{activeSubs.length} активных</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-muted-foreground text-xs mb-1">В год</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(yearlyTotal)}</p>
            <p className="text-muted-foreground text-xs mt-1">≈ {formatCurrency(yearlyTotal / 12)} / мес</p>
          </div>
        </div>

        {/* Upcoming charges */}
        {upcomingCharges.length > 0 && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Списания в ближайшие 30 дней
              </span>
            </div>
            <div className="space-y-2">
              {upcomingCharges.map((sub) => {
                const daysLeft = Math.ceil(
                  (new Date(sub.next_charge_date) - new Date()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={sub.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{sub.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {daysLeft <= 0 ? 'сегодня' : `через ${daysLeft} дн.`}
                      </span>
                      <span className="font-semibold text-foreground">{formatCurrency(sub.amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border">
            <Repeat className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm mb-4">
              Нет подписок. Добавьте Netflix, связь, ипотеку и другие регулярные платежи.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить подписку
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {subscriptions.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  accountName={accounts.find((a) => a.id === sub.account_id)?.name}
                  formatCurrency={formatCurrency}
                  onEdit={() => { setEditingItem(sub); setShowForm(true); }}
                  onDelete={() => deleteMutation.mutate(sub.id)}
                  onToggle={() => toggleActive(sub)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <SubscriptionForm
            initial={editingItem}
            accounts={accounts}
            onClose={() => setShowForm(false)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['recurring-payments'] });
              setShowForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}