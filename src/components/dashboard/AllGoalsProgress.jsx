import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { ChevronRight, Plus, Target, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const GOAL_COLORS = {
  savings:        { bar: 'from-emerald-500 to-teal-400', dot: '#10b981' },
  debt_payoff:    { bar: 'from-rose-500 to-pink-400',    dot: '#e11d48' },
  investment:     { bar: 'from-violet-500 to-purple-400', dot: '#8b5cf6' },
  purchase:       { bar: 'from-amber-500 to-yellow-400', dot: '#f59e0b' },
  emergency_fund: { bar: 'from-blue-500 to-cyan-400',    dot: '#3b82f6' },
  other:          { bar: 'from-slate-500 to-slate-400',  dot: '#6b7280' },
};

export default function AllGoalsProgress({ goals, formatCurrency }) {
  const { t } = useLanguage();
  if (goals.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">{t('goals_progress.no_active')}</p>
          <Link to={createPageUrl('Goals')}>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border hover:border-foreground/20 rounded-lg px-3 py-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> {t('goals_progress.create_goal')}
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
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <span className="text-muted-foreground text-xs uppercase tracking-widest font-semibold">{t('goals_progress.title')}</span>
          <Link to={createPageUrl('Goals')}>
            <span className="text-muted-foreground/70 hover:text-foreground text-xs flex items-center gap-1 transition-colors">
              {t('recent.all')} <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="p-4 space-y-4">
          {goals.map((goal, idx) => {
            const progress = goal.target_amount > 0
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              : 0;
            const scheme = GOAL_COLORS[goal.type] || GOAL_COLORS.other;

            // --- Разбивка: сколько откладывать в день и в месяц ---
            const remainingAmount = Math.max(0, (goal.target_amount || 0) - (goal.current_amount || 0));
            const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
            const hasDeadline = daysLeft !== null && daysLeft > 0 && remainingAmount > 0;
            const dailyAmount = hasDeadline ? remainingAmount / daysLeft : 0;
            const monthsLeft = hasDeadline ? Math.max(1, daysLeft / 30) : 0;
            const monthlyAmount = hasDeadline ? remainingAmount / monthsLeft : 0;

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
                    <span className="text-foreground text-sm font-medium">{goal.title}</span>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${scheme.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-muted-foreground/70 text-xs">{formatCurrency(goal.current_amount || 0)}</span>
                  <span className="text-muted-foreground/70 text-xs">{formatCurrency(goal.target_amount)}</span>
                </div>

                {/* Разбивка: сколько откладывать в день / месяц */}
                {hasDeadline && (
                  <div className="grid grid-cols-2 gap-2 mt-2 p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">{t('goals_progress.per_day')}</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          {formatCurrency(Math.ceil(dailyAmount))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">{t('goals_progress.per_month')}</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          {formatCurrency(Math.ceil(monthlyAmount))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          <div className="pt-2 border-t border-border flex justify-between text-xs mt-2">
            <span className="text-muted-foreground/80">{t('goals_progress.saved')}: <span className="text-foreground font-medium">{formatCurrency(totalCurrent)}</span></span>
            <span className="text-muted-foreground/80">{t('goals_progress.target')}: <span className="text-foreground font-medium">{formatCurrency(totalTarget)}</span></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}