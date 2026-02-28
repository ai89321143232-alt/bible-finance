import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronRight, ArrowLeftRight } from 'lucide-react';

const CATEGORY_ICONS = {
  'Еда': '🍔', 'Транспорт': '🚗', 'Жильё': '🏠', 'Развлечения': '🎮',
  'Здоровье': '💊', 'Одежда': '👕', 'Подписки': '📱', 'Образование': '📚',
  'Зарплата': '💰', 'Фриланс': '💻', 'Инвестиции': '📈', 'Подарки': '🎁', 'Другое': '📦'
};

export default function RecentTransactions({ transactions, formatCurrency }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="rounded-2xl border border-white/8 bg-[#141820] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-widest font-semibold">Последние операции</span>
          <Link to={createPageUrl('Transactions')}>
            <span className="text-white/35 hover:text-white/70 text-xs flex items-center gap-1 transition-colors">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {transactions.length > 0 ? (
          <div className="divide-y divide-white/4">
            {transactions.map((tx, idx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                    tx.type === 'income' 
                      ? 'bg-emerald-500/10' 
                      : tx.type === 'expense' 
                        ? 'bg-rose-500/10' 
                        : 'bg-white/5'
                  }`}>
                    {CATEGORY_ICONS[tx.category] || '📦'}
                  </div>
                  <div>
                    <p className="text-white/85 text-sm font-medium">{tx.category || 'Без категории'}</p>
                    <p className="text-white/30 text-xs">
                      {tx.description || format(new Date(tx.date), 'd MMM', { locale: ru })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-rose-400' : 'text-white/60'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-white/25 text-xs mt-0.5">
                    {format(new Date(tx.date), 'd MMM', { locale: ru })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-14 text-center text-white/20">
            <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-3">
              <ArrowLeftRight className="w-7 h-7 opacity-40" />
            </div>
            <p className="text-sm">Нет операций</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}