import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import MemberAvatar from '@/components/family/MemberAvatar';

// Показывает расходы/доходы по каждому члену семьи за выбранный период
// с возможностью сортировки — кто и сколько тратит/зарабатывает, и на что больше всего.
export default function MemberSpendingBreakdown({ transactions, familyMembers, formatCurrency }) {
  const [sortBy, setSortBy] = useState('expense'); // 'expense' | 'income'

  if (!familyMembers || familyMembers.length === 0) return null;

  const rows = familyMembers.map((member) => {
    const memberTx = transactions.filter((t) => t.user_id === member.user_id || t.created_by_id === member.user_id);
    const expense = memberTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = memberTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const byCategory = memberTx
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        const cat = t.category || 'Другое';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {});
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return { member, expense, income, topCategory };
  }).sort((a, b) => b[sortBy] - a[sortBy]);

  const maxValue = Math.max(...rows.map((r) => r[sortBy]), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-muted-foreground text-xs uppercase tracking-widest font-medium">Кто и куда тратит</span>
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('expense')}
            className={`px-2 py-1.5 rounded-md transition-colors flex items-center gap-1 text-xs ${sortBy === 'expense' ? 'bg-muted text-foreground' : 'text-muted-foreground/60 hover:text-foreground'}`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Расходы
          </button>
          <button
            onClick={() => setSortBy('income')}
            className={`px-2 py-1.5 rounded-md transition-colors flex items-center gap-1 text-xs ${sortBy === 'income' ? 'bg-muted text-foreground' : 'text-muted-foreground/60 hover:text-foreground'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Доходы
          </button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {rows.map(({ member, expense, income, topCategory }) => {
          const value = sortBy === 'expense' ? expense : income;
          return (
            <div key={member.user_id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <MemberAvatar member={member} size="sm" />
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{member.display_name || member.name}</p>
                  {sortBy === 'expense' && topCategory && (
                    <p className="text-muted-foreground text-xs truncate">Больше всего: {topCategory[0]} ({formatCurrency(topCategory[1])})</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className={`font-semibold text-sm ${sortBy === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {formatCurrency(value)}
                </p>
                <div className="w-20 h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sortBy === 'expense' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((value / maxValue) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}