// ============================================================
// lib/investmentValue.js — единая логика расчёта стоимости инвестиций
// ============================================================
// Для вкладов (deposit) стоимость = текущая цена (сумма вклада),
// а не quantity × price — иначе 25000 ₽ × 25000 шт = 625 млн ₽.
// ============================================================

/**
 * Рассчитывает рыночную стоимость одной инвестиции в её родной валюте.
 * @param {object} inv — запись инвестиции
 * @returns {number} стоимость в родной валюте инвестиции
 */
export function getInvestmentValue(inv) {
  const price = Number(inv.current_price || inv.purchase_price) || 0;
  if (inv.type === 'deposit') return price;
  const qty = Number(inv.quantity) || 0;
  return qty * price;
}

/**
 * Рассчитывает себестоимость (цену покупки) инвестиции в её родной валюте.
 * @param {object} inv
 * @returns {number}
 */
export function getInvestmentCost(inv) {
  if (inv.type === 'deposit') return Number(inv.purchase_price) || 0;
  const qty = Number(inv.quantity) || 0;
  return qty * (Number(inv.purchase_price) || 0);
}

/**
 * Конвертирует стоимость в валюту профиля, используя функцию convert.
 * @param {number} val — сумма в родной валюте
 * @param {string} fromCur — код родной валюты
 * @param {string} profileCurrency — код валюты профиля
 * @param {function} convert — функция конвертации (val, from, to) => number | null
 * @returns {number} — конвертированная сумма (0 если курс недоступен)
 */
export function convertInvestmentValue(val, fromCur, profileCurrency, convert) {
  if (!val || val <= 0) return 0;
  if (fromCur === profileCurrency) return val;
  const converted = convert(val, fromCur, profileCurrency);
  return converted != null ? converted : 0;
}