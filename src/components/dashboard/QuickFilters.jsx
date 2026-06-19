import React from 'react';
import { motion } from 'framer-motion';
import { X, Filter } from 'lucide-react';

export default function QuickFilters({
  accounts = [],
  categories = [],
  selectedAccount,
  selectedCategory,
  onSelectAccount,
  onSelectCategory,
  onClear
}) {
  const hasFilter = selectedAccount || selectedCategory;
  const showSection = accounts.length > 0 || categories.length > 0;

  if (!showSection) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.09 }}
      className="mb-5"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <span className="text-white/35 text-xs font-medium">Быстрые фильтры</span>
        </div>
        {hasFilter && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/15 text-white/50 hover:text-white/70 text-xs transition-colors"
          >
            <X className="w-3 h-3" />
            Сбросить
          </button>
        )}
      </div>

      {/* Accounts row */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {accounts.map(acc => {
            const isActive = selectedAccount === acc.id;
            return (
              <button
                key={acc.id}
                onClick={() => onSelectAccount(isActive ? null : acc.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/8 border border-white/5'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: acc.color || '#6b7280' }}
                />
                {acc.name}
                {isActive && <X className="w-3 h-3 text-black/50" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Categories row */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 mt-2">
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(isActive ? null : cat)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/8 border border-white/5'
                }`}
              >
                {cat}
                {isActive && <X className="w-3 h-3 text-black/50" />}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}