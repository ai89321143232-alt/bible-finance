import React from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { Edit2, Trash2, Coins, MinusCircle, AlertCircle, Lock, TrendingDown } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import CreatorTag from '@/components/shared/CreatorTag';

const GOAL_TYPES = [
  { value: 'savings', label: 'Накопления', icon: '💰', color: '#10B981' },
  { value: 'debt_payoff', label: 'Погашение долга', icon: '📉', color: '#EF4444' },
  { value: 'investment', label: 'Инвестиции', icon: '📈', color: '#8B5CF6' },
  { value: 'purchase', label: 'Покупка', icon: '🛍️', color: '#F59E0B' },
  { value: 'emergency_fund', label: 'Подушка безопасности', icon: '🛡️', color: '#3B82F6' },
  { value: 'other', label: 'Другое', icon: '🎯', color: '#64748B' },
];

export default function GoalCard({
  goal,
  index,
  isEditable,
  onEdit,
  onDelete,
  onAddFunds,
  onSpend,
  formatCurrency,
  family,
  currentUser,
  accounts = []
}) {
  const typeInfo = GOAL_TYPES.find(t => t.value === goal.type) || GOAL_TYPES[5];
  const progress = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;

  const daysLeft = goal.deadline
    ? differenceInDays(new Date(goal.deadline), new Date())
    : null;

  const isDeadlineNear = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isDeadlineOverdue = daysLeft !== null && daysLeft < 0;

  const subgoalsProgress = goal.subgoals?.length > 0
    ? (goal.subgoals.filter(sg => sg.status === 'completed').length / goal.subgoals.length) * 100
    : 0;

  const priorityColors = {
    low: '#6B7280',
    medium: '#F59E0B',
    high: '#EF4444'
  };

  const priorityLabels = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
  };

  // --- Разбивка: сколько откладывать в день и в месяц ---
  const remainingAmount = Math.max(0, (goal.target_amount || 0) - (goal.current_amount || 0));
  const hasDeadline = daysLeft !== null && daysLeft > 0 && remainingAmount > 0;
  const dailyAmount = hasDeadline ? remainingAmount / daysLeft : 0;
  const monthsLeft = hasDeadline ? Math.max(1, daysLeft / 30) : 0;
  const monthlyAmount = hasDeadline ? remainingAmount / monthsLeft : 0;

  // --- Проверка баланса связанного счёта ---
  const linkedAccount = goal.linked_account_id
    ? accounts.find(a => a.id === goal.linked_account_id)
    : null;
  const isBalanceInsufficient = linkedAccount && (linkedAccount.balance || 0) < (goal.current_amount || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-all overflow-hidden group"
      >
        <div
          className="h-1"
          style={{
            background: `linear-gradient(to right, ${typeInfo.color} ${progress}%, transparent ${progress}%)`
          }}
        />
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: `${typeInfo.color}20` }}
              >
                {typeInfo.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {goal.title}
                  </h3>
                  {goal.is_family_goal && (
                    <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                      👨‍👩‍👧 Семья
                    </span>
                  )}
                  {!isEditable && (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {typeInfo.label}
                  </p>
                  <div
                    className="px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: priorityColors[goal.priority] }}
                  >
                    {priorityLabels[goal.priority]}
                  </div>
                </div>
                <CreatorTag creatorId={goal.created_by_id} family={family} currentUser={currentUser} className="mt-0.5" />
              </div>
            </div>
            {isEditable && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(goal)}
                  className="min-h-[44px] min-w-[44px] h-11 w-11 p-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(goal.id)}
                  className="min-h-[44px] min-w-[44px] h-11 w-11 p-0 text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(goal.current_amount || 0)}
                </p>
                <p className="text-sm text-slate-500">
                  {goal.type === 'debt_payoff'
                    ? `осталось ${formatCurrency(remainingAmount)}`
                    : `из ${formatCurrency(goal.target_amount)}`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold" style={{ color: typeInfo.color }}>
                  {progress.toFixed(0)}%
                </p>
                {daysLeft !== null && (
                  <p className={`text-sm ${
                    isDeadlineOverdue ? 'text-rose-600' :
                    isDeadlineNear ? 'text-amber-600' :
                    daysLeft <= 0 ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    {isDeadlineOverdue
                      ? `Просрочено ${Math.abs(daysLeft)} дн.`
                      : `${daysLeft} дн. осталось`
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Разбивка: сколько откладывать в день / месяц */}
            {hasDeadline && (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">В день</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(Math.ceil(dailyAmount))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">В месяц</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(Math.ceil(monthlyAmount))}
                  </p>
                </div>
              </div>
            )}

            {/* Предупреждение: баланс счёта меньше накопленного */}
            {isBalanceInsufficient && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                <TrendingDown className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="text-xs text-rose-700 dark:text-rose-300">
                  Баланс счёта «{linkedAccount.name}» ({formatCurrency(linkedAccount.balance || 0)}) меньше накопленной суммы. Часть средств потрачена!
                </span>
              </div>
            )}

            {/* Связанный счёт */}
            {linkedAccount && !isBalanceInsufficient && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Coins className="w-3.5 h-3.5" />
                <span>Счёт: {linkedAccount.name} ({formatCurrency(linkedAccount.balance || 0)})</span>
              </div>
            )}

            {isDeadlineNear && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Приближается дедлайн
                </span>
              </div>
            )}

            <Progress
              value={progress}
              className="h-2"
            />

            {goal.subgoals && goal.subgoals.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Подцели: {goal.subgoals.filter(sg => sg.status === 'completed').length}/{goal.subgoals.length}
                </p>
                <Progress value={subgoalsProgress} className="h-1.5" />
              </div>
            )}

            {isEditable && (
              <div className={`grid ${goal.type === 'debt_payoff' ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mt-2`}>
                <Button
                  variant="outline"
                  onClick={() => onAddFunds(goal)}
                  className="rounded-xl"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {goal.type === 'debt_payoff' ? 'Погасить' : 'Пополнить'}
                </Button>
                {goal.type !== 'debt_payoff' && (
                  <Button
                    variant="outline"
                    onClick={() => onSpend(goal)}
                    className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                    disabled={(goal.current_amount || 0) === 0}
                  >
                    <MinusCircle className="w-4 h-4 mr-2" />
                    Потратить
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}