import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { ChevronRight, ArrowLeftRight, Edit2 } from 'lucide-react';
import { useCategoryIconMap } from '@/hooks/useCategoryIcons';
import { useLanguage } from '@/lib/LanguageContext';

export default function RecentTransactions({ transactions, formatCurrency, onEdit }) {
  const getCategoryIcon = useCategoryIconMap();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : ru;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <span className="text-muted-foreground text-xs uppercase tracking-widest font-semibold">{t('recent.title')}</span>
          <Link to={createPageUrl('Transactions')}>
            <span className="text-muted-foreground/70 hover:text-foreground text-xs flex items-center gap-1 transition-colors">
              {t('recent.all')} <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {transactions.length > 0 ? (
          <div className="divide-y divide-border">
            {transactions.map((tx, idx) => {
              const isFx = Array.isArray(tx.tags) && tx.tags.some((t) => t === 'fx' || String(t).startsWith('fx:'));
              return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                    isFx
                      ? 'bg-violet-500/10 text-violet-600'
                      : tx.type === 'income'
                        ? 'bg-emerald-500/10'
                        : tx.type === 'expense'
                          ? 'bg-rose-500/10'
                          : 'bg-muted'
                  }`}>
                    {isFx ? <ArrowLeftRight className="w-4 h-4" /> : getCategoryIcon(tx.category)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{isFx ? 'Обмен валют' : (tx.category || t('recent.no_category'))}</p>
                    <p className="text-muted-foreground/70 text-xs truncate">
                      {tx.description || format(new Date(tx.date), 'd MMM', { locale: dateLocale })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      tx.type === 'income' ? 'text-emerald-500' : tx.type === 'expense' ? 'text-rose-500' : 'text-foreground'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-muted-foreground/70 text-xs mt-0.5">
                      {format(new Date(tx.date), 'd MMM', { locale: dateLocale })}
                    </p>
                  </div>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(tx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-violet-600 hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
            })}
          </div>
        ) : (
          <div className="py-14 text-center text-muted-foreground/50">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <ArrowLeftRight className="w-7 h-7 opacity-50" />
            </div>
            <p className="text-sm">{t('recent.no_transactions')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}