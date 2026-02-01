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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-black">
        <CardContent className="p-6 sm:p-8">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative">
            {/* Balance Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">Общий баланс</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBalance(!showBalance)}
                className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>

            {/* Main Balance */}
            <motion.div
              key={showBalance ? 'visible' : 'hidden'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                {showBalance ? formatCurrency(totalBalance + investmentValue) : '••••••••'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isPositive 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? '+' : ''}{formatCurrency(netFlow)}
                </div>
                <span className="text-slate-500 text-xs">в этом месяце</span>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link to={createPageUrl('Accounts')}>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors">
                  <p className="text-slate-400 text-xs mb-1">Счета</p>
                  <p className="text-white font-semibold text-lg">
                    {showBalance ? formatCurrency(totalBalance) : '••••'}
                  </p>
                </div>
              </Link>
              <Link to={createPageUrl('Investments')}>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors">
                  <p className="text-slate-400 text-xs mb-1">Инвестиции</p>
                  <p className="text-white font-semibold text-lg">
                    {showBalance ? formatCurrency(investmentValue) : '••••'}
                  </p>
                </div>
              </Link>
              <Link to={createPageUrl('Transactions')}>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors">
                  <p className="text-slate-400 text-xs mb-1">Доходы</p>
                  <p className="text-emerald-400 font-semibold text-lg">
                    {showBalance ? formatCurrency(monthIncome) : '••••'}
                  </p>
                </div>
              </Link>
              <Link to={createPageUrl('Transactions')}>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors">
                  <p className="text-slate-400 text-xs mb-1">Расходы</p>
                  <p className="text-rose-400 font-semibold text-lg">
                    {showBalance ? formatCurrency(monthExpenses) : '••••'}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}