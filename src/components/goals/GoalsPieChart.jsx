import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getInvestmentValue } from '@/lib/investmentValue';

const GOAL_COLORS = ['#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#3B82F6', '#64748B', '#EC4899', '#14B8A6', '#F97316', '#A855F7'];

export default function GoalsPieChart({ goals, investments = [], formatCurrency, convert, profileCurrency }) {
  if (!goals || goals.length === 0) return null;

  // Конвертируем current_amount каждой цели в валюту профиля для корректного суммирования
  const toProfile = (amount, goal) => {
    const cur = goal.currency || profileCurrency || 'RUB';
    if (!convert || cur === profileCurrency) return amount;
    const converted = convert(amount, cur, profileCurrency);
    return converted != null ? converted : 0;
  };

  const getEffectiveAmount = (goal) => {
    const allocations = Object.fromEntries(
      (goal.linked_investment_amounts || []).filter((item) => item.investment_id).map((item) => [item.investment_id, item.amount])
    );
    const investmentValue = (goal.linked_investment_ids || []).reduce((sum, investmentId) => {
      const investment = investments.find((item) => item.id === investmentId);
      if (!investment) return sum;
      const rawValue = getInvestmentValue(investment);
      const valueInGoalCurrency = convert && investment.currency && investment.currency !== goal.currency
        ? (convert(rawValue, investment.currency, goal.currency) ?? 0)
        : rawValue;
      return sum + (allocations[investmentId] != null
        ? Math.min(valueInGoalCurrency, allocations[investmentId])
        : valueInGoalCurrency);
    }, 0);
    return (goal.current_amount || 0) + investmentValue;
  };

  const data = goals.map((goal, idx) => {
    const effectiveAmount = getEffectiveAmount(goal);
    const convertedValue = toProfile(effectiveAmount, goal);
    return {
      name: goal.title,
      value: convertedValue,
      rawValue: effectiveAmount,
      target: goal.target_amount || 0,
      rawTarget: goal.target_amount || 0,
      currency: goal.currency || profileCurrency || 'RUB',
      color: GOAL_COLORS[idx % GOAL_COLORS.length],
    };
  });

  const totalSaved = data.reduce((sum, d) => sum + d.value, 0);
  const totalTarget = goals.reduce((sum, g) => sum + toProfile(g.target_amount || 0, g), 0);
  const isMultiCurrency = data.some(d => d.currency !== (profileCurrency || 'RUB'));

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Прогресс по целям</h3>
      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              offset={20}
              wrapperStyle={{ zIndex: 1000 }}
              formatter={(value, name, props) => {
                const d = props.payload;
                const rawCur = d.currency;
                if (isMultiCurrency && convert && rawCur !== profileCurrency) {
                  return [
                    `${formatCurrency(d.rawValue, rawCur)} (~${formatCurrency(d.value)}) из ${formatCurrency(d.rawTarget, rawCur)}`,
                    name
                  ];
                }
                return [
                  `${formatCurrency(d.rawValue)} из ${formatCurrency(d.rawTarget)}`,
                  name
                ];
              }}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                fontSize: '12px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                opacity: 1,
              }}
              labelStyle={{
                color: 'hsl(var(--popover-foreground))',
                fontSize: '12px',
                fontWeight: 600,
              }}
              itemStyle={{
                color: 'hsl(var(--popover-foreground))',
                fontSize: '11px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-muted-foreground">Накоплено</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalSaved)}</span>
          <span className="text-xs text-muted-foreground">из {formatCurrency(totalTarget)}</span>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {data.map((d, idx) => {
          const pct = d.target > 0 ? Math.min((d.value / d.target) * 100, 100) : 0;
          return (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-foreground font-medium flex-1 truncate">{d.name}</span>
              <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
              <span className="text-muted-foreground tabular-nums">{formatCurrency(d.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}