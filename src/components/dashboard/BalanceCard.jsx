import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BalanceCard({ 
  totalBalance, 
  monthIncome, 
  monthExpenses,
  investmentValue,
  investmentProfit,
  formatCurrency 
}) {
  const [showBalance, setShowBalance] = React.useState(true);
  const netFlow = monthIncome - monthExpenses;
  const isPositive = netFlow >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <div className="rounded-xl border border-white/8 bg-[#141820] p-6 sm:p-8">
        {/* Balance Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/40 text-xs uppercase tracking-widest font-medium">Общий баланс</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowBalance(!showBalance)}
            className="text-white/30 hover:text-white/70 hover:bg-white/5 h-7 w-7"
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
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {showBalance ? formatCurrency(totalBalance + investmentValue) : '••••••'}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{formatCurrency(netFlow)}
            </span>
            <span className="text-white/25 text-xs">в этом месяце</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Счета', value: formatCurrency(totalBalance), color: 'text-white', link: 'Accounts' },
            { label: 'Инвестиции', value: formatCurrency(investmentValue), color: 'text-white', link: 'Investments' },
            { label: 'Доходы', value: formatCurrency(monthIncome), color: 'text-emerald-400', link: 'Transactions' },
            { label: 'Расходы', value: formatCurrency(monthExpenses), color: 'text-rose-400', link: 'Transactions' },
          ].map((stat) => (
            <Link key={stat.label} to={createPageUrl(stat.link)}>
              <div className="rounded-lg border border-white/5 bg-white/3 p-3.5 hover:bg-white/6 transition-colors cursor-pointer">
                <p className="text-white/35 text-xs mb-1">{stat.label}</p>
                <p className={`font-semibold text-base ${stat.color}`}>
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