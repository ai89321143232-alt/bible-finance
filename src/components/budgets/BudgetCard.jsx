import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Edit2, Trash2, Lock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const BUDGET_CATEGORIES = [
  { value: 'Еда', icon: '🍔', color: '#F59E0B' },
  { value: 'Транспорт', icon: '🚗', color: '#3B82F6' },
  { value: 'Жильё', icon: '🏠', color: '#8B5CF6' },
  { value: 'Развлечения', icon: '🎮', color: '#EC4899' },
  { value: 'Здоровье', icon: '💊', color: '#10B981' },
  { value: 'Одежда', icon: '👕', color: '#6366F1' },
  { value: 'Подписки', icon: '📱', color: '#EF4444' },
  { value: 'Образование', icon: '📚', color: '#14B8A6' },
  { value: 'Другое', icon: '📦', color: '#64748B' },
];

export default function BudgetCard({ 
  budget, 
  index, 
  spent, 
  isEditable,
  onEdit, 
  onDelete,
  formatCurrency 
}) {
  const progress = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
  const isOverBudget = progress > 100;
  const isWarning = progress >= (budget.notify_at_percent || 80) && !isOverBudget;
  const budgetCategories = budget.categories || (budget.category ? [budget.category] : []);
  const catInfo = BUDGET_CATEGORIES.find(c => c.value === budgetCategories[0]) || BUDGET_CATEGORIES[8];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card 
        className={`border-0 shadow-sm backdrop-blur-sm hover:shadow-md transition-all group ${
          isEditable ? 'cursor-pointer' : ''
        } ${
          isEditable 
            ? 'bg-white/80 dark:bg-slate-800/80' 
            : 'bg-blue-50/80 dark:bg-blue-900/20'
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: `${catInfo.color}20` }}
              >
                {catInfo.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {budget.name}
                  </h3>
                  {budget.is_family_budget && (
                    <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                      👨‍👩‍👧 Семья
                    </span>
                  )}
                  {!isEditable && (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {budgetCategories.join(', ')}
                </p>
              </div>
            </div>
            {isEditable && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(budget)}
                  className="min-h-[44px] min-w-[44px] h-11 w-11 p-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(budget.id)}
                  className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(spent)}
              </span>
              {(isOverBudget || isWarning) && (
                <div className={`flex items-center gap-1 text-sm ${
                  isOverBudget ? 'text-rose-600' : 'text-amber-600'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  {isOverBudget ? 'Превышен' : 'Внимание'}
                </div>
              )}
            </div>
            <Progress 
              value={Math.min(progress, 100)} 
              className={`h-2 ${
                isOverBudget 
                  ? 'bg-rose-100 [&>div]:bg-rose-500' 
                  : isWarning
                  ? 'bg-amber-100 [&>div]:bg-amber-500'
                  : 'bg-slate-200 dark:bg-slate-600'
              }`}
            />
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{progress.toFixed(0)}% использовано</span>
              <span>из {formatCurrency(budget.limit_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}