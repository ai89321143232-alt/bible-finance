import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CURRENCY_FLAGS = {
  RUB: '🇷🇺', USD: '🇺🇸', EUR: '🇪🇺', KZT: '🇰🇿',
  BYN: '🇧🇾', UAH: '🇺🇦', UZS: '🇺🇿',
};

export default function ExchangeRatesSettings({ user, onSaved }) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  const profileCurrency = user?.currency || user?.data?.currency || 'RUB';
  const initialRates = user?.exchange_rates || user?.data?.exchange_rates || {};

  // Валюты, которые реально используются в счетах (плюс валюта профиля)
  const usedCurrencies = [...new Set([
    profileCurrency,
    ...accounts.map(a => a.currency || 'RUB'),
  ])].filter(Boolean);

  const [rates, setRates] = useState(initialRates);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRates(user?.exchange_rates || user?.data?.exchange_rates || {});
  }, [user]);

  const handleRateChange = (currency, value) => {
    const numValue = parseFloat(value);
    setRates(prev => ({
      ...prev,
      [currency]: isNaN(numValue) || numValue <= 0 ? undefined : numValue,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Фильтруем пустые значения
      const cleanRates = {};
      for (const [k, v] of Object.entries(rates)) {
        if (v != null && !isNaN(v) && v > 0) cleanRates[k] = v;
      }
      await base44.auth.updateMe({ exchange_rates: cleanRates });
      toast.success('Курсы валют сохранены');
      if (onSaved) await onSaved();
    } catch (err) {
      toast.error('Не удалось сохранить курсы');
    } finally {
      setSaving(false);
    }
  };

  // Показываем только валюты, отличные от валюты профиля
  const otherCurrencies = usedCurrencies.filter(c => c !== profileCurrency);

  if (otherCurrencies.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        У вас все счета в одной валюте ({profileCurrency}). Курсы не нужны.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Курс указывается: 1 единица валюты = сколько {profileCurrency}.
        Используется для сводных расчётов (Net Worth, прогнозы).
      </p>
      <div className="space-y-2">
        {otherCurrencies.map(currency => (
          <div key={currency} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
            <span className="text-xl flex-shrink-0">{CURRENCY_FLAGS[currency] || '💱'}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">{currency}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Input
                type="number"
                step="0.01"
                value={rates[currency] ?? ''}
                onChange={(e) => handleRateChange(currency, e.target.value)}
                placeholder="0"
                className="w-24 h-8 rounded-lg text-sm"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{profileCurrency}</span>
            </div>
          </div>
        ))}
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
      >
        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        {saving ? 'Сохранение...' : 'Сохранить курсы'}
      </Button>
    </div>
  );
}