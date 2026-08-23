import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, addMonths } from 'date-fns';
import { formatDebtCurrency } from '@/services/DebtService';
import { useTranslation } from '@/lib/LanguageContext';
import { ru as ruLocale } from 'date-fns/locale';

export default function DebtPayoffChart({ simulation, currency = 'RUB' }) {
  const t = useTranslation();
  const dateLocale = ruLocale;
  const fmt = (amount) => formatDebtCurrency(amount, currency);
  const chartData = useMemo(() => {
    if (!simulation?.timeline) return [];
    return simulation.timeline.map(m => ({
      month: m.month,
      label: format(addMonths(new Date(), m.month - 1), 'MMM yy', { locale: dateLocale }),
      debt: Math.round(m.totalDebt),
    }));
  }, [simulation]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">{t('debt.no_debts_desc')}</p>
      </div>
    );
  }

  const payoffMonth = simulation.summary.monthsToPayoff;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h3 className="font-semibold text-foreground mb-1">{t('debt.payoff_forecast')}</h3>
      <p className="text-xs text-muted-foreground mb-4">
        {t('debt.payoff_date')}: {' '}
        <span className="font-medium text-foreground">
          {format(simulation.summary.payoffDate, 'd MMMM yyyy', { locale: dateLocale })}
        </span>
      </p>
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="debtPayoffGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
            <XAxis
              dataKey="label"
              stroke="rgba(128,128,128,0.5)"
              fontSize={11}
              tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 6))}
            />
            <YAxis
              stroke="rgba(128,128,128,0.5)"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
              }}
              formatter={(value) => [fmt(value), t('debt.analytics_debt')]}
              labelFormatter={(label) => `${t('debt.analytics_month')}: ${label}`}
            />
            <ReferenceLine y={0} stroke="rgba(128,128,128,0.3)" />
            <Area
              type="monotone"
              dataKey="debt"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#debtPayoffGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}