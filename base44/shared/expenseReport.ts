// Точные отчёты о расходах для Telegram-бота: период определяет AI,
// а все суммы и категории считаются только по реальным операциям.

const REPORT_HINT = /(сколько|отч[её]т|анализ|куда|на что|больше всего|статистик|разбивк|итог|за (последн|прошл|этот|текущ|вчера|сегодня|недел|месяц|год|квартал|январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр|\d))/i;
const EXPENSE_HINT = /(трат|расход|потрат|потрачен)/i;

export function looksLikeExpenseReport(text) {
  return EXPENSE_HINT.test(text) && REPORT_HINT.test(text);
}

function localToday(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Полночь локальной даты (YYYY-MM-DD) в часовом поясе пользователя → момент UTC
function localMidnightUtc(dateStr, timezone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(new Date(guess)).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return new Date(guess - (asUtc - guess));
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

async function detectPeriod(base44, text, today) {
  const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Сегодня ${today}. Пользователь написал: "${text}".
Это запрос ОТЧЁТА о расходах (сколько/куда потрачено за период), а не запись новой траты? Если да — определи период включительно (start_date и end_date в формате YYYY-MM-DD, end_date не позже сегодня). "Последние N месяцев" = с первого дня месяца (N-1) месяцев назад по сегодня. Если период не указан — текущий месяц с 1-го числа по сегодня. Также верни category, если пользователь спрашивает про конкретную категорию, иначе пустую строку.`,
    response_json_schema: {
      type: 'object',
      properties: {
        is_expense_report: { type: 'boolean' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        category: { type: 'string' }
      }
    }
  });
  const valid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  if (!res?.is_expense_report || !valid(res.start_date) || !valid(res.end_date)) return null;
  const end = res.end_date > today ? today : res.end_date;
  if (res.start_date > end) return null;
  return { start: res.start_date, end, category: (res.category || '').trim() };
}

async function loadExpenses(entities, ownerId, fromIso, toIso) {
  const all = [];
  let cursor;
  do {
    const page = await entities.Transaction.filter(
      { user_id: ownerId, type: 'expense', date: { $gte: fromIso, $lt: toIso } },
      { limit: 1000, cursor, fields: ['amount', 'currency', 'category'] }
    );
    const items = page.items || page;
    all.push(...items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return all;
}

function money(amount, code) {
  return `${Math.round(amount * 100) / 100 === Math.round(amount) ? Math.round(amount).toLocaleString('ru-RU') : amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${code === 'RUB' ? '₽' : code}`;
}

// Возвращает готовый текст отчёта или null, если сообщение не является запросом отчёта
export async function buildExpenseReport({ base44, entities, ownerId, timezone, text }) {
  const today = localToday(timezone);
  const period = await detectPeriod(base44, text, today);
  if (!period) return null;

  const fromIso = localMidnightUtc(period.start, timezone).toISOString();
  const toIso = localMidnightUtc(addDays(period.end, 1), timezone).toISOString();
  let expenses = await loadExpenses(entities, ownerId, fromIso, toIso);
  const catNorm = period.category.toLowerCase();
  if (catNorm) expenses = expenses.filter((t) => String(t.category || '').toLowerCase() === catNorm);

  const header = `📊 <b>Расходы за ${fmtDate(period.start)} — ${fmtDate(period.end)}</b>${period.category ? `\n📂 Категория: ${period.category}` : ''}`;
  if (!expenses.length) return `${header}\n\nЗа этот период расходов не найдено.`;

  const byCurrency = {};
  for (const t of expenses) {
    const amount = Number(t.amount) || 0;
    if (!amount) continue;
    const code = t.currency || 'RUB';
    const cat = t.category || 'Другое';
    byCurrency[code] = byCurrency[code] || { total: 0, count: 0, cats: {} };
    byCurrency[code].total += amount;
    byCurrency[code].count += 1;
    byCurrency[code].cats[cat] = (byCurrency[code].cats[cat] || 0) + amount;
  }

  const lines = [header, ''];
  const currencies = Object.entries(byCurrency).sort((a, b) => b[1].count - a[1].count);
  lines.push('<b>Итого по валютам:</b>');
  for (const [code, data] of currencies) lines.push(`💸 <code>${money(data.total, code)}</code> — ${data.count} опер.`);
  for (const [code, data] of currencies) {
    lines.push('', `<b>Категории (${code}):</b>`);
    Object.entries(data.cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).forEach(([cat, v]) => {
      const pct = Math.round((v / data.total) * 100);
      lines.push(`• ${cat} — <code>${money(v, code)}</code> (${pct}%)`);
    });
  }
  return lines.join('\n');
}