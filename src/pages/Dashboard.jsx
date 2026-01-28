import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, Plus, Wallet,
  PiggyBank, Target, ChevronRight, Sparkles, CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import QuickAddTransaction from '@/components/transactions/QuickAddTransaction';
import BalanceCard from '@/components/dashboard/BalanceCard';
import SpendingChart from '@/components/dashboard/SpendingChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import GoalProgress from '@/components/dashboard/GoalProgress';
import BudgetOverview from '@/components/dashboard/BudgetOverview';

export default function Dashboard() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentPeriod] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 50)
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => base44.entities.Budget.filter({ is_active: true })
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' })
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => base44.entities.Investment.list()
  });

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date >= currentPeriod.start && date <= currentPeriod.end;
  });

  const monthIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const investmentValue = investments.reduce((sum, inv) => 
    sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0
  );

  const investmentProfit = investments.reduce((sum, inv) => 
    sum + (inv.quantity * ((inv.current_price || inv.purchase_price) - inv.purchase_price)), 0
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Привет! 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {format(new Date(), "EEEE, d MMMM", { locale: ru })}
            </p>
          </div>
          <Button
            onClick={() => setShowQuickAdd(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl h-11 px-5"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Добавить</span>
          </Button>
        </motion.div>

        {/* Main Balance Card */}
        <BalanceCard 
          totalBalance={totalBalance}
          monthIncome={monthIncome}
          monthExpenses={monthExpenses}
          investmentValue={investmentValue}
          investmentProfit={investmentProfit}
          formatCurrency={formatCurrency}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                    <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Доходы</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(monthIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                    <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Расходы</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(monthExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                    <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Инвестиции</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(investmentValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Link to={createPageUrl('AIAssistant')}>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/80">AI Ассистент</p>
                      <p className="text-lg font-semibold text-white flex items-center gap-1">
                        Спросить
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Chart & Transactions */}
          <div className="lg:col-span-2 space-y-6">
            <SpendingChart transactions={monthTransactions} formatCurrency={formatCurrency} />
            <RecentTransactions transactions={transactions.slice(0, 5)} formatCurrency={formatCurrency} />
          </div>

          {/* Right Column - Budgets & Goals */}
          <div className="space-y-6">
            <BudgetOverview budgets={budgets} formatCurrency={formatCurrency} />
            <GoalProgress goals={goals} formatCurrency={formatCurrency} />
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showQuickAdd && (
          <QuickAddTransaction 
            onClose={() => setShowQuickAdd(false)}
            accounts={accounts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}