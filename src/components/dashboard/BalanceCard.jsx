import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Eye, EyeOff, TrendingUp, TrendingDown, Wallet, BarChart2, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function BalanceCard({
  totalBalance,
  monthIncome,
  monthExpenses,
  investmentValue,
  investmentProfit,
  formatCurrency,
  accounts = [],
  investments = []
}) {
  const [showBalance, setShowBalance] = useState(true);
  const netFlow = monthIncome - monthExpenses;
  const isPositive = netFlow >= 0;

  // Calculate debt breakdown — only accounts with negative balance (regardless of type)
  const totalDebt = accounts
    .filter(a => (a.balance || 0) < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);
  const hasDebt = totalDebt > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6 sm:p-8">
        {/* Balance Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center">
              <Wallet className="w-3 h-3 text-violet-600" />
            </div>
            <span className="text-black/50 text-xs uppercase tracking-widest font-medium">Общий баланс</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowBalance(!showBalance)}
            className="text-black/40 hover:text-black/70 hover:bg-black/5 h-7 w-7"
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
          <h2 className="text-4xl sm:text-5xl font-bold text-black tracking-tight">
            {showBalance ? formatCurrency(totalBalance + investmentValue) : '••••••'}
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              isPositive
                ? 'bg-emerald-500/15 text-emerald-600'
                : 'bg-rose-500/15 text-rose-600'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{formatCurrency(netFlow)}
            </span>
            <span className="text-black/35 text-xs">в этом месяце</span>
            {hasDebt && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600">
                <CreditCard className="w-3 h-3" />
                Долг: {formatCurrency(-totalDebt)}
              </span>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Счета', value: formatCurrency(totalBalance), icon: Wallet, color: 'text-violet-600', bg: 'bg-violet-500/10', link: 'Accounts' },
            { label: 'Инвестиции', value: formatCurrency(investmentValue), icon: BarChart2, color: 'text-cyan-600', bg: 'bg-cyan-500/10', link: 'Investments' },
            { label: 'Доходы', value: formatCurrency(monthIncome), icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-500/10', link: 'Transactions' },
            { label: 'Расходы', value: formatCurrency(monthExpenses), icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-500/10', link: 'Transactions' },
          ].map((stat) => (
            <Link key={stat.label} to={createPageUrl(stat.link)}>
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 hover:bg-black/[0.04] transition-all group cursor-pointer">
                <div className={`w-6 h-6 rounded-md ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
                <p className="text-black/40 text-xs mb-1">{stat.label}</p>
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