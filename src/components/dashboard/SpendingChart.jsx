import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PieChart as PieIcon, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { ru } from 'date-fns/locale';

const COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#e879f9', '#38bdf8', '#fb923c'];

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚', 'Другое': '📦'
};

function getPeriodRange(periodType, anchor) {
  const d = anchor || new Date();
  switch (periodType) {
    case 'week':   return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
    case 'month':  return { start: startOfMonth(d), end: endOfMonth(d) };
    case 'year':   return { start: startOfYear(d), end: endOfYear(d) };
    default:       return { start: startOfMonth(d), end: endOfMonth(d) };
  }
}

function shiftAnchor(periodType, anchor, direction) {
  // direction: +1 = вперёд, -1 = назад
  switch (periodType) {
    case 'week':  return direction > 0 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
    case 'month': return direction > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
    case 'year':  return direction > 0 ? addYears(anchor, 1) : subYears(anchor, 1);
    default:      return direction > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  }
}

function formatPeriodLabel(periodType, start, end) {
  switch (periodType) {
    case 'week':
      return `${format(start, 'd MMM', { locale: ru })} – ${format(end, 'd MMM yyyy', { locale: ru })}`;
    case 'month':
      return format(start, 'LLLL yyyy', { locale: ru });
    case 'year':
      return format(start, 'yyyy', { locale: ru }) + ' год';
    default:
      return format(start, 'LLLL yyyy', { locale: ru });
  }
}

export default function SpendingChart({ transactions, formatCurrency, periodType = 'month' }) {
  const [chartType, setChartType] = useState('pie');
  const [anchor, setAnchor] = useState(new Date());
  const navigate = useNavigate();

  // Свайп
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setAnchor(prev => shiftAnchor(periodType, prev, diff > 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  // Если период "all" — не показываем навигацию, используем все переданные транзакции
  const isAllTime = periodType === 'all';

  const { start, end } = isAllTime ? { start: null, end: null } : getPeriodRange(periodType, anchor);

  const periodTransactions = isAllTime
    ? transactions
    : transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

  const handleCategoryClick = (category) => {
    navigate(`/Transactions?category=${encodeURIComponent(category)}`);
  };

  const expensesByCategory = periodTransactions
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

  const periodLabel = isAllTime ? 'Всё время' : formatPeriodLabel(periodType, start, end);
  const isCurrentPeriod = isAllTime || (() => {
    const now = new Date();
    const cur = getPeriodRange(periodType, now);
    return start.getTime() === cur.start.getTime();
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <div
        className="rounded-xl border border-white/8 bg-[#141820] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
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

        {/* Period Navigation */}
        {!isAllTime && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <button
              onClick={() => setAnchor(prev => shiftAnchor(periodType, prev, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setAnchor(new Date())}
              className={`text-sm font-medium transition-colors ${isCurrentPeriod ? 'text-white/70' : 'text-violet-400 hover:text-violet-300'}`}
            >
              {periodLabel}
            </button>

            <button
              onClick={() => setAnchor(prev => shiftAnchor(periodType, prev, 1))}
              disabled={isCurrentPeriod}
              className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

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
              <p className="text-sm">Нет данных за этот период</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}