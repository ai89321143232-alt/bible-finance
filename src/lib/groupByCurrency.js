// ============================================================
// groupByCurrency.js — утилиты мультивалютной агрегации
// ============================================================
// groupBalancesByCurrency(accounts) → { RUB: 50000, USD: 500, ... }
// groupTransactionsByCurrency(transactions) → { RUB: { income, expense }, ... }
// sumByCurrency(items, getValue, getCurrency) → { RUB: total, ... }
// ============================================================

/**
 * Группирует балансы счетов по валюте.
 * @param {Array} accounts — массив счетов с полями balance и currency
 * @returns {Object} { RUB: 50000, USD: 500, ... }
 */
export function groupBalancesByCurrency(accounts = []) {
  const result = {};
  for (const acc of accounts) {
    const cur = acc.currency || 'RUB';
    result[cur] = (result[cur] || 0) + (acc.balance || 0);
  }
  return result;
}

/**
 * Группирует транзакции по валюте: доходы и расходы отдельно.
 * Использует валюту счёта транзакции (t.currency), если задана — иначе валюта счёта.
 * @param {Array} transactions — массив транзакций
 * @param {Object} accountCurrencyMap — { [account_id]: currency } для резолва валюты
 * @returns {Object} { RUB: { income: 1000, expense: 500 }, USD: { ... } }
 */
export function groupTransactionsByCurrency(transactions = [], accountCurrencyMap = {}) {
  const result = {};
  for (const t of transactions) {
    const cur = t.currency || accountCurrencyMap[t.account_id] || 'RUB';
    if (!result[cur]) result[cur] = { income: 0, expense: 0 };
    if (t.type === 'income') result[cur].income += t.amount || 0;
    else if (t.type === 'expense') result[cur].expense += t.amount || 0;
  }
  return result;
}

/**
 * Строит карту { account_id → currency } из массива счетов.
 */
export function buildAccountCurrencyMap(accounts = []) {
  const map = {};
  for (const a of accounts) {
    map[a.id] = a.currency || 'RUB';
  }
  return map;
}