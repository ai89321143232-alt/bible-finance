import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { filterByWorkspace } from '@/components/workspace/WorkspaceContext';

// ============================================================
// ExportRangeModal — выгрузка транзакций за выбранный период в CSV
// ============================================================
export default function ExportRangeModal({ user, activeWorkspaceId, onClose }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Transaction.list('-date', 2000);
      const mine = all.filter(t =>
        t.created_by_id === user.id ||
        (user.family_id && t.family_id === user.family_id)
      );
      const scoped = filterByWorkspace(mine, activeWorkspaceId);

      const from = new Date(startDate + 'T00:00:00');
      const to = new Date(endDate + 'T23:59:59');
      const inRange = scoped
        .filter(t => {
          const d = new Date(t.date);
          return d >= from && d <= to;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const headers = ['Дата', 'Тип', 'Категория', 'Подкатегория', 'Описание', 'Сумма', 'Валюта'];
      const rows = inRange.map(t => [
        format(new Date(t.date), 'dd.MM.yyyy'),
        t.type === 'income' ? 'Доход' : t.type === 'expense' ? 'Расход' : 'Перевод',
        t.category || '',
        t.subcategory || '',
        t.description || '',
        t.type === 'expense' ? -t.amount : t.amount,
        t.currency || 'RUB'
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${startDate}_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
      >
        <Card className="border-0 shadow-2xl bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Экспорт транзакций</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">С даты</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">По дату</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={loading || !startDate || !endDate}
              className="w-full mt-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Экспорт...' : 'Скачать CSV'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}