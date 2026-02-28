import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';

const GOAL_COLORS = {
  savings: '#34d399', debt_payoff: '#f87171', investment: '#a78bfa',
  purchase: '#fbbf24', emergency_fund: '#60a5fa', other: '#6b7280'
};

export default function AllGoalsProgress({ goals, formatCurrency }) {
  if (goals.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="rounded-xl border border-white/8 bg-[#141820] p-6 text-center">
          <p className="text-white/25 text-sm mb-3">Нет активных целей</p>
          <Link to={createPageUrl('Goals')}>
            <span className="inline-flex items-center gap-1 text-white/50 hover:text-white/80 text-xs border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Создать цель
            </span>
          </Link>
        </div>
      </motion.div>
    );
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <div className="rounded-xl border border-white/8 bg-[#141820] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-white/40 text-xs uppercase tracking-widest font-medium">Цели</span>
          <Link to={createPageUrl('Goals')}>
            <span className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1 transition-colors">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="p-4 space-y-3">
          {goals.map((goal) => {
            const progress = goal.target_amount > 0
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              : 0;
            const color = GOAL_COLORS[goal.type] || GOAL_COLORS.other;

            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-white/75 text-sm">{goal.title}</span>
                  </div>
                  <span className="text-white/40 text-xs">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}

          <div className="pt-2 border-t border-white/5 flex justify-between text-xs">
            <span className="text-white/30">Накоплено: <span className="text-white/60">{formatCurrency(totalCurrent)}</span></span>
            <span className="text-white/30">Цель: <span className="text-white/60">{formatCurrency(totalTarget)}</span></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}