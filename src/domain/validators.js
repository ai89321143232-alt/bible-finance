// ============================================================
// domain/validators.js — ЦЕНТРАЛИЗОВАННАЯ ВАЛИДАЦИЯ БИЗНЕС-ПРАВИЛ
// ============================================================
// Единое место для правил, запрещающих некорректные состояния:
//   - контроль остатков (нельзя уйти в минус на не-кредитном счёте)
//   - проверка прав доступа (нельзя трогать чужие данные)
//   - контроль дубликатов
//   - валидация обязательных полей операции
//
// Функции возвращают { ok: true } или { ok: false, error: 'сообщение' }.
// Сервисы вызывают их ПЕРЕД записью в БД.
// ============================================================

/** Является ли пользователь владельцем записи (учитывает legacy-поля). */
export const isOwner = (record, user) => {
  if (!record || !user) return false;
  return (
    record.created_by_id === user.id ||
    record.user_id === user.id ||
    record.created_by === user.email
  );
};

/** Проверка права распоряжаться счётом. */
export const validateAccountOwnership = (account, user) => {
  if (!account) return { ok: true }; // счёт не выбран — не наша ответственность
  if (!isOwner(account, user)) {
    return { ok: false, error: 'Действия с данными других пользователей запрещены!' };
  }
  return { ok: true };
};

/** Достаточно ли средств для списания (кредитным счетам разрешён минус). */
export const validateSufficientFunds = (account, amount) => {
  if (!account) return { ok: true };
  if (account.type !== 'credit' && (account.balance || 0) - (amount || 0) < 0) {
    return { ok: false, error: 'Недостаточно средств на счёте для выполнения операции' };
  }
  return { ok: true };
};

/** Валидация полей транзакции перед сохранением. */
export const validateTransactionInput = ({ type, amount, category, account_id, toAccountId }) => {
  const amt = parseFloat(amount);
  if (!amount || Number.isNaN(amt) || amt <= 0) {
    return { ok: false, error: 'Введите корректную сумму' };
  }
  if (!account_id) {
    return { ok: false, error: 'Выберите счёт' };
  }
  if (type !== 'transfer' && !category) {
    return { ok: false, error: 'Выберите категорию' };
  }
  if (type === 'transfer' && !toAccountId) {
    return { ok: false, error: 'Выберите счёт или цель назначения' };
  }
  return { ok: true };
};

/** Простой контроль дубликатов: та же сумма/категория/счёт за короткий интервал. */
export const isDuplicateTransaction = (candidate, existing = [], windowSeconds = 60) => {
  const t = new Date(candidate.date).getTime();
  return existing.some((e) => {
    if (e.id === candidate.id) return false;
    const sameCore =
      e.type === candidate.type &&
      Math.abs((e.amount || 0) - (candidate.amount || 0)) < 0.001 &&
      e.category === candidate.category &&
      e.account_id === candidate.account_id;
    if (!sameCore) return false;
    return Math.abs(new Date(e.date).getTime() - t) <= windowSeconds * 1000;
  });
};

/** Валидация счёта перед сохранением. */
export const validateAccountInput = ({ name, type }) => {
  if (!name || !name.trim()) return { ok: false, error: 'Укажите название счёта' };
  if (!type) return { ok: false, error: 'Выберите тип счёта' };
  return { ok: true };
};

/** Валидация бюджета перед сохранением. */
export const validateBudgetInput = ({ name, limit_amount }) => {
  if (!name || !name.trim()) return { ok: false, error: 'Укажите название бюджета' };
  const limit = parseFloat(limit_amount);
  if (!limit_amount || Number.isNaN(limit) || limit <= 0) {
    return { ok: false, error: 'Введите корректный лимит бюджета' };
  }
  return { ok: true };
};

/** Валидация цели перед сохранением. */
export const validateGoalInput = ({ title, target_amount }) => {
  if (!title || !title.trim()) return { ok: false, error: 'Укажите название цели' };
  const target = parseFloat(target_amount);
  if (!target_amount || Number.isNaN(target) || target <= 0) {
    return { ok: false, error: 'Введите корректную целевую сумму' };
  }
  return { ok: true };
};

/** Валидация инвестиции перед сохранением. */
export const validateInvestmentInput = ({ name, quantity, purchase_price }) => {
  if (!name || !name.trim()) return { ok: false, error: 'Укажите название актива' };
  const qty = parseFloat(quantity);
  if (!quantity || Number.isNaN(qty) || qty <= 0) {
    return { ok: false, error: 'Введите корректное количество' };
  }
  const price = parseFloat(purchase_price);
  if (!purchase_price || Number.isNaN(price) || price <= 0) {
    return { ok: false, error: 'Введите корректную цену покупки' };
  }
  return { ok: true };
};

export default {
  isOwner,
  validateAccountOwnership,
  validateSufficientFunds,
  validateTransactionInput,
  isDuplicateTransaction,
  validateAccountInput,
  validateBudgetInput,
  validateGoalInput,
  validateInvestmentInput,
};