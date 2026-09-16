import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsBreakdown({ type, items, formatCurrency, title, onClose }) {
  const isIncome = type === 'income';

  return createPortal(
    <AnimatePresence initial={false}>
      {type && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <button aria-label="Закрыть" onClick={onClose} className="absolute inset-0 bg-black/50" />
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} className="relative w-full max-w-md max-h-[75vh] overflow-y-auto">
            <Card className="border-0 shadow-2xl bg-white dark:bg-slate-800">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-lg">{title}</CardTitle><button aria-label="Закрыть" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button></CardHeader>
              <CardContent className="space-y-3">
                {items.length ? items.map((item) => (
                  <div key={item.id || item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {!isIncome && <span className="text-lg">{item.icon || '📦'}</span>}
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}