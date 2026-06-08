import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';

const COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#e879f9', '#38bdf8', '#fb923c'];

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚', 'Другое': '📦'
};

export default function SpendingChart({ transactions, formatCurrency }) {
  const [chartType, setChartType] = useState('pie');
  const navigate = useNavigate();

  const handleCategoryClick = (category) => {
    navigate(`/Transactions?category=${encodeURIComponent(category)}`);
  };

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'Другое';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});

  const chartData = Object.entries(expensesByCategory)
    .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length], icon: CATEGORY_ICONS[name] || '📦' }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, i) => sum + i.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#1a1f2e] border border-white/10 rounded-lg p-3 text-sm">
        <p className="text-white/80 font-medium">{d.icon} {d.name}</p>
        <p className="text-white/50 text-xs">{formatCurrency(d.value)} · {((d.value / total) * 100).toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <div className="rounded-xl border border-white/8 bg-[#141820] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-white/40 text-xs uppercase tracking-widest font-medium">Расходы по категориям</span>
          <div className="flex gap-1">
            <button
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-md transition-colors ${chartType === 'pie' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="p-4">
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="w-full lg:w-1/2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value"
                        onClick={(d) => handleCategoryClick(d.name)}
                        style={{ cursor: 'pointer' }}
                      >
                        {chartData.map((_, i) => <Cell key={i} fill={chartData[i].color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData} layout="vertical" onClick={(d) => d?.activePayload && handleCategoryClick(d.activePayload[0].payload.name)} style={{ cursor: 'pointer' }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={chartData[i].color} />)}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="w-full lg:w-1/2 grid grid-cols-2 gap-2">
                {chartData.slice(0, 6).map((item) => (
                  <div
                    key={item.name}
                    onClick={() => handleCategoryClick(item.name)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/8 transition-colors cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0">
                      <p className="text-white/65 text-xs truncate">{item.name}</p>
                      <p className="text-white/35 text-xs">{formatCurrency(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-white/20">
            <div className="text-center">
              <PieIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Нет данных о расходах</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}