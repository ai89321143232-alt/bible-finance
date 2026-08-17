import React from 'react';
import { Snowflake, TrendingDown, ArrowRight, Clock, Wallet } from 'lucide-react';
import { formatDebtCurrency } from '@/services/DebtService';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function StrategyComparison({ comparison }) {
  if (!comparison) return null;

  const { snowball, avalanche, savings, monthsSaved } = comparison;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h3 className="font-semibold text-foreground mb-1">Сравнение стратегий</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Выберите подходящий метод погашения
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Snowball */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-foreground">Снежный ком</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Сначала маленькие долги</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Срок:</span>
              <span className="font-medium text-foreground">{snowball.monthsToPayoff} мес.</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Wallet className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Переплата:</span>
              <span className="font-medium text-amber-500">{formatDebtCurrency(snowball.totalInterest)}</span>
            </div>
          </div>
        </div>

        {/* Avalanche */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-foreground">Лавина</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Сначала дорогие долги</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Срок:</span>
              <span className="font-medium text-foreground">{avalanche.monthsToPayoff} мес.</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Wallet className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Переплата:</span>
              <span className="font-medium text-emerald-500">{formatDebtCurrency(avalanche.totalInterest)}</span>
            </div>
          </div>
        </div>
      </div>

      {savings > 0 && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-xs text-emerald-600">
            Стратегия «Лавина» экономит{' '}
            <span className="font-bold">{formatDebtCurrency(savings)}</span>
            {monthsSaved > 0 && ` и ${monthsSaved} мес. времени`}
            по сравнению с «Снежным комом»
          </p>
        </div>
      )}
    </div>
  );
}