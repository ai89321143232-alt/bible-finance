// ============================================================
// budgetSpent.ts — ЕДИНАЯ ФОРМУЛА РАСЧЁТА РАСХОДА БЮДЖЕТА
// ============================================================
// Используется и в UI (BudgetOverview), и в бэкенде
// (updateBudgetOnTransaction, recalculateAllBudgets, applyBudgetDelta),
// чтобы сохранённый spent_amount и отображаемый в UI всегда совпадали.
//
// Формула учитывает: is_family_budget, budget_scope, scope счёта
// и период бюджета (start_date/end_date, либо текущий месяц по умолчанию).
// ============================================================

/**
 * @param {object} budget — объект бюджета (is_family_budget, categories, category, start_date, end_date, scope)
 * @param {Array} transactions — транзакции владельца/семьи (уже отфильтрованные по доступу)
 * @param {string} currentUserId — ID текущего пользователя (для личного бюджета)
 * @param {Map<string,string>} [accountScopeMap] — карта accountId → scope (personal/business)
 * @returns {number} — сумма расходов по бюджету за период
 */
export function getBudgetPeriod(budget, now = new Date()) {
  const period = budget.period || 'monthly';
  const periodStart = new Date(
    now.getFullYear(),
    period === 'yearly' ? 0 : period === 'quarterly' ? Math.floor(now.getMonth() / 3) * 3 : now.getMonth(),
    period === 'weekly' ? now.getDate() - now.getDay() : 1
  );
  const periodEnd = new Date(
    now.getFullYear(),
    period === 'yearly' ? 11 : period === 'quarterly' ? Math.floor(now.getMonth() / 3) * 3 + 3 : now.getMonth() + 1,
    period === 'weekly' ? now.getDate() - now.getDay() + 7 : 0,
    23, 59, 59, 999
  );

  return { periodStart, periodEnd };
}

export function calcBudgetSpent(budget, transactions, currentUserId, accountScopeMap) {
  const { periodStart, periodEnd } = getBudgetPeriod(budget);

  const categories = budget.categories?.length > 0
    ? budget.categories
    : (budget.category ? [budget.category] : []);
  const budgetScope = budget.scope || 'personal';

  return (transactions || [])
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (categories.length > 0 && !categories.includes(t.category)) return false;
      const td = new Date(t.date);
      if (isNaN(td.getTime())) {
        console.warn(`[budgetSpent] Transaction ${t.id || 'unknown'} has invalid date: ${t.date}`);
        return false;
      }
      if (td < periodStart || td > periodEnd) return false;

      // Семейный бюджет: все расходы семьи, кроме явно личных (budget_scope='personal')
      if (budget.is_family_budget) return t.budget_scope !== 'personal';

      // Личный бюджет: только свои расходы, кроме явно семейных
      if (t.budget_scope === 'family') return false;
      if (!(t.created_by_id === currentUserId || t.user_id === currentUserId)) return false;

      // Фильтр по области: бизнес-бюджет считает только расходы с бизнес-счетов
      if (accountScopeMap && t.account_id) {
        const txScope = accountScopeMap.get(t.account_id) || 'personal';
        return txScope === budgetScope;
      }
      return true;
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0);
}