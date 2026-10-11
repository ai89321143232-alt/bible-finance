// Личный / семейный контекст Telegram-бота: какие счета, операции и бюджеты
// попадают в ответы. Семейный режим — только записи с family_id семьи, при этом
// личные (private) счета и операции других участников не раскрываются.

export async function getFamilyId(entities, ownerId) {
  const owner = await entities.User.get(ownerId).catch(() => null);
  return owner?.family_id || null;
}

async function loadAll(entity, query, fields) {
  const all = [];
  let cursor;
  do {
    const page = await entity.filter(query, { limit: 1000, cursor, ...(fields ? { fields } : {}) });
    all.push(...(page.items || page));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return all;
}

export async function loadScopeAccounts(entities, ownerId, mode, familyId) {
  if (mode !== 'family' || !familyId) return entities.Account.filter({ user_id: ownerId });
  const accounts = await loadAll(entities.Account, { family_id: familyId });
  return accounts.filter((a) => a.user_id === ownerId || a.created_by_id === ownerId || a.visibility === 'shared');
}

// Семейный баланс: все счета с family_id семьи (включая счета других участников)
export async function loadFamilyBalanceAccounts(entities, familyId) {
  return loadAll(entities.Account, { family_id: familyId });
}

// Операции периода. В семейном режиме — свои + общие + операции по общим счетам семьи.
export async function loadScopeTransactions(entities, ownerId, mode, familyId, query) {
  if (mode !== 'family' || !familyId) return loadAll(entities.Transaction, { user_id: ownerId, ...query });
  const [txs, accounts] = await Promise.all([
    loadAll(entities.Transaction, { family_id: familyId, ...query }),
    loadScopeAccounts(entities, ownerId, 'family', familyId)
  ]);
  const accIds = new Set(accounts.map((a) => a.id));
  return txs.filter((t) => t.user_id === ownerId || t.created_by_id === ownerId || t.visibility === 'shared' || accIds.has(t.account_id));
}

// Календарные бюджеты, действующие сегодня: start_date/end_date включают текущую дату
export function filterCurrentBudgets(budgets, today) {
  return budgets.filter((b) => (!b.start_date || b.start_date <= today) && (!b.end_date || b.end_date >= today));
}

export function filterScopeBudgets(budgets, mode) {
  return budgets.filter((b) => b.is_active !== false && (mode === 'family' ? b.is_family_budget : !b.is_family_budget));
}

// Разовый режим из текста («семейный баланс», «личный отчёт»), иначе сохранённый
export function resolveMode(text, savedMode) {
  const t = String(text || '').toLowerCase();
  if (/семейн|семь[яи]/.test(t)) return 'family';
  if (/личн|мой |мои /.test(t)) return 'personal';
  return savedMode || 'personal';
}

export const modeLabel = (mode) => (mode === 'family' ? '👨‍👩‍👧 Семейный' : '👤 Личный');