import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// updateDebtOnTransaction — синхронизация остатка долга с балансом
// связанного кредитного счёта при любой операции по этому счёту.
// Вызывается автоматизацией (entity Transaction create/update/delete)
// и (entity Account create/update) для авто-провижнинга.
//
// Логика:
//   1. Для Transaction-событий: собираем затронутые счета, для каждого
//      кредитного счёта находим (или СОЗДАЁМ) DebtAccount и синхронизируем
//      remaining_amount = |min(balance, 0)|.
//   2. Для Account-событий: если счёт type=credit и нет DebtAccount —
//      создаём автоматически (авто-провижнинг).
// ============================================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data, entity_name } = payload;

    // ----- Режим Account: авто-провижнинг при создании/обновлении счёта -----
    if (entity_name === 'Account') {
      const account = data;
      if (!account) return Response.json({ message: 'No account data' });

      // Только кредитные счета
      if (account.type !== 'credit') {
        return Response.json({ message: 'Not a credit account, skip' });
      }

      // Загружаем все долги и проверяем, есть ли уже привязанный
      const allDebts = await base44.asServiceRole.entities.DebtAccount.list();
      const existing = allDebts.find(d => d.linked_account_id === account.id);

      if (existing) {
        // Синхронизируем остаток
        const newRemaining = Math.abs(Math.min(account.balance || 0, 0));
        const updates = { remaining_amount: newRemaining, currency: account.currency || existing.currency || 'RUB' };
        if (newRemaining <= 0 && existing.status !== 'paid_off') updates.status = 'paid_off';
        else if (newRemaining > 0 && existing.status === 'paid_off') updates.status = 'active';
        if (existing.remaining_amount !== newRemaining || updates.status) {
          await base44.asServiceRole.entities.DebtAccount.update(existing.id, updates);
        }
        return Response.json({ message: 'Synced existing debt', id: existing.id });
      }

      // Нет DebtAccount — создаём автоматически
      const newRemaining = Math.abs(Math.min(account.balance || 0, 0));
      const debt = await base44.asServiceRole.entities.DebtAccount.create({
        name: account.name || 'Кредитная карта',
        type: 'credit_card',
        creditor: '',
        total_amount: newRemaining,
        remaining_amount: newRemaining,
        currency: account.currency || 'RUB',
        interest_rate: 0,
        monthly_payment: 0,
        min_payment_percent: 3,
        payment_day: 15,
        payment_type: 'annuity',
        linked_account_id: account.id,
        status: newRemaining > 0 ? 'active' : 'paid_off',
        strategy_order: 0,
        family_id: account.family_id || null,
        user_id: account.user_id || account.created_by_id || null,
        workspace_id: account.workspace_id || null,
        visibility: account.visibility || 'private',
      });
      return Response.json({ message: 'Auto-provisioned debt', id: debt.id });
    }

    // ----- Режим Transaction: синхронизация долгов -----
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

    // Загружаем все DebtAccount и все Account (для проверки типа)
    const allDebts = await base44.asServiceRole.entities.DebtAccount.list();
    const allAccounts = await base44.asServiceRole.entities.Account.list();

    // Для каждого затронутого счёта: если он кредитный — найти или создать долг
    const results = [];

    for (const accId of affectedAccountIds) {
      const account = allAccounts.find(a => a.id === accId);
      if (!account || account.type !== 'credit') {
        continue;
      }

      const existing = allDebts.find(d => d.linked_account_id === accId);
      const newRemaining = Math.abs(Math.min(account.balance || 0, 0));

      if (existing) {
        // Синхронизируем
        const updates = {
          remaining_amount: newRemaining,
          currency: account.currency || existing.currency || 'RUB',
        };
        if (newRemaining <= 0 && existing.status !== 'paid_off') updates.status = 'paid_off';
        else if (newRemaining > 0 && existing.status === 'paid_off') updates.status = 'active';

        if (existing.remaining_amount !== newRemaining || updates.status) {
          await base44.asServiceRole.entities.DebtAccount.update(existing.id, updates);
          results.push({ id: existing.id, remaining: newRemaining, status: updates.status || existing.status });
        }
      } else {
        // Авто-создаём DebtAccount для кредитного счёта без долга
        const debt = await base44.asServiceRole.entities.DebtAccount.create({
          name: account.name || 'Кредитная карта',
          type: 'credit_card',
          creditor: '',
          total_amount: newRemaining,
          remaining_amount: newRemaining,
          currency: account.currency || 'RUB',
          interest_rate: 0,
          monthly_payment: 0,
          min_payment_percent: 3,
          payment_day: 15,
          payment_type: 'annuity',
          linked_account_id: account.id,
          status: newRemaining > 0 ? 'active' : 'paid_off',
          strategy_order: 0,
          family_id: account.family_id || null,
          user_id: account.user_id || account.created_by_id || null,
          workspace_id: account.workspace_id || null,
          visibility: account.visibility || 'private',
        });
        results.push({ id: debt.id, created: true, remaining: newRemaining });
      }
    }

    return Response.json({ message: `Processed ${results.length} debt(s)`, results });
  } catch (error) {
    console.error('updateDebtOnTransaction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});