import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QuickTemplates({ templates = [], onUseTemplate, onOpenManager, accounts = [] }) {
  if (templates.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-white/40 text-xs uppercase tracking-widest font-medium">Быстрые шаблоны</span>
        </div>
        <button
          onClick={onOpenManager}
          className="w-full rounded-xl border border-dashed border-white/10 bg-white/3 py-4 px-4 flex items-center justify-center gap-2 hover:bg-white/5 transition-all group"
        >
          <Plus className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors" />
          <span className="text-white/30 text-sm group-hover:text-white/50 transition-colors">Создать шаблон для быстрых операций</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-white/40 text-xs uppercase tracking-widest font-medium">Быстрые шаблоны</span>
        <span className="text-white/20 text-xs ml-auto">{templates.length}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {templates.map(t => {
          const isExpense = t.type === 'expense';
          const account = t.account_id ? accounts.find(a => a.id === t.account_id) : null;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onUseTemplate(t)}
              className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/8 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: (t.color || '#3b82f6') + '20', color: t.color || '#3b82f6' }}>
                {t.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-white text-xs font-medium truncate max-w-[100px]">{t.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-xs font-semibold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isExpense ? '-' : '+'}{parseInt(t.amount).toLocaleString()} ₽
                  </span>
                  {account && (
                    <span className="text-white/25 text-[10px]">· {account.name}</span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
        <button
          onClick={onOpenManager}
          className="flex-shrink-0 w-10 h-10 rounded-xl border border-dashed border-white/10 bg-white/3 flex items-center justify-center hover:bg-white/8 transition-all"
        >
          <Plus className="w-4 h-4 text-white/30" />
        </button>
      </div>
    </div>
  );
}