import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ShieldCheck, Info } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { calcBudgetSpent } from '@/lib/budgetSpent';
import { getInvestmentValue, convertInvestmentValue } from '@/lib/investmentValue';

export default function SafeDailyLimit({ budgets = [], accounts = [], investments = [], subscriptions = [], transactions = [], currentUser, formatCurrency }) {
  const { t } = useLanguage();
  const { convert, profileCurrency } = useExchangeRates();
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(1, monthEnd.getDate() - now.getDate() + 1);
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const toProfile = (amount, currency) => currency === profileCurrency ? Number(amount || 0) : (convert(Number(amount || 0), currency || profileCurrency, profileCurrency) || 0);
  const recent = transactions.filter((item) => new Date(item.date) >= cutoff);
  const hasIncomeHistory = recent.some((item) => item.type === 'income');
  const accountScopeMap = new Map(accounts.map((item) => [item.id, item.scope || 'personal']));
  const budgetLimit = budgets.reduce((sum, item) => sum + Number(item.limit_amount || 0), 0);
  const budgetSpent = budgets.reduce((sum, item) => sum + calcBudgetSpent(item, transactions, currentUser?.id, accountScopeMap, convert), 0);
  const budgetDaily = Math.max(0, budgetLimit - budgetSpent) / daysLeft;
  const availableBalance = accounts.reduce((sum, item) => sum + toProfile(Math.max(0, Number(item.balance || 0) - Number(item.frozen_amount || 0)), item.currency), 0);
  const upcoming = subscriptions.filter((item) => item.is_active && !item.cancelled && item.next_charge_date).filter((item) => {
    const date = new Date(item.next_charge_date);
    return date >= now && date <= monthEnd;
  }).reduce((sum, item) => sum + toProfile(item.amount, item.currency), 0);
  const cushionTotal = investments.filter((item) => item.type === 'deposit' && item.is_safety_cushion).reduce((sum, item) => sum + convertInvestmentValue(getInvestmentValue(item), item.currency || profileCurrency, profileCurrency, convert), 0);
  const hasBudgets = budgetLimit > 0;
  const balanceDaily = Math.max(0, availableBalance - upcoming) / daysLeft;
  const safeDaily = hasIncomeHistory ? (hasBudgets ? Math.min(budgetDaily, balanceDaily) : balanceDaily) : budgetDaily;
  const coveragePercent = cushionTotal > 0 ? Math.min(100, availableBalance / cushionTotal * 100) : 0;

  if (!hasBudgets && availableBalance === 0) return null;

  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center"><Wallet className="w-3.5 h-3.5 text-amber-500" /></div><span className="text-muted-foreground text-sm">{t('safedaily.title')}</span></div>
    {hasIncomeHistory ? <p className="text-amber-500 font-bold text-lg">{formatCurrency(safeDaily)}</p> : <div className="rounded-xl bg-amber-500/10 p-3 text-sm"><div className="flex gap-2"><Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p>Доходов за последние 3 месяца пока нет. Прогноз и балансный дневной лимит появятся после 2–3 месяцев учёта.</p></div>{hasBudgets && <p className="mt-2 font-bold text-amber-500">По бюджетам: {formatCurrency(budgetDaily)} в день</p>}</div>}
    <div className="mt-3 space-y-2 text-sm">
      {hasBudgets && <div className="flex justify-between text-muted-foreground"><span>{t('safedaily.by_budget')}</span><span className="text-foreground">{formatCurrency(budgetDaily)}</span></div>}
      {hasIncomeHistory && <div className="flex justify-between text-muted-foreground"><span>{t('safedaily.by_balance')}</span><span className="text-foreground">{formatCurrency(balanceDaily)}</span></div>}
      {cushionTotal > 0 && <div className="rounded-xl bg-sky-500/10 p-2.5"><div className="flex justify-between gap-2"><span className="flex items-center gap-1 text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5 text-sky-500" />Подушка безопасности</span><span>{formatCurrency(cushionTotal)}</span></div><p className="mt-1 text-muted-foreground">Доступные счета покрывают подушку на {Math.round(coveragePercent)}%{hasBudgets ? ` · ${Math.round(cushionTotal / budgetLimit * 100)}% месячных бюджетов` : ''}</p></div>}
    </div>
  </motion.div>;
}