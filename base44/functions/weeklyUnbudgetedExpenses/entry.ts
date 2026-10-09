import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getAccessibleBudgets } from '../../shared/transactionEffects.ts';
import { localMidnightUtc } from '../../shared/expenseReport.ts';

const norm = (s) => String(s || '').trim().toLowerCase();

function previousWeek(timezone) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = понедельник
  const start = new Date(d); start.setUTCDate(d.getUTCDate() - dow - 7);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 7);
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);
  const last = new Date(end); last.setUTCDate(end.getUTCDate() - 1);
  return { s, e, last: last.toISOString().slice(0, 10) };
}

const fmt = (d) => d.split('-').reverse().join('.');
const money = (v, c) => `${(Math.round(v * 100) / 100).toLocaleString('ru-RU')} ${c === 'RUB' ? '₽' : c}`;

async function loadExpenses(entities, ownerId, fromIso, toIso) {
  const all = [];
  let cursor;
  do {
    const page = await entities.Transaction.filter(
      { user_id: ownerId, type: 'expense', date: { $gte: fromIso, $lt: toIso } },
      { limit: 1000, cursor, fields: ['amount', 'currency', 'category'] }
    );
    all.push(...(page.items || page));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return all;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const entities = base44.asServiceRole.entities;
  const configs = await entities.TelegramBotConfig.filter({ is_active: true });
  let sent = 0;

  for (const config of configs) {
    const ownerId = config.created_by_id;
    const chatId = config.telegram_user_id;
    if (!ownerId || !chatId || !config.bot_token) continue;
    const tz = config.timezone || 'Europe/Moscow';
    const week = previousWeek(tz);
    const expenses = await loadExpenses(entities, ownerId, localMidnightUtc(week.s, tz).toISOString(), localMidnightUtc(week.e, tz).toISOString());
    if (!expenses.length) continue;

    const budgets = (await getAccessibleBudgets(entities, ownerId)).filter((b) => b.is_active !== false);
    const covered = new Set();
    for (const b of budgets) {
      for (const c of (b.categories || (b.category ? [b.category] : []))) covered.add(`${norm(c)}|${b.currency || 'RUB'}`);
    }

    const byCurrency = {};
    for (const t of expenses) {
      const amount = Number(t.amount) || 0;
      const cur = t.currency || 'RUB';
      if (!amount || covered.has(`${norm(t.category)}|${cur}`)) continue;
      const cat = t.category || 'Другое';
      byCurrency[cur] = byCurrency[cur] || { total: 0, count: 0, cats: {} };
      byCurrency[cur].total += amount;
      byCurrency[cur].count += 1;
      byCurrency[cur].cats[cat] = (byCurrency[cur].cats[cat] || 0) + amount;
    }
    const currencies = Object.entries(byCurrency);
    if (!currencies.length) continue;

    const lines = [`⚠️ <b>Расходы без бюджета</b>`, `📅 ${fmt(week.s)} — ${fmt(week.last)}`, ''];
    for (const [cur, data] of currencies) lines.push(`💸 <code>${money(data.total, cur)}</code> — ${data.count} опер.`);
    for (const [cur, data] of currencies) {
      lines.push('', `<b>Категории (${cur}):</b>`);
      Object.entries(data.cats).sort((a, b) => b[1] - a[1]).forEach(([cat, v]) => lines.push(`• ${cat} — <code>${money(v, cur)}</code>`));
    }
    lines.push('', 'Добавьте эти категории в бюджеты, чтобы контролировать траты.');

    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' })
    });
    sent++;
  }

  return Response.json({ checked: configs.length, sent });
});