import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { default_account_id } = await req.json();
    if (!default_account_id) return Response.json({ error: 'Выберите счёт для миграции' }, { status: 400 });

    const service = base44.asServiceRole.entities;
    const accounts = await service.Account.list();
    const account = accounts.find((item) => item.id === default_account_id);
    if (!account || (account.created_by_id !== user.id && account.user_id !== user.id)) {
      return Response.json({ error: 'Недоступный счёт' }, { status: 403 });
    }

    const expenses = await service.ChildExpense.list();
    const pending = expenses.filter((item) => !item.transaction_id && (item.created_by_id === user.id || item.user_id === user.id));
    let balance = Number(account.balance) || 0;
    let migrated = 0;
    const failed = [];

    for (const expense of pending) {
      const amount = Number(expense.amount) || 0;
      if (amount <= 0 || (account.type !== 'credit' && balance < amount)) {
        failed.push(expense.id);
        continue;
      }
      if (account.type === 'credit' && balance + (Number(account.credit_limit) || 0) < amount) {
        failed.push(expense.id);
        continue;
      }
      const transaction = await service.Transaction.create({
        type: 'expense', amount, category: 'Дети',
        description: `Ребёнок: ${expense.child_name} · ${expense.category}${expense.description ? ` — ${expense.description}` : ''}`,
        date: new Date(expense.date).toISOString(), account_id: account.id, currency: account.currency || 'RUB',
        tags: ['child_expense', expense.child_name], user_id: user.id,
        family_id: expense.family_id || undefined, workspace_id: expense.workspace_id || undefined,
        visibility: expense.visibility || 'private',
      });
      balance -= amount;
      await service.ChildExpense.update(expense.id, { account_id: account.id, currency: account.currency || 'RUB', transaction_id: transaction.id });
      migrated += 1;
    }
    if (migrated > 0) await service.Account.update(account.id, { balance });
    return Response.json({ migrated, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}