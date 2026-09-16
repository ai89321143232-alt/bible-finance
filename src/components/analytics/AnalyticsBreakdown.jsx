import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsBreakdown({ type, items, formatCurrency, title }) {
  const isIncome = type === 'income';

  return (
    <AnimatePresence initial={false}>
      {type && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-3"><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.length ? items.map((item) => (
                <div key={item.id || item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {!isIncome && <span className="text-lg">{item.icon}</span>}
                    <span className="font-medium text-slate-900 dark:text-white truncate">{item.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className={isIncome ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{formatCurrency(item.value)}</span>
                    {!isIncome && <span className="text-xs text-slate-400">{item.percent}%</span>}
                  </div>
                </div>
              )) : <p className="py-4 text-center text-slate-400">Нет данных за выбранный период</p>}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}