import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = user.family_id;
    const userId = user.id;
    
    if (!familyId) {
      return Response.json({ 
        message: 'Пользователь не состоит в семье, миграция не требуется',
        updated: 0
      });
    }

    let updated = 0;

    // Обновляем Accounts
    const accounts = await base44.asServiceRole.entities.Account.filter({ created_by: user.email });
    for (const account of accounts) {
      if (!account.family_id || account.family_id !== familyId || !account.user_id) {
        await base44.asServiceRole.entities.Account.update(account.id, { 
          family_id: familyId,
          user_id: userId
        });
        updated++;
      }
    }

    // Обновляем Transactions
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ created_by: user.email });
    for (const transaction of transactions) {
      if (!transaction.family_id || transaction.family_id !== familyId || !transaction.user_id) {
        await base44.asServiceRole.entities.Transaction.update(transaction.id, { 
          family_id: familyId,
          user_id: userId
        });
        updated++;
      }
    }

    // Обновляем Investments
    const investments = await base44.asServiceRole.entities.Investment.filter({ created_by: user.email });
    for (const investment of investments) {
      if (!investment.family_id || investment.family_id !== familyId || !investment.user_id) {
        await base44.asServiceRole.entities.Investment.update(investment.id, { 
          family_id: familyId,
          user_id: userId
        });
        updated++;
      }
    }

    // Обновляем ChildExpenses
    const expenses = await base44.asServiceRole.entities.ChildExpense.filter({ created_by: user.email });
    for (const expense of expenses) {
      if (!expense.family_id || expense.family_id !== familyId || !expense.user_id) {
        await base44.asServiceRole.entities.ChildExpense.update(expense.id, { 
          family_id: familyId,
          user_id: userId
        });
        updated++;
      }
    }

    return Response.json({ 
      success: true,
      message: `Миграция завершена успешно`,
      family_id: familyId,
      user_id: userId,
      updated
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});