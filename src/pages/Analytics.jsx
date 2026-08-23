import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachMonthOfInterval, subDays } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useLanguage } from '@/lib/LanguageContext';
import { useFormatCurrency } from '@/lib/formatCurrency';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Calendar, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = [
  '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
  '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#84CC16'
];

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚',
  'Зарплата': '💰', 'Фриланс': '💻', 'Инвестиции': '📈', 'Подарки': '🎁', 'Другое': '📦',
  'Food': '🍔', 'Transport': '🚗', 'Housing': '🏠', 'Entertainment': '🎮',
  'Health': '💊', 'Clothing': '👕', 'Subscriptions': '📱', 'Education': '📚',
  'Salary': '💰', 'Freelance': '💻', 'Investments': '📈', 'Gifts': '🎁', 'Other': '📦'
};

export default function Analytics() {
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : ru;

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500)
  });

  const formatCurrency = useFormatCurrency();

  // Filter transactions by period
  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate, endDate;

    if (period === 'month') {
      startDate = startOfMonth(selectedMonth);
      endDate = endOfMonth(selectedMonth);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    } else {
      startDate = subDays(now, 7);
      endDate = now;
    }

    return transactions.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  // Expenses by category
  const expensesByCategory = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      const category = tx.category || t('analytics.other');
      acc[category] = (acc[category] || 0) + tx.amount;
      return acc;
    }, {});

  const categoryData = Object.entries(expensesByCategory)
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
      icon: CATEGORY_ICONS[name] || '📦',
      percent: totalExpenses > 0 ? (value / totalExpenses * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Income by category
  const incomeByCategory = filteredTransactions
    .filter(tx => tx.type === 'income')
    .reduce((acc, tx) => {
      const category = tx.category || t('analytics.other');
      acc[category] = (acc[category] || 0) + t.amount;
      return acc;
    }, {});

  const incomeData = Object.entries(incomeByCategory)
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
      icon: CATEGORY_ICONS[name] || '📦'
    }))
    .sort((a, b) => b.value - a.value);

  // Daily/Monthly trend
  const getTrendData = () => {
    if (period === 'year') {
      const months = eachMonthOfInterval({
        start: new Date(new Date().getFullYear(), 0, 1),
        end: new Date(new Date().getFullYear(), 11, 31)
      });

      return months.map(month => {
        const monthTransactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
        });

        return {
          date: format(month, 'MMM', { locale: dateLocale }),
          income: monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses: monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        };
      });
    }

    const startDate = period === 'month' ? startOfMonth(selectedMonth) : subDays(new Date(), 7);
    const endDate = period === 'month' ? endOfMonth(selectedMonth) : new Date();
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dayTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return format(date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      return {
        date: format(day, period === 'month' ? 'd' : 'EEE', { locale: dateLocale }),
        income: dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      };
    });
  };

  const trendData = getTrendData();

  // Compare with previous period
  const getPreviousPeriodData = () => {
    const prevMonth = subMonths(selectedMonth, 1);
    const prevTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= startOfMonth(prevMonth) && date <= endOfMonth(prevMonth);
    });

    const prevExpenses = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses * 100).toFixed(1) : null;
    const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100).toFixed(1) : null;

    // Build comparison bar chart data (by day of month)
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const comparisonData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const curDayExp = filteredTransactions
        .filter(t => t.type === 'expense' && new Date(t.date).getDate() === day)
        .reduce((s, t) => s + t.amount, 0);
      const prevDayExp = prevTransactions
        .filter(t => t.type === 'expense' && new Date(t.date).getDate() === day)
        .reduce((s, t) => s + t.amount, 0);
      return { day: String(day), current: curDayExp, previous: prevDayExp };
    });

    return { prevExpenses, prevIncome, expenseChange, incomeChange, comparisonData };
  };

  const { prevExpenses, prevIncome, expenseChange, incomeChange, comparisonData } = getPreviousPeriodData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          <p className="font-medium text-slate-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'income' ? t('analytics.income') : t('analytics.expenses')}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {t('analytics.title')}
          </h1>
          <div className="flex items-center gap-3">
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="bg-white/80 dark:bg-slate-800/80">
                <TabsTrigger value="week">{t('analytics.week')}</TabsTrigger>
                <TabsTrigger value="month">{t('analytics.month')}</TabsTrigger>
                <TabsTrigger value="year">{t('analytics.year')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </motion.div>

        {/* Month Selector (for month view) */}
        {period === 'month' && (
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white capitalize">
                  {format(selectedMonth, 'LLLL yyyy', { locale: dateLocale })}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))}
                  className="rounded-xl"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                    <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">{t('analytics.income')}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalIncome)}
                </p>
                {period === 'month' && incomeChange !== null && (
                  <p className={`text-sm mt-1 flex items-center gap-1 ${parseFloat(incomeChange) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {parseFloat(incomeChange) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {parseFloat(incomeChange) > 0 ? '+' : ''}{incomeChange}% {t('analytics.vs_prev_month')}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                    <ArrowDownRight className="w-5 h-5 text-rose-600" />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">{t('analytics.expenses')}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalExpenses)}
                </p>
                {period === 'month' && expenseChange !== null && (
                  <p className={`text-sm mt-1 flex items-center gap-1 ${parseFloat(expenseChange) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {parseFloat(expenseChange) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {parseFloat(expenseChange) > 0 ? '+' : ''}{expenseChange}% {t('analytics.vs_prev_month')}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl ${netBalance >= 0 ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {netBalance >= 0 
                      ? <TrendingUp className="w-5 h-5 text-violet-600" />
                      : <TrendingDown className="w-5 h-5 text-amber-600" />
                    }
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">{t('analytics.balance')}</span>
                </div>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Month-over-Month Comparison */}
        {period === 'month' && (expenseChange !== null || incomeChange !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-lg">{t('analytics.compare_prev')}</CardTitle>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {incomeChange !== null && (
                      <span className={`flex items-center gap-1 font-semibold ${parseFloat(incomeChange) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <ArrowUpRight className="w-4 h-4" />
                        {t('analytics.income')}: {parseFloat(incomeChange) > 0 ? '+' : ''}{incomeChange}%
                      </span>
                    )}
                    {expenseChange !== null && (
                      <span className={`flex items-center gap-1 font-semibold ${parseFloat(expenseChange) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <ArrowDownRight className="w-4 h-4" />
                        {t('analytics.expenses')}: {parseFloat(expenseChange) > 0 ? '+' : ''}{expenseChange}%
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{t('analytics.expenses_this_month')}</p>
                      <p className="text-lg font-bold text-rose-600">{formatCurrency(totalExpenses)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-0.5">{t('analytics.prev_month')}</p>
                      <p className="text-lg font-bold text-slate-400">{formatCurrency(prevExpenses)}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{t('analytics.income_this_month')}</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-0.5">{t('analytics.prev_month')}</p>
                      <p className="text-lg font-bold text-slate-400">{formatCurrency(prevIncome)}</p>
                    </div>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={3} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                      <Tooltip
                        formatter={(value, name) => [formatCurrency(value), name === 'current' ? t('analytics.this_month') : t('analytics.prev_month')]}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                      />
                      <Legend formatter={(value) => value === 'current' ? t('analytics.this_month') : t('analytics.prev_month')} />
                      <Bar dataKey="previous" name="previous" fill="#94a3b8" radius={[3, 3, 0, 0]} opacity={0.6} />
                      <Bar dataKey="current" name="current" fill="#EF4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">{t('analytics.dynamics')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="income" name="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Expenses Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">{t('analytics.expenses_by_category')}</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: 'none', 
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {categoryData.slice(0, 5).map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {item.icon} {item.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {formatCurrency(item.value)}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              {item.percent}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400">
                    {t('analytics.no_expense_data')}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Expenses Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t('analytics.top_categories')}</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="space-y-4">
                  {categoryData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <span className="text-slate-400 w-6 text-sm">{index + 1}</span>
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${item.percent}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  {t('analytics.no_expense_period')}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}