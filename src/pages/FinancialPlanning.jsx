import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, Wallet, PieChart as PieIcon, Zap } from 'lucide-react';

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export default function FinancialPlanning() {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [goalDeadlineMonths, setGoalDeadlineMonths] = useState('12');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 200)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' })
  });

  // Рассчитываем средний месячный доход
  const calculatedIncome = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const yearTransactions = transactions.filter(t => new Date(t.date).getFullYear() === thisYear);
    const incomeTransactions = yearTransactions.filter(t => t.type === 'income');
    const months = new Set(incomeTransactions.map(t => new Date(t.date).getMonth()));
    
    if (incomeTransactions.length === 0 || months.size === 0) return 0;
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    return Math.round(totalIncome / months.size);
  }, [transactions]);

  const income = parseFloat(monthlyIncome) || calculatedIncome;

  // Калькулятор цели
  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const monthsLeft = selectedGoal ? Math.min(parseFloat(goalDeadlineMonths) || 1, 360) : 1;
  const targetAmount = selectedGoal?.target_amount || 0;
  const currentAmount = selectedGoal?.current_amount || 0;
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const monthlyNeeded = remainingAmount > 0 ? Math.ceil(remainingAmount / monthsLeft) : 0;

  // Правило 25/25/40/10
  const needs = income * 0.40; // Необходимое
  const wants = income * 0.25; // Желаемое
  const savings = income * 0.25; // Сбережения
  const tithe = income * 0.10; // Десятина
  const budgetData = [
    { name: 'Нужды (40%)', value: Math.round(needs), fill: '#3B82F6' },
    { name: 'Желания (25%)', value: Math.round(wants), fill: '#8B5CF6' },
    { name: 'Сбережения (25%)', value: Math.round(savings), fill: '#10B981' },
    { name: 'Десятина (10%)', value: Math.round(tithe), fill: '#F59E0B' }
  ];

  // Прогноз накоплений
  const months = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
  ];

  const savingsProjection = months.map((month, idx) => {
    const monthNum = idx + 1;
    return {
      month,
      savings: Math.round(savings * monthNum),
      goal: selectedGoal ? Math.min(targetAmount, currentAmount + monthlyNeeded * monthNum) : 0,
      target: selectedGoal ? targetAmount : 0
    };
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Финансовое планирование
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Умные рекомендации для ваших финансов
          </p>
        </motion.div>

        {/* Monthly Income Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-2 block">Ежемесячный доход</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      placeholder={`Или используйте среднее: ${formatCurrency(calculatedIncome)}`}
                      className="pr-8 text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
                  </div>
                  {!monthlyIncome && calculatedIncome > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      📊 Рассчитано из ваших доходов за этот год
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setMonthlyIncome(calculatedIncome.toString())}
                  className="whitespace-nowrap w-full sm:w-auto text-sm"
                >
                  Использовать среднее
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="budget" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="budget" className="text-xs sm:text-sm py-2">40/25/25/10</TabsTrigger>
              <TabsTrigger value="goals" className="text-xs sm:text-sm py-2">Цели</TabsTrigger>
              <TabsTrigger value="projection" className="text-xs sm:text-sm py-2">Прогноз</TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Budget Distribution */}
          <TabsContent value="budget">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-violet-600" />
                    Распределение дохода (правило 40/25/25/10)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={budgetData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={90}
                            dataKey="value"
                          >
                            {budgetData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend
                            formatter={(value, entry) => (
                              <span style={{ color: entry.color, fontSize: '12px' }}>{entry.payload.name}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Нужды (40%)</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(needs)}</p>
                        <p className="text-xs text-slate-500 mt-2">Еда, жилье, транспорт, коммунальные</p>
                      </div>

                      <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Желания (25%)</p>
                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{formatCurrency(wants)}</p>
                        <p className="text-xs text-slate-500 mt-2">Развлечения, хобби, рестораны</p>
                      </div>

                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Сбережения (25%)</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(savings)}</p>
                        <p className="text-xs text-slate-500 mt-2">Инвестиции, резервный фонд, накопления</p>
                      </div>

                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Десятина (10%)</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(tithe)}</p>
                        <p className="text-xs text-slate-500 mt-2">Пожертвования, благотворительность</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Совет</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      Следуйте правилу 40/25/25/10: 40% на нужды, четверть на желания, четверть откладывайте и инвестируйте, 10% — на десятину и пожертвования.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Goals Calculator */}
          <TabsContent value="goals">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-violet-600" />
                    Калькулятор: Сколько откладывать на цель
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Выберите цель</Label>
                      <select
                        value={selectedGoalId}
                        onChange={(e) => setSelectedGoalId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800"
                      >
                        <option value="">-- Выберите цель --</option>
                        {goals.map(goal => (
                          <option key={goal.id} value={goal.id}>
                            {goal.title} ({formatCurrency(goal.target_amount)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Месяцев до цели</Label>
                      <Input
                        type="number"
                        value={goalDeadlineMonths}
                        onChange={(e) => setGoalDeadlineMonths(e.target.value)}
                        min="1"
                        max="360"
                      />
                    </div>
                  </div>

                  {selectedGoal && (
                    <div className="space-y-3 sm:space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                         <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Цель</p>
                         <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate">{selectedGoal.title}</p>
                        </div>

                        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                         <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Уже накоплено</p>
                         <p className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency(selectedGoal.current_amount)}</p>
                        </div>

                        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                         <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Осталось</p>
                         <p className="text-lg sm:text-2xl font-bold text-violet-600">{formatCurrency(remainingAmount)}</p>
                        </div>

                        <div className="p-3 sm:p-4 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                         <p className="text-xs sm:text-sm text-violet-700 dark:text-violet-300 font-medium">💡 Откладывайте ежемесячно</p>
                         <p className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">{formatCurrency(monthlyNeeded)}</p>
                         <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">За {monthsLeft} месяцев</p>
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">📊 Анализ</p>
                        <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                          {monthlyNeeded <= savings ? (
                            <>
                            ✅ Вы можете откладывать <span className="font-semibold">{formatCurrency(monthlyNeeded)}</span> в месяц из бюджета на сбережения ({formatCurrency(savings)})
                            </>
                          ) : (
                            <>
                            ⚠️ Нужно откладывать <span className="font-semibold">{formatCurrency(monthlyNeeded)}</span>, но это больше чем 40% вашего дохода. Рассмотрите увеличение срока или снижение расходов.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Projection */}
          <TabsContent value="projection">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-600" />
                    Прогноз накоплений на год
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={savingsProjection}>
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
                      <Legend />
                      <Line 
                      type="monotone" 
                      dataKey="savings" 
                      name="Сбережения (40%)" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                      />
                      {selectedGoal && (
                        <>
                          <Line 
                            type="monotone" 
                            dataKey="goal" 
                            name={`${selectedGoal.title} (прогноз)`}
                            stroke="#8B5CF6" 
                            strokeWidth={2}
                            dot={{ fill: '#8B5CF6', r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="target" 
                            name={`${selectedGoal.title} (цель)`}
                            stroke="#EF4444" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2">За 6 месяцев</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(savings * 6)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2">За год</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(savings * 12)}
                    </p>
                  </CardContent>
                </Card>

                {selectedGoal && (
                  <Card className="border-0 shadow-sm col-span-1 sm:col-span-2 lg:col-span-1">
                    <CardContent className="p-4 sm:p-6">
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2">Прогноз на конец года</p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(currentAmount + monthlyNeeded * 12)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}