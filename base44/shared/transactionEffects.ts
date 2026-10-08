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

function normalizeCategory(s) {
  return String(s || '').trim().toLowerCase();
}

function includesCategory(budget, category) {
  const categories = budget.categories?.length ? budget.categories : (budget.category ? [budget.category] : []);
  const norm = normalizeCategory(category);
  return categories.some((c) => normalizeCategory(c) === norm);
}

// Свои бюджеты: по user_id или по создателю (старые записи могли хранить прежний user_id)
async function getOwnBudgets(entities, userId) {
  return entities.Budget.filter({ $or: [{ user_id: userId }, { created_by_id: userId }], is_active: true });
}

export async function getBudgetMatches(entities, userId, category) {
  if (!category) return { personal: [], family: [] };
  const owner = await entities.User.get(userId);
  const personal = (await getOwnBudgets(entities, userId))
    .filter((budget) => !budget.is_family_budget && includesCategory(budget, category));
  let family = [];
  if (owner?.family_id) {
    // Семейные бюджеты бывают без family_id — ищем также по создателям из семьи
    const members = await entities.User.filter({ family_id: owner.family_id }).catch(() => []);
    const memberIds = [...new Set([userId, ...members.map((m) => m.id)])];
    const [byFamily, byMembers] = await Promise.all([
      entities.Budget.filter({ family_id: owner.family_id, is_active: true }),
      entities.Budget.filter({ user_id: { $in: memberIds }, is_family_budget: true, is_active: true })
    ]);
    const seen = new Set();
    family = [...byFamily, ...byMembers].filter((budget) => {
      if (seen.has(budget.id)) return false;
      seen.add(budget.id);
      return budget.is_family_budget && includesCategory(budget, category);
    });
  }
  return { personal, family };
}

// Пересчитывает только выбранный тип бюджета по уже сохранённым операциям.
export async function applyBudgetDelta(entities, userId, category, delta, budgetScope = 'personal') {
  if (!category) return;
  const { calcBudgetSpent } = await import('../shared/budgetSpent.ts');
  const { personal, family } = await getBudgetMatches(entities, userId, category);
  const budgets = budgetScope === 'both' ? [...personal, ...family] : budgetScope === 'family' ? family : personal;
  const owner = await entities.User.get(userId);
  const [accounts, ownTransactions, familyTransactions] = await Promise.all([
    entities.Account.filter({ user_id: userId }),
    entities.Transaction.filter({ user_id: userId }),
    owner?.family_id ? entities.Transaction.filter({ family_id: owner.family_id }) : Promise.resolve([])
  ]);
  const accountScope = new Map(accounts.map((account) => [account.id, account.scope || 'personal']));
  for (const budget of budgets) {
    const transactions = budget.is_family_budget ? familyTransactions : ownTransactions;
    const realSpent = calcBudgetSpent(budget, transactions, userId, accountScope);
    await entities.Budget.update(budget.id, { spent_amount: realSpent });
  }
}

// Все активные бюджеты, доступные пользователю: личные (user_id),
// семейные (family_id) и общие (share_with). Согласовано с RLS-правилами Budget
// и с логикой getBudgetMatches — чтобы проверка привязки категории и выбор
// бюджета при списании использовали один и тот же набор доступных бюджетов.
export async function getAccessibleBudgets(entities, userId) {
  const owner = await entities.User.get(userId).catch(() => null);
  const [personal, family] = await Promise.all([
    getOwnBudgets(entities, userId),
    owner?.family_id ? entities.Budget.filter({ family_id: owner.family_id, is_active: true }) : Promise.resolve([])
  ]);
  // Совмещаем, убираем дубликаты по id
  const seen = new Set();
  const all = [...personal, ...family];
  return all.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
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