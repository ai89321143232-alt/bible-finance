import React, { useState } from 'react';
import { CalendarDays, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addMonths, endOfMonth } from 'date-fns';

// Generates a random UID for ICS events
const uid = () => Math.random().toString(36).slice(2) + Date.now() + '@financeapp';

// Format date as ICS YYYYMMDD
const icsDate = (date) => {
  const d = new Date(date);
  return format(d, 'yyyyMMdd');
};

// Format datetime as ICS YYYYMMDDTHHmmssZ
const icsDateTime = (date) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

const buildICS = (events) => {
  const now = icsDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Библия Финансов//Finance App//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Финансовые события',
    'X-WR-TIMEZONE:Europe/Moscow',
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid()}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${icsDate(ev.date)}`);
    lines.push(`DTEND;VALUE=DATE:${icsDate(ev.date)}`);
    lines.push(`SUMMARY:${ev.title}`);
    if (ev.description) lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
    if (ev.alarm) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${ev.title}`);
      lines.push('TRIGGER:-P1D'); // 1 day before
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

const downloadICS = (icsContent, filename) => {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * CalendarExport — generates ICS file from budgets and goals with due dates.
 *
 * Props:
 *   budgets: Budget[]
 *   goals: Goal[]
 *   accounts: Account[] (for debt accounts with negative balance)
 */
export default function CalendarExport({ budgets = [], goals = [], accounts = [] }) {
  const [done, setDone] = useState(false);

  const handleExport = () => {
    const events = [];
    const now = new Date();

    // Budget period-end payment reminders (next 6 months)
    budgets.filter(b => b.is_active).forEach(budget => {
      for (let i = 0; i < 6; i++) {
        let eventDate;
        const base = addMonths(now, i);
        switch (budget.period) {
          case 'weekly': {
            // Last day of each week for next 6 weeks
            const d = new Date(base);
            d.setDate(d.getDate() + (7 - d.getDay()));
            eventDate = d;
            break;
          }
          case 'monthly':
          default:
            eventDate = endOfMonth(base);
        }
        if (i >= 3 && budget.period === 'weekly') break; // Only 3 weeks for weekly

        events.push({
          date: eventDate,
          title: `💰 Бюджет "${budget.name}" — подведение итогов`,
          description: `Лимит: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(budget.limit_amount)}.\nПроверьте расходы по категориям: ${(budget.categories || [budget.category]).filter(Boolean).join(', ')}.`,
          alarm: true,
        });
      }
    });

    // Goal deadlines
    goals.filter(g => g.status === 'active' && g.deadline).forEach(goal => {
      const deadline = new Date(goal.deadline);
      if (deadline > now) {
        const remaining = goal.target_amount - (goal.current_amount || 0);
        events.push({
          date: deadline,
          title: `🎯 Дедлайн цели: "${goal.title}"`,
          description: `Целевая сумма: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(goal.target_amount)}. Осталось накопить: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Math.max(remaining, 0))}.`,
          alarm: true,
        });

        // Monthly contribution reminders
        if (goal.monthly_contribution) {
          for (let i = 1; i <= 3; i++) {
            const contribDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            if (contribDate < deadline) {
              events.push({
                date: contribDate,
                title: `📅 Взнос на цель "${goal.title}"`,
                description: `Запланированный ежемесячный взнос: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(goal.monthly_contribution)}.`,
                alarm: true,
              });
            }
          }
        }
      }
    });

    // Debt accounts — monthly payment reminders on 1st of each month
    const debtAccounts = accounts.filter(a => (a.balance || 0) < 0);
    debtAccounts.forEach(acc => {
      for (let i = 1; i <= 3; i++) {
        const payDate = new Date(now.getFullYear(), now.getMonth() + i, 5); // 5th of month
        events.push({
          date: payDate,
          title: `💳 Платёж по долгу: "${acc.name}"`,
          description: `Текущий долг: ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Math.abs(acc.balance || 0))}. Не забудьте внести платёж!`,
          alarm: true,
        });
      }
    });

    if (events.length === 0) return;

    const ics = buildICS(events);
    downloadICS(ics, 'finance-events.ics');

    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      className="rounded-xl flex items-center gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 bg-transparent"
    >
      {done ? (
        <><Check className="w-4 h-4" /> Скачано!</>
      ) : (
        <><CalendarDays className="w-4 h-4" /> Экспорт в календарь</>
      )}
    </Button>
  );
}