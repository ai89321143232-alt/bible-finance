import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Target, Plus } from 'lucide-react';

const GOAL_ICONS = {
  savings: '💰',
  debt_payoff: '📉',
  investment: '📈',
  purchase: '🛍️',
  emergency_fund: '🛡️',
  other: '🎯'
};

export default function GoalProgress({ goals, formatCurrency }) {
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
          {goals.length > 0 ? (
            <div className="space-y-4">
              {goals.slice(0, 3).map((goal, index) => {
                const progress = goal.target_amount > 0 
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0;
                
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{GOAL_ICONS[goal.type] || '🎯'}</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {goal.title}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      className="h-2 bg-slate-200 dark:bg-slate-600"
                    />
                    <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatCurrency(goal.current_amount)}</span>
                      <span>{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-400 mb-3">Нет активных целей</p>
              <Link to={createPageUrl('Goals')}>
                <Button size="sm" variant="outline" className="text-violet-600 border-violet-200">
                  <Plus className="w-4 h-4 mr-1" />
                  Создать цель
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}