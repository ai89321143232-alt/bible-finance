import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Однократный пересчёт spent_amount для всех активных бюджетов из реальных
// операций текущего периода. Исправляет накопленные инкрементальные задвоения,
// возникавшие из-за гонки между applyBudgetDelta (telegramWebhook/aiChatAssistant)
// и автоматизацией updateBudgetOnTransaction.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const budgets = await base44.asServiceRole.entities.Budget.filter({ is_active: true });
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let checked = 0;
    let fixed = 0;
    const corrections = [];

    for (const budget of budgets) {
      checked++;
      const cats = budget.categories?.length > 0 ? budget.categories : (budget.category ? [budget.category] : []);
      const ownerId = budget.user_id || budget.created_by_id;
      if (!ownerId) continue;

      const allTransactions = await base44.asServiceRole.entities.Transaction.filter({ user_id: ownerId });
      const realSpent = allTransactions
        .filter(t => {
          if (t.type !== 'expense') return false;
          if (cats.length > 0 && !cats.includes(t.category)) return false;
          if (new Date(t.date) < periodStart) return false;
          if (budget.is_family_budget) return t.budget_scope !== 'personal';
          return t.budget_scope !== 'family';
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

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