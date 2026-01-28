import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';

const COLORS = [
  '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', 
  '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#8B5CF6'
];

const CATEGORY_ICONS = {
  'Еда': '🍔',
  'Транспорт': '🚗',
  'Жильё': '🏠',
  'Развлечения': '🎮',
  'Здоровье': '💊',
  'Одежда': '👕',
  'Подписки': '📱',
  'Образование': '📚',
  'Другое': '📦'
};

export default function SpendingChart({ transactions, formatCurrency }) {
  const [chartType, setChartType] = useState('pie');

  // Group expenses by category
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const category = t.category || 'Другое';
      acc[category] = (acc[category] || 0) + t.amount;
      return acc;
    }, {});

  const chartData = Object.entries(expensesByCategory)
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
      icon: CATEGORY_ICONS[name] || '📦'
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <span>{data.icon}</span>
            {data.name}
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            {formatCurrency(data.value)}
          </p>
          <p className="text-slate-400 text-xs">
            {((data.value / total) * 100).toFixed(1)}% от расходов
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Расходы по категориям
            </CardTitle>
            <Tabs value={chartType} onValueChange={setChartType}>
              <TabsList className="bg-slate-100 dark:bg-slate-700 h-9">
                <TabsTrigger value="pie" className="h-7 px-3">
                  <PieIcon className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="bar" className="h-7 px-3">
                  <BarChart2 className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Chart */}
              <div className="w-full lg:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="w-full lg:w-1/2 grid grid-cols-2 gap-2">
                {chartData.slice(0, 6).map((item, index) => (
                  <div 
                    key={item.name}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {item.icon} {item.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <PieIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Нет данных о расходах</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}