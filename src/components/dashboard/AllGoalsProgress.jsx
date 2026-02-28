import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, Target } from 'lucide-react';

const GOAL_COLORS = {
  savings:        { bar: 'from-emerald-500 to-teal-400', dot: '#34d399' },
  debt_payoff:    { bar: 'from-rose-500 to-pink-400',    dot: '#f87171' },
  investment:     { bar: 'from-violet-500 to-purple-400', dot: '#a78bfa' },
  purchase:       { bar: 'from-amber-500 to-yellow-400', dot: '#fbbf24' },
  emergency_fund: { bar: 'from-blue-500 to-cyan-400',    dot: '#60a5fa' },
  other:          { bar: 'from-slate-500 to-slate-400',  dot: '#6b7280' },
};

export default function AllGoalsProgress({ goals, formatCurrency }) {
  if (goals.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="rounded-2xl border border-white/8 bg-[#141820] p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-white/25 text-sm mb-3">Нет активных целей</p>
          <Link to={createPageUrl('Goals')}>
            <span className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-all">
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
      <div className="rounded-2xl border border-white/8 bg-[#141820] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-widest font-semibold">Цели</span>
          <Link to={createPageUrl('Goals')}>
            <span className="text-white/35 hover:text-white/70 text-xs flex items-center gap-1 transition-colors">
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
                    <span className="text-white/80 text-sm font-medium">{goal.title}</span>
                  </div>
                  <span className="text-white/35 text-xs font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${scheme.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-white/25 text-xs">{formatCurrency(goal.current_amount || 0)}</span>
                  <span className="text-white/25 text-xs">{formatCurrency(goal.target_amount)}</span>
                </div>
              </motion.div>
            );
          })}

          <div className="pt-2 border-t border-white/5 flex justify-between text-xs mt-2">
            <span className="text-white/30">Накоплено: <span className="text-white/60 font-medium">{formatCurrency(totalCurrent)}</span></span>
            <span className="text-white/30">Цель: <span className="text-white/60 font-medium">{formatCurrency(totalTarget)}</span></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}