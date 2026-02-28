import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ChevronRight, Plus, AlertCircle } from 'lucide-react';

export default function BudgetOverview({ budgets, formatCurrency }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <div className="rounded-xl border border-white/8 bg-[#141820] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-white/40 text-xs uppercase tracking-widest font-medium">Бюджеты</span>
          <Link to={createPageUrl('Budgets')}>
            <span className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1 transition-colors">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {budgets.length > 0 ? (
          <div className="p-4 space-y-4">
            {budgets.slice(0, 4).map((budget) => {
              const progress = budget.limit_amount > 0 ? (budget.spent_amount / budget.limit_amount) * 100 : 0;
              const isOver = progress > 100;
              const isWarn = progress >= (budget.notify_at_percent || 80) && !isOver;
              const barColor = isOver ? 'bg-rose-400' : isWarn ? 'bg-amber-400' : 'bg-white/60';

              return (
                <div key={budget.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/75 text-sm font-medium">{budget.name}</span>
                    <div className="flex items-center gap-1.5">
                      {(isOver || isWarn) && <AlertCircle className={`w-3 h-3 ${isOver ? 'text-rose-400' : 'text-amber-400'}`} />}
                      <span className={`text-xs ${isOver ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-white/35'}`}>
                        {formatCurrency(budget.spent_amount)} / {formatCurrency(budget.limit_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-white/25 text-sm mb-3">Нет бюджетов</p>
            <Link to={createPageUrl('Budgets')}>
              <span className="inline-flex items-center gap-1 text-white/50 hover:text-white/80 text-xs border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Создать
              </span>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}