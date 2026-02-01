import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, Lightbulb, Target, AlertCircle, Zap } from 'lucide-react';
import { format, subMonths, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

const RUSSIAN_BENCHMARKS = {
  food: 0.15,
  utilities: 0.08,
  transport: 0.10,
  entertainment: 0.10,
  health: 0.05,
  education: 0.08,
  clothes: 0.08,
  other: 0.36
};

export default function PremiumAnalytics() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500)
  });

  // Рассчитываем статистику по месяцам и категориям
  const monthlyStats = useMemo(() => {
    const stats = {};
    const last6Months = 6;

    for (let i = 0; i < last6Months; i++) {
      const month = subMonths(new Date(), i);
      const monthKey = format(month, 'yyyy-MM');
      const monthLabel = format(month, 'MMM', { locale: ru });

      stats[monthKey] = { label: monthLabel, date: monthKey, total: 0, categories: {} };
    }

    transactions.forEach(t => {
      const monthKey = t.date.substring(0, 7);
      if (stats[monthKey]) {
        if (t.type === 'expense') {
          stats[monthKey].total += t.amount;
          stats[monthKey].categories[t.category] = (stats[monthKey].categories[t.category] || 0) + t.amount;
        }
      }
    });

    return Object.values(stats).reverse();
  }, [transactions]);

  // Категории и их доля
  const categoryBudgets = useMemo(() => {
    const totals = {};
    const lastMonth = monthlyStats[monthlyStats.length - 1];

    if (lastMonth) {
      Object.entries(lastMonth.categories).forEach(([cat, amount]) => {
        totals[cat] = amount;
      });
    }

    const monthlyTotal = Object.values(totals).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(totals).map(([category, amount]) => {
      const percentage = (amount / monthlyTotal) * 100;
      const benchmark = RUSSIAN_BENCHMARKS[category] || 0.05;
      const benchmarkAmount = monthlyTotal * benchmark;
      const status = amount > benchmarkAmount * 1.2 ? 'high' : amount < benchmarkAmount * 0.8 ? 'low' : 'normal';

      return {
        category,
        amount,
        percentage,
        benchmark,
        benchmarkAmount,
        status
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [monthlyStats]);

  // Тренды по категориям
  const categoryTrends = useMemo(() => {
    const categories = new Set(transactions.map(t => t.category));
    const trends = {};

    categories.forEach(cat => {
      const monthlyData = monthlyStats.map(month => ({
        month: month.label,
        amount: month.categories[cat] || 0
      }));

      if (monthlyData.some(m => m.amount > 0)) {
        const amounts = monthlyData.filter(m => m.amount > 0).map(m => m.amount);
        const trend = amounts.length > 1 
          ? ((amounts[amounts.length - 1] - amounts[0]) / amounts[0]) * 100 
          : 0;
        trends[cat] = { trend, data: monthlyData };
      }
    });

    return trends;
  }, [monthlyStats, transactions]);

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const expenseSummary = categoryBudgets
        .map(c => `${c.category}: ${c.amount}₽ (${c.percentage.toFixed(0)}%, норма ${(c.benchmark * 100).toFixed(0)}%)`)
        .join('; ');

      const trends = Object.entries(categoryTrends)
        .map(([cat, data]) => `${cat}: ${data.trend > 0 ? '⬆️' : '⬇️'} ${Math.abs(data.trend).toFixed(0)}%`)
        .join('; ');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Проанализируй структуру расходов и дай конкретные рекомендации по экономии. 
        
Текущие расходы по категориям: ${expenseSummary}

Тренды (изменение за 6 месяцев): ${trends}

Дай 3-5 конкретных советов, где можно сэкономить, опираясь на эти данные. Будь критичен.`,
      });

      setInsights(response);
    } catch (error) {
      toast.error('Ошибка при анализе');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const currentMonthTotal = monthlyStats[monthlyStats.length - 1]?.total || 0;
  const previousMonthTotal = monthlyStats[monthlyStats.length - 2]?.total || 0;
  const monthChange = previousMonthTotal > 0 
    ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Премиум аналитика
            </h1>
            <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-full">
              PRO
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Глубокий анализ расходов и рекомендации по экономии
          </p>
        </motion.div>

        {/* Monthly Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Текущий месяц</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(currentMonthTotal)}</p>
              <p className={`text-sm mt-2 ${monthChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {monthChange > 0 ? '⬆️' : '⬇️'} {Math.abs(monthChange).toFixed(1)}% vs прошлый месяц
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Категорий</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{categoryBudgets.length}</p>
              <p className="text-sm text-slate-500 mt-2">{categoryBudgets.filter(c => c.status === 'high').length} выше нормы</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <CardContent className="p-6">
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">Потенциальная экономия</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(
                  categoryBudgets
                    .filter(c => c.status === 'high')
                    .reduce((sum, c) => sum + (c.amount - c.benchmarkAmount), 0)
                )}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">если вернёте к норме</p>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="benchmarks" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="benchmarks">Бенчмарки</TabsTrigger>
              <TabsTrigger value="trends">Тренды</TabsTrigger>
              <TabsTrigger value="insights">Советы</TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Benchmarks */}
          <TabsContent value="benchmarks">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {categoryBudgets.map((cat, idx) => (
                <Card key={cat.category} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white capitalize">{cat.category}</h3>
                        <p className="text-sm text-slate-500">
                          {cat.percentage.toFixed(1)}% вашего бюджета
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(cat.amount)}</p>
                        <p className={`text-sm ${
                          cat.status === 'high' ? 'text-red-600' : 
                          cat.status === 'low' ? 'text-blue-600' : 
                          'text-emerald-600'
                        }`}>
                          {cat.status === 'high' ? '⚠️ Выше нормы' : 
                           cat.status === 'low' ? '📉 Ниже нормы' : 
                           '✅ В норме'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-400">Ваш расход</span>
                        <span className="font-medium text-slate-900 dark:text-white">{cat.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            cat.status === 'high' ? 'bg-red-500' : 
                            cat.status === 'low' ? 'bg-blue-500' : 
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm mt-3">
                        <span className="text-slate-600 dark:text-slate-400">Рекомендуемо</span>
                        <span className="font-medium text-slate-900 dark:text-white">{(cat.benchmark * 100).toFixed(0)}% ({formatCurrency(cat.benchmarkAmount)})</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {Object.entries(categoryTrends).map(([category, data]) => {
                const trend = data.trend;
                const isIncreasing = trend > 0;
                return (
                  <Card key={category} className="border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="capitalize">{category}</CardTitle>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                          isIncreasing 
                            ? 'bg-red-100 dark:bg-red-900/30' 
                            : 'bg-emerald-100 dark:bg-emerald-900/30'
                        }`}>
                          {isIncreasing ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-semibold text-red-600">{trend.toFixed(1)}%</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-semibold text-emerald-600">{Math.abs(trend).toFixed(1)}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={data.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip 
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#f1f5f9'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke={isIncreasing ? '#EF4444' : '#10B981'}
                            strokeWidth={2}
                            dot={{ fill: isIncreasing ? '#EF4444' : '#10B981', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          </TabsContent>

          {/* Insights */}
          <TabsContent value="insights">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {insights ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-600" />
                      Советы по экономии
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{insights}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Получите персонализированные рекомендации на основе ваших расходов
                    </p>
                    <Button
                      onClick={getRecommendations}
                      disabled={loading}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600"
                    >
                      {loading ? 'Анализируем...' : 'Получить рекомендации'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}