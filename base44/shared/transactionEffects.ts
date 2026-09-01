// Общие хелперы для применения эффекта транзакции на баланс счёта и расход бюджета.
// Используются в aiChatAssistant и telegramWebhook, чтобы не дублировать логику.

export function effect(type, amount) {
  return type === 'expense' ? -amount : amount;
}

// ownerId — обязательная проверка владения: счёт должен принадлежать этому пользователю
// (created_by_id или user_id), иначе баланс чужого счёта менять нельзя.
export async function applyBalanceDelta(entities, accountId, delta, ownerId) {
  if (!accountId) return;
  const account = await entities.Account.get(accountId);
  if (!account) return;
  if (ownerId && account.created_by_id !== ownerId && account.user_id !== ownerId) {
    throw new Error('Account does not belong to this user');
  }
  await entities.Account.update(accountId, { balance: (account.balance || 0) + delta });
}

export async function applyBudgetDelta(entities, userId, category, delta) {
  if (!category) return;
  const budgets = await entities.Budget.filter({ is_active: true, user_id: userId });
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // Карта scope по счёту: чтобы бизнес-бюджет считал только бизнес-расходы,
  // а личный — только личные (scope операции = scope счёта).
  const accounts = await entities.Account.filter({ user_id: userId });
  const accountScope = new Map(accounts.map(a => [a.id, a.scope || 'personal']));
  for (const budget of budgets) {
    // Бот/AI-ассистент не могут спросить пользователя, в какой бюджет (личный/семейный)
    // засчитать расход, поэтому по умолчанию засчитываем только в личные бюджеты —
    // иначе один и тот же расход задваивался бы и в личном, и в семейном бюджете.
    if (budget.is_family_budget) continue;
    const cats = budget.categories?.length > 0 ? budget.categories : (budget.category ? [budget.category] : []);
    if (!cats.includes(category)) continue;
    const budgetScope = budget.scope || 'personal';
    // Идемпотентный пересчёт из реальных операций текущего периода —
    // не накапливаем инкрементально, чтобы избежать задвоения при гонке
    // с автоматизацией updateBudgetOnTransaction.
    const allTransactions = await entities.Transaction.filter({ user_id: userId });
    const realSpent = allTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (cats.length > 0 && !cats.includes(t.category)) return false;
        if (new Date(t.date) < periodStart) return false;
        if (t.budget_scope === 'family') return false;
        // Фильтр по области: бюджет business считает только расходы с бизнес-счетов.
        const txScope = t.account_id ? (accountScope.get(t.account_id) || 'personal') : 'personal';
        return txScope === budgetScope;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    await entities.Budget.update(budget.id, { spent_amount: realSpent });
  }
}

// Подбор счёта под транзакцию: единственный счёт пользователя, иначе по подсказке (account_hint) от модели.
export function matchAccount(accounts, hint) {
  if (accounts.length === 1) return accounts[0].id;
  if (hint) {
    const h = hint.toLowerCase();
    for (const acc of accounts) {
      const accName = (acc.name || '').toLowerCase();
      if (accName.includes(h) || h.includes(accName)) return acc.id;
      if ((h.includes('карт') || h.includes('card')) && acc.type === 'card') return acc.id;
      if ((h.includes('налич') || h.includes('cash')) && acc.type === 'cash') return acc.id;
      if (h.includes('кредит') && acc.type === 'credit') return acc.id;
    }
  }
  return null;
}