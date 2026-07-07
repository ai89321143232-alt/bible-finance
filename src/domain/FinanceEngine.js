// ============================================================
// domain/FinanceEngine.js — ЕДИНЫЙ ДВИЖОК ФИНАНСОВЫХ ВЫЧИСЛЕНИЙ
// ============================================================
// Чистые функции (без побочных эффектов и обращений к БД).
// Единственный источник истины для расчётов: балансы, доходы/расходы,
// чистый капитал, статистика, прогнозы. Используется сервисами и UI.
//
// Ничего не мутирует, ничего не сохраняет — только считает.
// Это делает вычисления тестируемыми и переносимыми на любой бэкенд.
// ============================================================

/** Сумма положительных балансов (активы без долгов). */
export const totalAssets = (accounts = []) =>
  accounts.reduce((sum, a) => sum + Math.max(a.balance || 0, 0), 0);

/** Сумма отрицательных балансов (долги, отрицательное число). */
export const totalDebts = (accounts = []) =>
  accounts.filter((a) => (a.balance || 0) < 0).reduce((sum, a) => sum + (a.balance || 0), 0);

/** Полный баланс — сумма всех балансов как есть. */
export const totalBalance = (accounts = []) =>
  accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

/** Стоимость инвестиционного портфеля по текущим ценам. */
export const investmentsValue = (investments = []) =>
  investments.reduce(
    (sum, inv) => sum + (inv.quantity || 0) * (inv.current_price || inv.purchase_price || 0),
    0
  );

/** Прибыль/убыток по инвестициям. */
export const investmentsProfit = (investments = []) =>
  investments.reduce(
    (sum, inv) =>
      sum +
      (inv.quantity || 0) * ((inv.current_price || inv.purchase_price || 0) - (inv.purchase_price || 0)),
    0
  );

/** Чистый капитал: активы − долги + инвестиции. */
export const netWorth = (accounts = [], investments = []) =>
  totalBalance(accounts) + investmentsValue(investments);

/** Транзакции в диапазоне дат [start, end]. */
export const transactionsInRange = (transactions = [], start, end) =>
  transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

/** Сумма доходов из набора транзакций. */
export const sumIncome = (transactions = []) =>
  transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);

/** Сумма расходов из набора транзакций. */
export const sumExpense = (transactions = []) =>
  transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

/** Доходы/расходы по конкретному счёту. */
export const accountStats = (transactions = [], accountId) => {
  const forAccount = transactions.filter((t) => t.account_id === accountId);
  return {
    income: sumIncome(forAccount),
    expenses: sumExpense(forAccount),
  };
};

/** Изменение баланса счёта при операции (без сохранения). */
export const applyTransactionToBalance = (currentBalance, type, amount) => {
  const bal = currentBalance || 0;
  const amt = amount || 0;
  if (type === 'expense' || type === 'transfer') return bal - amt;
  if (type === 'income') return bal + amt;
  return bal;
};

/** Откат операции с баланса (для удаления/редактирования). */
export const revertTransactionFromBalance = (currentBalance, type, amount) => {
  const bal = currentBalance || 0;
  const amt = amount || 0;
  if (type === 'expense') return bal + amt;
  if (type === 'income') return bal - amt;
  return bal;
};

export default {
  totalAssets,
  totalDebts,
  totalBalance,
  investmentsValue,
  investmentsProfit,
  netWorth,
  transactionsInRange,
  sumIncome,
  sumExpense,
  accountStats,
  applyTransactionToBalance,
  revertTransactionFromBalance,
};