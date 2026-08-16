import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { effect, applyBalanceDelta, applyBudgetDelta, matchAccount } from '../../shared/transactionEffects.ts';
import { buildAssistantSystemPrompt, invokeAssistantModel } from '../../shared/financialAssistant.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message, model = 'default', history = [], financial_context = '', finalize, account_id, pendingTransaction, pendingInvestment } = body;

    const allAccounts = await base44.entities.Account.list();
    const accounts = allAccounts.filter(a => a.created_by_id === user.id || a.user_id === user.id);

    const entities = base44.asServiceRole.entities;

    // === Finalize: user picked an account for a pending new transaction ===
    if (finalize && pendingTransaction && account_id) {
      const t = pendingTransaction;
      const transaction = await base44.entities.Transaction.create({
        type: t.type,
        amount: t.amount,
        currency: t.currency || 'RUB',
        category: t.category,
        description: t.description,
        date: t.date || new Date().toISOString(),
        account_id,
        user_id: user.id
      });
      await applyBalanceDelta(entities, account_id, effect(t.type, t.amount), user.id);
      if (t.type === 'expense') await applyBudgetDelta(entities, user.id, t.category, t.amount);
      return Response.json({
        reply: `✅ Записал: ${t.type === 'expense' ? '-' : '+'}${t.amount} ₽ (${t.category})`,
        action: 'created',
        transaction
      });
    }

    // === Finalize: user picked an account for a pending investment purchase ===
    if (finalize && pendingInvestment && account_id) {
      const inv = pendingInvestment;
      const quantity = inv.quantity || 1;
      const purchasePrice = inv.purchase_price || 0;
      const totalCost = quantity * purchasePrice;
      const investment = await base44.entities.Investment.create({
        name: inv.name,
        type: inv.type,
        quantity,
        purchase_price: purchasePrice,
        current_price: purchasePrice,
        currency: inv.currency || 'RUB',
        purchase_date: new Date().toISOString().split('T')[0],
        user_id: user.id
      });
      await applyBalanceDelta(entities, account_id, -totalCost, user.id);
      return Response.json({
        reply: `✅ Записал покупку инвестиции: ${inv.name} на ${totalCost.toLocaleString()} ₽`,
        action: 'created_investment',
        investment
      });
    }

    if (!message) return Response.json({ error: 'message is required' }, { status: 400 });

    const categories = await base44.entities.Category.list();
    const categoryNames = categories.map(c => `${c.name} (${c.type === 'income' ? 'доход' : 'расход'})`).join(', ') || 'нет категорий';
    const accountNames = accounts.map(a => a.name).join(', ') || 'нет счетов';

    // Recent transactions with IDs so the model can reference them for edits/deletes
    const recentTx = await base44.entities.Transaction.filter({ created_by_id: user.id }, '-date', 25);
    const recentTxText = recentTx.map(t =>
      `id=${t.id} | ${t.date?.slice(0, 10)} | ${t.type === 'expense' ? 'расход' : 'доход'} | ${t.amount} ₽ | ${t.category} | ${t.description || ''}`
    ).join('\n') || 'нет операций';

    const systemPrompt = buildAssistantSystemPrompt({ categoryNames, accountNames, recentTxText, financial_context });

    const historyMessages = (history || []).slice(-10)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const apiKeys = { deepseek: user.ai_deepseek_key, openai: user.ai_openai_key };
    const parsed = await invokeAssistantModel({ base44, model, apiKeys, systemPrompt, historyMessages, message });

    if (parsed.error) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const action = parsed.action || 'none';

    // === Create ===
    if (action === 'create_transaction' && parsed.transaction) {
      const t = parsed.transaction;
      if (!t.amount || !t.type) {
        return Response.json({ reply: parsed.reply || 'Не удалось распознать сумму или тип операции' });
      }

      const matchedAccountId = matchAccount(accounts, t.account_hint);

      if (!matchedAccountId) {
        return Response.json({
          reply: parsed.reply || 'Уточните, пожалуйста, с какого счёта?',
          needs_account: true,
          pendingTransaction: t,
          accounts: accounts.map(a => ({ id: a.id, name: a.name, balance: a.balance }))
        });
      }

      const transaction = await base44.entities.Transaction.create({
        type: t.type,
        amount: t.amount,
        currency: t.currency || 'RUB',
        category: t.category,
        description: t.description,
        date: t.date || new Date().toISOString(),
        account_id: matchedAccountId,
        user_id: user.id
      });
      await applyBalanceDelta(entities, matchedAccountId, effect(t.type, t.amount), user.id);
      if (t.type === 'expense') await applyBudgetDelta(entities, user.id, t.category, t.amount);

      return Response.json({ reply: parsed.reply, action: 'created', transaction });
    }

    // === Create investment purchase (not a regular expense) ===
    if (action === 'create_investment' && parsed.investment) {
      const inv = parsed.investment;
      if (!inv.name || !inv.type) {
        return Response.json({ reply: parsed.reply || 'Не удалось распознать данные об инвестиции' });
      }

      const matchedAccountId = matchAccount(accounts, inv.account_hint);

      if (!matchedAccountId) {
        return Response.json({
          reply: parsed.reply || 'Уточните, пожалуйста, с какого счёта списать деньги на покупку?',
          needs_account: true,
          pendingInvestment: inv,
          accounts: accounts.map(a => ({ id: a.id, name: a.name, balance: a.balance }))
        });
      }

      const quantity = inv.quantity || 1;
      const purchasePrice = inv.purchase_price || 0;
      const totalCost = quantity * purchasePrice;
      const investment = await base44.entities.Investment.create({
        name: inv.name,
        type: inv.type,
        quantity,
        purchase_price: purchasePrice,
        current_price: purchasePrice,
        currency: inv.currency || 'RUB',
        purchase_date: new Date().toISOString().split('T')[0],
        user_id: user.id
      });
      await applyBalanceDelta(entities, matchedAccountId, -totalCost, user.id);

      return Response.json({ reply: parsed.reply || `✅ Записал покупку инвестиции: ${inv.name} на ${totalCost.toLocaleString()} ₽`, action: 'created_investment', investment });
    }

    // === Create goal ===
    if (action === 'create_goal' && parsed.goal) {
      const g = parsed.goal;
      if (!g.title || !g.target_amount) {
        return Response.json({ reply: parsed.reply || 'Не удалось распознать название или сумму цели' });
      }
      const goal = await base44.entities.Goal.create({
        title: g.title,
        type: g.type || 'savings',
        target_amount: g.target_amount,
        current_amount: 0,
        currency: g.currency || 'RUB',
        deadline: g.deadline || undefined,
        priority: g.priority || 'medium',
        user_id: user.id,
        visibility: 'private',
        status: 'active'
      });
      return Response.json({ reply: parsed.reply || `✅ Создал цель: ${g.title} — накопить ${g.target_amount.toLocaleString()} ₽`, action: 'created_goal', goal });
    }

    // === Create budget ===
    if (action === 'create_budget' && parsed.budget) {
      const b = parsed.budget;
      if (!b.name || !b.limit_amount) {
        return Response.json({ reply: parsed.reply || 'Не удалось распознать название или лимит бюджета' });
      }
      const budget = await base44.entities.Budget.create({
        name: b.name,
        categories: b.categories || [],
        limit_amount: b.limit_amount,
        spent_amount: 0,
        period: b.period || 'monthly',
        currency: b.currency || 'RUB',
        user_id: user.id,
        visibility: 'private',
        is_active: true,
        start_date: new Date().toISOString().split('T')[0]
      });
      return Response.json({ reply: parsed.reply || `✅ Создал бюджет: ${b.name} — лимит ${b.limit_amount.toLocaleString()} ₽`, action: 'created_budget', budget });
    }

    // === Update ===
    if (action === 'update_transaction' && parsed.transaction_id && parsed.updates) {
      const existing = recentTx.find(t => t.id === parsed.transaction_id);
      if (!existing) {
        return Response.json({ reply: parsed.reply || 'Не удалось найти указанную операцию.' });
      }
      const u = parsed.updates;
      const newType = u.type || existing.type;
      const newAmount = u.amount !== undefined ? u.amount : existing.amount;
      const newCategory = u.category || existing.category;

      // Revert old effect, apply new effect
      await applyBalanceDelta(entities, existing.account_id, -effect(existing.type, existing.amount), user.id);
      if (existing.type === 'expense') await applyBudgetDelta(entities, user.id, existing.category, -existing.amount);

      await applyBalanceDelta(entities, existing.account_id, effect(newType, newAmount), user.id);
      if (newType === 'expense') await applyBudgetDelta(entities, user.id, newCategory, newAmount);

      const updatePayload = {};
      if (u.type) updatePayload.type = u.type;
      if (u.amount !== undefined) updatePayload.amount = u.amount;
      if (u.category) updatePayload.category = u.category;
      if (u.description !== undefined) updatePayload.description = u.description;
      if (u.date) updatePayload.date = u.date;

      const transaction = await base44.entities.Transaction.update(existing.id, updatePayload);
      return Response.json({ reply: parsed.reply || '✅ Операция обновлена', action: 'updated', transaction });
    }

    // === Delete ===
    if (action === 'delete_transaction' && parsed.transaction_id) {
      const existing = recentTx.find(t => t.id === parsed.transaction_id);
      if (!existing) {
        return Response.json({ reply: parsed.reply || 'Не удалось найти указанную операцию.' });
      }
      await applyBalanceDelta(entities, existing.account_id, -effect(existing.type, existing.amount), user.id);
      if (existing.type === 'expense') await applyBudgetDelta(entities, user.id, existing.category, -existing.amount);
      await base44.entities.Transaction.delete(existing.id);
      return Response.json({ reply: parsed.reply || '🗑️ Операция удалена', action: 'deleted' });
    }

    return Response.json({ reply: parsed.reply, action: 'none' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});