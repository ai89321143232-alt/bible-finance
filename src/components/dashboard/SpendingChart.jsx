import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PieChart as PieIcon, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { INVESTMENT_CATEGORY } from '@/lib/investmentConstants';
import { useLanguage } from '@/lib/LanguageContext';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#e11d48', '#d946ef', '#0ea5e9', '#f97316'];

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚',
  'Food': '🍔', 'Transport': '🚗', 'Housing': '🏠', 'Entertainment': '🎮',
  'Health': '💊', 'Clothing': '👕', 'Subscriptions': '📱', 'Education': '📚', 'Other': '📦'
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
  switch (periodType) {
    case 'week':  return direction > 0 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
    case 'month': return direction > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
    case 'year':  return direction > 0 ? addYears(anchor, 1) : subYears(anchor, 1);
    default:      return direction > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  }
}

function formatPeriodLabel(periodType, start, end, locale, yearWord) {
  switch (periodType) {
    case 'week':
      return `${format(start, 'd MMM', { locale })} – ${format(end, 'd MMM yyyy', { locale })}`;
    case 'month':
      return format(start, 'LLLL yyyy', { locale });
    case 'year':
      return format(start, 'yyyy', { locale }) + (yearWord ? ' ' + yearWord : '');
    default:
      return format(start, 'LLLL yyyy', { locale });
  }
}

export default function SpendingChart({ transactions, formatCurrency, periodType = 'month' }) {
  const [chartType, setChartType] = useState('pie');
  const [anchor, setAnchor] = useState(new Date());
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : ru;

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
    .filter(tx => tx.type === 'expense' && tx.category !== INVESTMENT_CATEGORY)
    .reduce((acc, tx) => {
      const cat = tx.category || t('spending.other');
      acc[cat] = (acc[cat] || 0) + tx.amount;
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
      <div className="bg-popover border border-border shadow-md rounded-lg p-3 text-sm">
        <p className="text-foreground font-medium">{d.icon} {d.name}</p>
        <p className="text-muted-foreground text-xs">{formatCurrency(d.value)} · {((d.value / total) * 100).toFixed(1)}%</p>
      </div>
    );
  };

  const periodLabel = isAllTime ? t('spending.all_time') : formatPeriodLabel(periodType, start, end, dateLocale, t('spending.year_word'));
  const isCurrentPeriod = isAllTime || (() => {
    const now = new Date();
    const cur = getPeriodRange(periodType, now);
    return start.getTime() === cur.start.getTime();
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <div
        className="glass-card rounded-xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-muted-foreground text-xs uppercase tracking-widest font-medium">{t('spending.expenses_by_category')}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-md transition-colors ${chartType === 'pie' ? 'bg-muted text-foreground' : 'text-muted-foreground/60 hover:text-foreground'}`}
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-muted text-foreground' : 'text-muted-foreground/60 hover:text-foreground'}`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isAllTime && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <button
              onClick={() => setAnchor(prev => shiftAnchor(periodType, prev, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setAnchor(new Date())}
              className={`text-sm font-medium transition-colors ${isCurrentPeriod ? 'text-foreground/80' : 'text-violet-500 hover:text-violet-600'}`}
            >
              {periodLabel}
            </button>

            <button
              onClick={() => setAnchor(prev => shiftAnchor(periodType, prev, 1))}
              disabled={isCurrentPeriod}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
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
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
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
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0">
                      <p className="text-foreground/80 text-xs truncate">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{formatCurrency(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-muted-foreground/50">
            <div className="text-center">
              <PieIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('spending.no_data_period')}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}