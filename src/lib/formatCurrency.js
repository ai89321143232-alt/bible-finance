import { useLanguage } from '@/lib/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ============================================================
// formatCurrency.js — единый источник форматирования валюты
// ============================================================
// formatCurrencyFor(amount, language, currency) — чистая функция форматирования.
// useFormatCurrency() — возвращает (amount, currency?) где:
//   • если currency передан — форматирует в ней (баланс конкретного счёта)
//   • если currency не передан — берёт user.currency из профиля как дефолт
//     (агрегаты: общий баланс, net worth, доход/расход за месяц)
// getCurrencySymbol(code, language) — узкий символ валюты для полей ввода.
// ============================================================

export function formatCurrencyFor(amount, language = 'ru', currency = 'RUB') {
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Узкий символ валюты (₽, $, €, сум и т.д.) — для полей ввода форм
export function getCurrencySymbol(code = 'RUB', language = 'ru') {
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code || 'RUB',
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || code || '₽';
  } catch {
    return code || '₽';
  }
}

export function useCurrencySymbol(currencyOverride) {
  const { language } = useLanguage();
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  const profileCurrency = user?.currency || user?.data?.currency || 'RUB';
  return getCurrencySymbol(currencyOverride || profileCurrency, language);
}

// Поддерживаемые валюты для селекторов в формах
export const CURRENCIES = [
  { code: 'RUB', symbol: '₽', label: 'Российский рубль' },
  { code: 'USD', symbol: '$', label: 'Доллар США' },
  { code: 'EUR', symbol: '€', label: 'Евро' },
  { code: 'GBP', symbol: '£', label: 'Фунт стерлингов' },
  { code: 'KZT', symbol: '₸', label: 'Тенге' },
  { code: 'UZS', symbol: 'сум', label: 'Узбекский сум' },
  { code: 'BYN', symbol: 'Br', label: 'Белорусский рубль' },
  { code: 'UAH', symbol: '₴', label: 'Гривна' },
  { code: 'GEL', symbol: '₾', label: 'Грузинский лари' },
  { code: 'CNY', symbol: '¥', label: 'Китайский юань' },
];

export function useFormatCurrency() {
  const { language } = useLanguage();
  // Кэшированный запрос профиля — user.currency обновляется при смене в Настройках
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  const profileCurrency = user?.currency || user?.data?.currency || 'RUB';
  return (amount, currency) => formatCurrencyFor(amount, language, currency || profileCurrency);
}