// ============================================================
// budgetSpent.js — ЕДИНАЯ ФОРМУЛА РАСХОДА БЮДЖЕТА (frontend)
// ============================================================
// Зеркало base44/shared/budgetSpent.ts для использования в UI.
// Логика идентична бэкенд-версии, чтобы отображаемый spent_amount
// и сохранённый в БД всегда совпадали.
// ============================================================

/**
 * @param {object} budget — объект бюджета
 * @param {Array} transactions — транзакции (уже отфильтрованные по доступу)
 * @param {string} currentUserId — ID текущего пользователя
 * @param {Map<string,string>} [accountScopeMap] — карта accountId → scope
 * @returns {number}
 */
export function calcBudgetSpent(budget, transactions, currentUserId, accountScopeMap) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const periodStart = budget.start_date ? new Date(budget.start_date) : monthStart;
  const periodEnd = budget.end_date ? new Date(budget.end_date) : monthEnd;

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
      if (budget.is_family_budget) return t.budget_scope !== 'personal';
      if (t.budget_scope === 'family') return false;
      if (!(t.created_by_id === currentUserId || t.user_id === currentUserId)) return false;
      if (accountScopeMap && t.account_id) {
        const txScope = accountScopeMap.get(t.account_id) || 'personal';
        return txScope === budgetScope;
      }
      return true;
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0);
}