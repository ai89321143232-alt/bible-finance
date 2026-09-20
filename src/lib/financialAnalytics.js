export const isInvestmentExpense = (transaction) =>
  transaction.category === 'Инвестиции' || transaction.category === 'Investments';

export const ownRecordsOnly = (records, user) =>
  records.filter((record) => record.created_by_id === user?.id || record.user_id === user?.id);

export const sumInProfileCurrency = (records, convertOrZero, profileCurrency) =>
  records.reduce(
    (sum, record) => sum + convertOrZero(record.amount, record.currency || profileCurrency),
    0
  );

export const expensesOnly = (records) =>
  records.filter((record) => record.type === 'expense' && !isInvestmentExpense(record));