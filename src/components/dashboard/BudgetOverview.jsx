import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Wallet, AlertCircle, Plus } from 'lucide-react';

export default function BudgetOverview({ budgets, formatCurrency }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Бюджеты
            </CardTitle>
            <Link to={createPageUrl('Budgets')}>
              <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                Все <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.slice(0, 4).map((budget, index) => {
                const progress = budget.limit_amount > 0 
                  ? (budget.spent_amount / budget.limit_amount) * 100 
                  : 0;
                const isOverBudget = progress > 100;
                const isWarning = progress >= budget.notify_at_percent && !isOverBudget;

                return (
                  <motion.div
                    key={budget.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {budget.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {(isOverBudget || isWarning) && (
                          <AlertCircle className={`w-3.5 h-3.5 ${
                            isOverBudget ? 'text-rose-500' : 'text-amber-500'
                          }`} />
                        )}
                        <span className={`text-xs font-medium ${
                          isOverBudget 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : isWarning 
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {formatCurrency(budget.spent_amount)} / {formatCurrency(budget.limit_amount)}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(progress, 100)} 
                      className={`h-2 ${
                        isOverBudget 
                          ? 'bg-rose-100 dark:bg-rose-900/30 [&>div]:bg-rose-500' 
                          : isWarning
                          ? 'bg-amber-100 dark:bg-amber-900/30 [&>div]:bg-amber-500'
                          : 'bg-slate-200 dark:bg-slate-600 [&>div]:bg-violet-500'
                      }`}
                    />
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-400 mb-3">Нет бюджетов</p>
              <Link to={createPageUrl('Budgets')}>
                <Button size="sm" variant="outline" className="text-violet-600 border-violet-200">
                  <Plus className="w-4 h-4 mr-1" />
                  Создать бюджет
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}