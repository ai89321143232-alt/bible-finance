import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// ============================================================
// useExchangeRates — хук ручных курсов валют пользователя
// ============================================================
// Читает user.exchange_rates (объект { USD: 90, EUR: 100, ... })
// относительно валюты профиля. Если пустой — возвращает пустой объект.
//
// Возвращает:
//   rates        → { USD: 90, EUR: 100, ... }
//   profileCurrency → 'RUB'
//   convert(amount, from, to?) → конвертирует сумму; если курс
//       не задан для валюты — возвращает null (валюта исключается из итога)
//   convertOrZero(amount, from, to?) → конвертирует, при отсутствии курса возвращает 0
//   hasRate(currency) → boolean
//   isMultiCurrency → true если у пользователя есть курсы (значит несколько валют)
// ============================================================

export function useExchangeRates() {
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const profileCurrency = user?.currency || user?.data?.currency || 'RUB';
    const rates = user?.exchange_rates || user?.data?.exchange_rates || {};

    const hasRate = (currency) => {
      if (!currency || currency === profileCurrency) return true;
      const r = rates[currency];
      return r != null && !isNaN(r) && r > 0;
    };

    const convert = (amount, from, to) => {
      const target = to || profileCurrency;
      if (from === target) return amount;
      const rate = rates[from];
      if (rate == null || isNaN(rate) || rate <= 0) return null;
      // rate = сколько profileCurrency за 1 единицу from
      // конвертируем from → profileCurrency, затем если to задан и отличается — обратная конвертация
      const inProfile = amount * rate;
      if (target === profileCurrency) return inProfile;
      // если целевая валюта тоже есть в rates (обратный курс)
      const targetRate = rates[target];
      if (targetRate == null || isNaN(targetRate) || targetRate <= 0) return null;
      return inProfile / targetRate;
    };

    const convertOrZero = (amount, from, to) => {
      const result = convert(amount, from, to);
      return result == null ? 0 : result;
    };

    return {
      rates,
      profileCurrency,
      convert,
      convertOrZero,
      hasRate,
      isMultiCurrency: Object.keys(rates).length > 0,
    };
  }, [user]);
}