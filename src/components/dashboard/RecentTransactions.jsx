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
      <div className="rounded-xl border border-white/8 bg-[#141820] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-white/40 text-xs uppercase tracking-widest font-medium">Последние операции</span>
          <Link to={createPageUrl('Transactions')}>
            <span className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1 transition-colors">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {transactions.length > 0 ? (
          <div className="divide-y divide-white/5">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                    {CATEGORY_ICONS[tx.category] || '📦'}
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">{tx.category || 'Без категории'}</p>
                    <p className="text-white/30 text-xs">
                      {tx.description || format(new Date(tx.date), 'd MMM', { locale: ru })}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${
                  tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-rose-400' : 'text-white/60'
                }`}>
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-white/25">
            <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Нет операций</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}