import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Target } from 'lucide-react';

const GOAL_COLORS = {
  savings: '#10B981',
  debt_payoff: '#EF4444',
  investment: '#8B5CF6',
  purchase: '#F59E0B',
  emergency_fund: '#3B82F6',
  other: '#64748B'
};

export default function AllGoalsProgress({ goals, formatCurrency }) {
  if (goals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Цели
              </CardTitle>
              <Link to={createPageUrl('Goals')}>
                <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                  Создать <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-400 text-sm">Нет активных целей</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Calculate overall progress
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  // Create segments for the circular progress
  const segments = goals.map(goal => {
    const progress = goal.target_amount > 0 
      ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
      : 0;
    return {
      id: goal.id,
      title: goal.title,
      progress,
      color: GOAL_COLORS[goal.type] || GOAL_COLORS.other,
      current: goal.current_amount,
      target: goal.target_amount
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Цели
            </CardTitle>
            <Link to={createPageUrl('Goals')}>
              <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                Все <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            {/* Circular Progress */}
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-slate-200 dark:text-slate-700"
                />
                {segments.map((segment, index) => {
                  const offset = segments.slice(0, index).reduce((sum, s) => sum + (s.progress / goals.length), 0);
                  const segmentLength = (segment.progress / goals.length);
                  const circumference = 2 * Math.PI * 56;
                  const strokeDasharray = `${(segmentLength / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((offset / 100) * circumference);
                  
                  return (
                    <circle
                      key={segment.id}
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={segment.color}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {overallProgress.toFixed(0)}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {goals.length} {goals.length === 1 ? 'цель' : 'цели'}
                  </p>
                </div>
              </div>
            </div>

            {/* Goals List */}
            <div className="w-full space-y-2">
              {segments.map((segment) => (
                <div 
                  key={segment.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {segment.title}
                    </span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white ml-2">
                    {segment.progress.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="w-full mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Накоплено</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(totalCurrent)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500 dark:text-slate-400">Цель</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(totalTarget)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}