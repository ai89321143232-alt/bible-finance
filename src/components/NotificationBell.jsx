import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, X, AlertTriangle, Clock, CreditCard, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { differenceInDays, parseISO, format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// components/NotificationBell.jsx — КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ
// ============================================================
// Проверяет:
//   1. Бюджеты, срок которых истекает в течение 3 дней
//   2. Бюджеты, у которых превышен notify_at_percent от лимита
//   3. Регулярные транзакции (is_recurring: true), которые должны были пройти сегодня/завтра
// ============================================================

function getNextRecurringDate(lastDate, period) {
  const d = typeof lastDate === 'string' ? parseISO(lastDate) : lastDate;
  switch (period) {
    case 'daily':   return addDays(d, 1);
    case 'weekly':  return addWeeks(d, 1);
    case 'monthly': return addMonths(d, 1);
    case 'yearly':  return addYears(d, 1);
    default:        return addMonths(d, 1);
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_notifications') || '[]'); } catch { return []; }
  });
  const ref = useRef(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    const notifs = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // --- Бюджеты ---
      const budgets = await base44.entities.Budget.filter({ is_active: true });
      for (const b of budgets) {
        // Срок истекает
        if (b.end_date) {
          const daysLeft = differenceInDays(parseISO(b.end_date), today);
          if (daysLeft >= 0 && daysLeft <= 3) {
            notifs.push({
              id: `budget_expiry_${b.id}`,
              type: 'warning',
              icon: Clock,
              title: `Бюджет "${b.name}" заканчивается`,
              text: daysLeft === 0
                ? 'Срок действия истекает сегодня'
                : `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : 'дня'}`,
              link: 'Budgets',
            });
          }
        }
        // Превышение лимита
        const pct = b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0;
        const threshold = b.notify_at_percent ?? 80;
        if (pct >= threshold) {
          notifs.push({
            id: `budget_limit_${b.id}`,
            type: pct >= 100 ? 'danger' : 'warning',
            icon: AlertTriangle,
            title: `Бюджет "${b.name}"`,
            text: pct >= 100
              ? `Лимит превышен (${Math.round(pct)}%)`
              : `Использовано ${Math.round(pct)}% от лимита`,
            link: 'Budgets',
          });
        }
      }

      // --- Регулярные платежи ---
      const transactions = await base44.entities.Transaction.filter({ is_recurring: true });
      const tomorrow = addDays(today, 1);

      for (const t of transactions) {
        if (!t.date || !t.recurring_period) continue;
        const nextDate = getNextRecurringDate(t.date, t.recurring_period);
        nextDate.setHours(0, 0, 0, 0);
        const diff = differenceInDays(nextDate, today);
        if (diff >= 0 && diff <= 1) {
          const fmt = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
          notifs.push({
            id: `recurring_${t.id}`,
            type: 'info',
            icon: CreditCard,
            title: `Регулярный платёж: ${t.category}`,
            text: diff === 0
              ? `Сегодня — ${fmt.format(t.amount)}`
              : `Завтра — ${fmt.format(t.amount)}`,
            link: 'Transactions',
          });
        }
      }
    } catch (e) {
      console.error('Notification load error:', e);
    }

    setNotifications(notifs);
  };

  const dismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
  };

  const visible = notifications.filter(n => !dismissed.includes(n.id));
  const count = visible.length;

  const colorMap = {
    danger:  'text-rose-400 bg-rose-500/10 border-rose-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    info:    'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };
  const dotMap = {
    danger:  'bg-rose-500',
    warning: 'bg-amber-400',
    info:    'bg-sky-400',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <Bell className="w-4 h-4 text-white/60" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-white/70 text-sm font-semibold">Уведомления</span>
              {count > 0 && (
                <button
                  onClick={() => {
                    const allIds = visible.map(n => n.id);
                    const updated = [...dismissed, ...allIds];
                    setDismissed(updated);
                    localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
                  }}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  Скрыть все
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="py-10 text-center text-white/25 text-sm">
                  Нет новых уведомлений
                </div>
              ) : (
                visible.map(n => {
                  const Icon = n.icon;
                  return (
                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-white/4 hover:bg-white/3 transition-colors`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${colorMap[n.type]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/85 text-sm font-medium leading-tight">{n.title}</p>
                        <p className="text-white/40 text-xs mt-0.5">{n.text}</p>
                        <Link
                          to={createPageUrl(n.link)}
                          onClick={() => setOpen(false)}
                          className="text-violet-400 text-xs mt-1 inline-flex items-center gap-0.5 hover:text-violet-300"
                        >
                          Перейти <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                      <button
                        onClick={() => dismiss(n.id)}
                        className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0 mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}