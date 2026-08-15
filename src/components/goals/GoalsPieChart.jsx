import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const GOAL_COLORS = ['#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#3B82F6', '#64748B', '#EC4899', '#14B8A6', '#F97316', '#A855F7'];

export default function GoalsPieChart({ goals, formatCurrency }) {
  if (!goals || goals.length === 0) return null;

  const data = goals.map((goal, idx) => ({
    name: goal.title,
    value: goal.current_amount || 0,
    target: goal.target_amount || 0,
    color: GOAL_COLORS[idx % GOAL_COLORS.length],
  })).filter(d => d.value > 0);

  if (data.length === 0) return null;

  const totalSaved = data.reduce((sum, d) => sum + d.value, 0);
  const totalTarget = goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);

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
              formatter={(value, name, props) => [
                `${formatCurrency(value)} из ${formatCurrency(props.payload.target)}`,
                name
              ]}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                fontSize: '12px',
                padding: '8px 12px',
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