import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Eye, EyeOff, TrendingUp, TrendingDown, Wallet, BarChart2, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/lib/LanguageContext';
import { groupBalancesByCurrency } from '@/lib/groupByCurrency';
import { useExchangeRates } from '@/hooks/useExchangeRates';

export default function BalanceCard({
  totalBalance,
  monthIncome,
  monthExpenses,
  investmentValue,
  investmentProfit,
  formatCurrency,
  accounts = [],
  investments = [],
  debtAccounts = []
}) {
  const [showBalance, setShowBalance] = useState(true);
  const { t } = useLanguage();
  const netFlow = monthIncome - monthExpenses;
  const isPositive = netFlow >= 0;

  const { convert, hasRate, profileCurrency, isMultiCurrency } = useExchangeRates();

  // Замороженные средства — конвертируем в валюту профиля
  const totalFrozen = accounts.reduce((sum, a) => {
    const val = a.frozen_amount || 0;
    const cur = a.currency || profileCurrency;
    if (cur === profileCurrency) return sum + val;
    const converted = convert(val, cur, profileCurrency);
    return converted != null ? sum + converted : sum;
  }, 0);

  // Долг — из DebtAccount (единый источник правды), fallback на отрицательный баланс
  const activeDebts = debtAccounts.filter(d => d.status !== 'paid_off' && d.remaining_amount > 0);
  const linkedIds = new Set(activeDebts.map(d => d.linked_account_id));
  const totalDebt = activeDebts.reduce((s, d) => {
    const val = d.remaining_amount || 0;
    const cur = d.currency || profileCurrency;
    if (cur === profileCurrency) return s + val;
    const converted = convert(val, cur, profileCurrency);
    return converted != null ? s + converted : s;
  }, 0) + accounts.filter(a => a.type === 'credit' && (a.balance || 0) < 0 && !linkedIds.has(a.id))
    .reduce((s, a) => {
      const val = Math.abs(a.balance || 0);
      const cur = a.currency || profileCurrency;
      if (cur === profileCurrency) return s + val;
      const converted = convert(val, cur, profileCurrency);
      return converted != null ? s + converted : s;
    }, 0);
  const hasDebt = totalDebt > 0;

  // Мультивалютная разбивка балансов
  const balancesByCurrency = groupBalancesByCurrency(accounts);

  // Общий баланс в валюте профиля (с конвертацией по ручным курсам)
  const totalBalanceConverted = Object.entries(balancesByCurrency).reduce((sum, [cur, bal]) => {
    if (cur === profileCurrency) return sum + bal;
    const converted = convert(bal, cur, profileCurrency);
    return converted != null ? sum + converted : sum;
  }, 0);

  // Валюты без курса (не вошли в общий итог)
  const currenciesWithoutRate = Object.entries(balancesByCurrency)
    .filter(([cur]) => cur !== profileCurrency && !hasRate(cur));

  const hasMultipleCurrencies = Object.keys(balancesByCurrency).length > 1;
  const displayBalance = hasMultipleCurrencies ? totalBalanceConverted : totalBalance;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center">
              <Wallet className="w-3 h-3 text-violet-500" />
            </div>
            <span className="text-muted-foreground text-xs uppercase tracking-widest font-medium">{t('balance.total_balance')}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowBalance(!showBalance)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 w-7"
          >
            {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <motion.div
          key={showBalance ? 'visible' : 'hidden'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            {showBalance ? formatCurrency(displayBalance + investmentValue) : '••••••'}
          </h2>
          {/* Разбивка по валютам */}
          {hasMultipleCurrencies && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(balancesByCurrency).map(([cur, bal]) => (
                <span key={cur} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium">
                  {showBalance ? formatCurrency(bal, cur) : '•••'}
                </span>
              ))}
            </div>
          )}
          {currenciesWithoutRate.length > 0 && (
            <p className="text-xs text-amber-500 mt-1.5">
              Без курса: {currenciesWithoutRate.map(([cur]) => cur).join(', ')} — задайте курс в Настройках
            </p>
          )}
          {totalFrozen > 0 && (
            <p className="text-xs text-amber-500 mt-1">
              {t('balance.frozen_for_goals')}: {showBalance ? formatCurrency(totalFrozen) : '••••'} • {t('balance.available')}: {showBalance ? formatCurrency((hasMultipleCurrencies ? totalBalanceConverted : totalBalance) - totalFrozen) : '••••'}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              isPositive
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-rose-500/15 text-rose-500'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{formatCurrency(netFlow)}
            </span>
            <span className="text-muted-foreground/70 text-xs">{t('balance.this_month')}</span>
            {hasDebt && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-500">
                <CreditCard className="w-3 h-3" />
                {t('balance.debt')}: {formatCurrency(-totalDebt)}
              </span>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('balance.accounts'), value: formatCurrency(displayBalance - totalFrozen), icon: Wallet, color: 'text-violet-500', bg: 'bg-violet-500/10', link: 'Accounts' },
            { label: t('balance.investments'), value: formatCurrency(investmentValue), icon: BarChart2, color: 'text-cyan-500', bg: 'bg-cyan-500/10', link: 'Investments' },
            { label: t('balance.income'), value: formatCurrency(monthIncome), icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10', link: 'Transactions' },
            { label: t('balance.expenses'), value: formatCurrency(monthExpenses), icon: ArrowDownRight, color: 'text-rose-500', bg: 'bg-rose-500/10', link: 'Transactions' },
          ].map((stat) => (
            <Link key={stat.label} to={createPageUrl(stat.link)}>
              <div className="rounded-xl border border-border bg-muted/50 p-3.5 hover:bg-muted transition-all group cursor-pointer">
                <div className={`w-6 h-6 rounded-md ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
                <p className="text-muted-foreground text-xs mb-1">{stat.label}</p>
                <p className={`font-semibold text-sm ${stat.color}`}>
                  {showBalance ? stat.value : '••••'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}