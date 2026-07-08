import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, Target } from 'lucide-react';

const GOAL_COLORS = {
  savings:        { bar: 'from-emerald-500 to-teal-400', dot: '#10b981' },
  debt_payoff:    { bar: 'from-rose-500 to-pink-400',    dot: '#e11d48' },
  investment:     { bar: 'from-violet-500 to-purple-400', dot: '#8b5cf6' },
  purchase:       { bar: 'from-amber-500 to-yellow-400', dot: '#f59e0b' },
  emergency_fund: { bar: 'from-blue-500 to-cyan-400',    dot: '#3b82f6' },
  other:          { bar: 'from-slate-500 to-slate-400',  dot: '#6b7280' },
};

export default function AllGoalsProgress({ goals, formatCurrency }) {
  if (goals.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-black/[0.04] flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-black/25" />
          </div>
          <p className="text-black/30 text-sm mb-3">Нет активных целей</p>
          <Link to={createPageUrl('Goals')}>
            <span className="inline-flex items-center gap-1.5 text-black/55 hover:text-black/80 text-xs border border-black/15 hover:border-black/25 rounded-lg px-3 py-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Создать цель
            </span>
          </Link>
        </div>
      </motion.div>
    );
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5">
          <span className="text-black/55 text-xs uppercase tracking-widest font-semibold">Цели</span>
          <Link to={createPageUrl('Goals')}>
            <span className="text-black/40 hover:text-black/70 text-xs flex items-center gap-1 transition-colors">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="p-4 space-y-4">
          {goals.map((goal, idx) => {
            const progress = goal.target_amount > 0
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              : 0;
            const scheme = GOAL_COLORS[goal.type] || GOAL_COLORS.other;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scheme.dot }} />
                    <span className="text-black/80 text-sm font-medium">{goal.title}</span>
                  </div>
                  <span className="text-black/40 text-xs font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${scheme.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-black/30 text-xs">{formatCurrency(goal.current_amount || 0)}</span>
                  <span className="text-black/30 text-xs">{formatCurrency(goal.target_amount)}</span>
                </div>
              </motion.div>
            );
          })}

          <div className="pt-2 border-t border-black/5 flex justify-between text-xs mt-2">
            <span className="text-black/35">Накоплено: <span className="text-black/65 font-medium">{formatCurrency(totalCurrent)}</span></span>
            <span className="text-black/35">Цель: <span className="text-black/65 font-medium">{formatCurrency(totalTarget)}</span></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}