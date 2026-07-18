// ============================================================
// lib/parseDate.js — гибкий парсер дат, распознанных AI на чеках/выписках
// ============================================================
// AI иногда возвращает дату не в ISO-формате (например "18.07.2025" или
// "18/07/2025"), который `new Date()` не умеет парсить и возвращает
// Invalid Date. Из-за этого при сканировании операция сохранялась с
// текущей датой сканирования вместо даты, распознанной на фото.
// Эта функция сначала пробует нативный парсинг, а затем — частые
// не-ISO форматы (день.месяц.год).
// ============================================================
export function parseFlexibleDate(input) {
  if (!input) return null;

  const native = new Date(input);
  if (!isNaN(native.getTime())) return native;

  const str = String(input).trim();
  const match = str.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (match) {
    let [, day, month, year, hour, minute] = match;
    if (year.length === 2) year = `20${year}`;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour) || 0, Number(minute) || 0);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}