import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';

const CATEGORY_ICONS = {
  'Еда': '🍔',
  'Транспорт': '🚗',
  'Жильё': '🏠',
  'Развлечения': '🎮',
  'Здоровье': '💊',
  'Одежда': '👕',
  'Подписки': '📱',
  'Образование': '📚',
  'Зарплата': '💰',
  'Фриланс': '💻',
  'Инвестиции': '📈',
  'Подарки': '🎁',
  'Другое': '📦'
};

export default function RecentTransactions({ transactions, formatCurrency }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Последние операции
            </CardTitle>
            <Link to={createPageUrl('Transactions')}>
              <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                Все <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-1">
              {transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      transaction.type === 'income' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                        : transaction.type === 'expense'
                        ? 'bg-rose-100 dark:bg-rose-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {CATEGORY_ICONS[transaction.category] || '📦'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {transaction.category || 'Без категории'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {transaction.description || format(new Date(transaction.date), 'd MMM, HH:mm', { locale: ru })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'income' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : transaction.type === 'expense'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(transaction.date), 'd MMM', { locale: ru })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет операций</p>
              <p className="text-sm">Добавьте первую транзакцию</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}