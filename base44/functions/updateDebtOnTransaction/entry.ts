import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// updateDebtOnTransaction — синхронизация остатка долга с балансом
// связанного кредитного счёта при любой операции по этому счёту.
// Вызывается автоматизацией (entity Transaction create/update/delete).
// Логика под service role (аналог updateBudgetOnTransaction).
// ============================================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    // Собираем все ID счетов, затронутых операцией
    const affectedAccountIds = new Set();
    if (data?.account_id) affectedAccountIds.add(data.account_id);
    if (data?.to_account_id) affectedAccountIds.add(data.to_account_id);
    if (event === 'update' || event === 'delete') {
      if (old_data?.account_id) affectedAccountIds.add(old_data.account_id);
      if (old_data?.to_account_id) affectedAccountIds.add(old_data.to_account_id);
    }

    if (affectedAccountIds.size === 0) {
      return Response.json({ message: 'No affected accounts' });
    }

    // Загружаем все DebtAccount (RLS под service role пропускается)
    const allDebts = await base44.asServiceRole.entities.DebtAccount.list();

    // Находим долги, привязанные к затронутым счетам
    const linkedDebts = allDebts.filter(d =>
      d.linked_account_id && affectedAccountIds.has(d.linked_account_id)
    );

    if (linkedDebts.length === 0) {
      return Response.json({ message: 'No linked debts' });
    }

    const results = [];

    for (const debt of linkedDebts) {
      try {
        // Получаем текущий баланс связанного счёта
        const account = await base44.asServiceRole.entities.Account.get(debt.linked_account_id);
        if (!account) {
          results.push({ id: debt.id, skipped: 'account not found' });
          continue;
        }

        // Остаток долга = модуль отрицательного баланса (если счёт в плюсе — долг 0)
        const newRemaining = Math.abs(Math.min(account.balance || 0, 0));
        const updates = {
          remaining_amount: newRemaining,
          currency: account.currency || debt.currency || 'RUB',
        };

        // При полном погашении — переводим в paid_off
        if (newRemaining <= 0 && debt.status !== 'paid_off') {
          updates.status = 'paid_off';
        } else if (newRemaining > 0 && debt.status === 'paid_off') {
          updates.status = 'active';
        }

        // Обновляем только если значение изменилось
        if (debt.remaining_amount !== newRemaining || updates.status) {
          await base44.asServiceRole.entities.DebtAccount.update(debt.id, updates);
          results.push({ id: debt.id, remaining: newRemaining, status: updates.status || debt.status });
        }
      } catch (e) {
        results.push({ id: debt.id, error: e.message });
      }
    }

    return Response.json({ message: `Synced ${results.length} debt(s)`, results });
  } catch (error) {
    console.error('updateDebtOnTransaction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});