import React from 'react';
import { Snowflake, TrendingDown, ArrowRight, Clock, Wallet } from 'lucide-react';
import { formatDebtCurrency } from '@/services/DebtService';
import { useTranslation } from '@/lib/LanguageContext';

export default function StrategyComparison({ comparison, currency = 'RUB' }) {
  const t = useTranslation();
  const fmt = (amount) => formatDebtCurrency(amount, currency);

  if (!comparison) return null;

  const { snowball, avalanche, savings, monthsSaved } = comparison;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h3 className="font-semibold text-foreground mb-1">{t('debt.compare_title')}</h3>
      <p className="text-xs text-muted-foreground mb-4">
        {t('debt.compare_subtitle')}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Snowball */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-foreground">{t('debt.compare_snowball')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('debt.compare_snowball_desc')}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('debt.compare_term')}</span>
              <span className="font-medium text-foreground">{snowball.monthsToPayoff} {t('debt.analytics_months')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Wallet className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('debt.compare_overpayment')}</span>
              <span className="font-medium text-amber-500">{fmt(snowball.totalInterest)}</span>
            </div>
          </div>
        </div>

        {/* Avalanche */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-foreground">{t('debt.compare_avalanche')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('debt.compare_avalanche_desc')}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('debt.compare_term')}</span>
              <span className="font-medium text-foreground">{avalanche.monthsToPayoff} {t('debt.analytics_months')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Wallet className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{t('debt.compare_overpayment')}</span>
              <span className="font-medium text-emerald-500">{fmt(avalanche.totalInterest)}</span>
            </div>
          </div>
        </div>
      </div>

      {savings > 0 && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-600">
            {t('debt.compare_savings')
              .replace('{amount}', fmt(savings))
              .replace('{months}', monthsSaved > 0 ? `${t('debt.compare_and')}${monthsSaved} ${t('debt.analytics_months')}` : '')}
          </p>
        </div>
      )}
    </div>
  );
}