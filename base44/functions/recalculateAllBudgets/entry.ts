import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { calcBudgetSpent } from '../../shared/budgetSpent.ts';

// Однократный пересчёт spent_amount для всех активных бюджетов из реальных
// операций текущего периода. Использует единую формулу calcBudgetSpent
// (ту же, что и UI и updateBudgetOnTransaction).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const budgets = await base44.asServiceRole.entities.Budget.filter({ is_active: true });
    const accounts = await base44.asServiceRole.entities.Account.list();
    const accountScopeMap = new Map(accounts.map(a => [a.id, a.scope || 'personal']));

    let checked = 0;
    let fixed = 0;
    const corrections = [];

    for (const budget of budgets) {
      checked++;
      const ownerId = budget.user_id || budget.created_by_id;
      if (!ownerId) continue;

      const allTransactions = await base44.asServiceRole.entities.Transaction.filter({ user_id: ownerId });
      const realSpent = calcBudgetSpent(budget, allTransactions, ownerId, accountScopeMap);

      const current = budget.spent_amount || 0;
      if (Math.abs(current - realSpent) > 0.01) {
        await base44.asServiceRole.entities.Budget.update(budget.id, { spent_amount: realSpent });
        fixed++;
        if (corrections.length < 50) {
          corrections.push({ id: budget.id, name: budget.name, was: current, now: realSpent });
        }
      }
    }

    return Response.json({ checked, fixed, periodStart: periodStart.toISOString(), corrections });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}