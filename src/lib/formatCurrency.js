import { useLanguage } from '@/lib/LanguageContext';

// ============================================================
// formatCurrency.js — единый источник форматирования валюты
// ============================================================
// Возвращает функцию formatCurrency(amount), которая форматирует
// сумму в зависимости от текущего языка пользователя:
//   ru → ru-RU, RUB
//   en → en-US, RUB (валюта остаётся рублём, формат локали en)
// ============================================================

export function formatCurrencyFor(amount, language = 'ru', currency = 'RUB') {
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function useFormatCurrency() {
  const { language } = useLanguage();
  return (amount, currency) => formatCurrencyFor(amount, language, currency);
}