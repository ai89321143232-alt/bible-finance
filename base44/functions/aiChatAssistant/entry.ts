import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message, model = 'default', history = [], financial_context = '', finalize, account_id, pendingTransaction } = body;

    const allAccounts = await base44.entities.Account.list();
    const accounts = allAccounts.filter(a => a.created_by_id === user.id || a.user_id === user.id);

    const effect = (type, amount) => (type === 'expense' ? -amount : amount);

    const applyBalanceDelta = async (accId, delta) => {
      if (!accId) return;
      const account = await base44.asServiceRole.entities.Account.get(accId);
      if (account) {
        await base44.asServiceRole.entities.Account.update(accId, { balance: (account.balance || 0) + delta });
      }
    };

    const applyBudgetDelta = async (category, delta) => {
      if (!category) return;
      const budgets = await base44.asServiceRole.entities.Budget.filter({ is_active: true, user_id: user.id });
      for (const budget of budgets) {
        const cats = budget.categories?.length > 0 ? budget.categories : (budget.category ? [budget.category] : []);
        if (cats.includes(category)) {
          await base44.asServiceRole.entities.Budget.update(budget.id, { spent_amount: (budget.spent_amount || 0) + delta });
        }
      }
    };

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
      await applyBalanceDelta(account_id, effect(t.type, t.amount));
      if (t.type === 'expense') await applyBudgetDelta(t.category, t.amount);
      return Response.json({
        reply: `✅ Записал: ${t.type === 'expense' ? '-' : '+'}${t.amount} ₽ (${t.category})`,
        action: 'created',
        transaction
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

    const systemPrompt = `Ты — финансовый ассистент в приложении учёта личных финансов. Ты умеешь:
1) Отвечать на вопросы о финансах пользователя и давать отчёты по тратам/доходам (за сегодня, за период, по категориям) — используй предоставленные данные.
2) Добавлять новую транзакцию (расход/доход), когда пользователь описывает покупку/доход.
3) Редактировать существующую транзакцию (сумму, категорию, описание, дату), если пользователь просит что-то исправить.
4) Удалять существующую транзакцию, если пользователь просит её убрать/отменить.

Доступные категории: ${categoryNames}
Доступные счета пользователя: ${accountNames}

Последние операции пользователя (используй id для правки/удаления, выбирай наиболее подходящую по описанию/сумме/дате из сообщения пользователя):
${recentTxText}

${financial_context || ''}

Правила ответа: верни ТОЛЬКО валидный JSON вида:
{
  "reply": "текстовый ответ пользователю на русском языке",
  "action": "create_transaction" | "update_transaction" | "delete_transaction" | "none",
  "transaction": null или { "type": "expense"|"income", "amount": число, "currency": "RUB", "category": "одна из доступных категорий", "description": "краткое описание", "date": "YYYY-MM-DDT00:00:00.000Z", "account_hint": "название счёта, если упомянуто, иначе пустая строка" },
  "transaction_id": null или "id операции из списка выше" (для update_transaction/delete_transaction),
  "updates": null или { "amount": число, "category": "...", "description": "...", "date": "...", "type": "expense"|"income" } (только изменённые поля, для update_transaction)
}

Если это вопрос/отчёт — action="none", transaction=null, а в reply дай содержательный ответ на основе данных.
Если описывается новая покупка/доход — action="create_transaction" и заполни transaction.
Если просят исправить/поменять существующую операцию — action="update_transaction", укажи transaction_id и только изменённые поля в updates.
Если просят удалить/отменить операцию — action="delete_transaction" и укажи transaction_id.
Если не можешь однозначно определить, какую операцию редактировать/удалять — action="none" и в reply уточни у пользователя.`;

    const historyMessages = (history || []).slice(-10)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const responseSchema = {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        action: { type: 'string', enum: ['create_transaction', 'update_transaction', 'delete_transaction', 'none'] },
        transaction: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string' },
            account_hint: { type: 'string' }
          }
        },
        transaction_id: { type: 'string' },
        updates: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            amount: { type: 'number' },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string' }
          }
        }
      }
    };

    let parsed;
    if (model === 'deepseek' || model === 'openai') {
      const apiKey = model === 'deepseek' ? user.ai_deepseek_key : user.ai_openai_key;
      if (!apiKey) {
        return Response.json({ error: `Добавьте API-ключ для ${model === 'deepseek' ? 'DeepSeek' : 'ChatGPT'} в настройках` }, { status: 400 });
      }
      const url = model === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      const modelName = model === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'system', content: systemPrompt }, ...historyMessages, { role: 'user', content: message }],
          response_format: { type: 'json_object' }
        })
      });
      if (!resp.ok) {
        const errText = await resp.text();
        return Response.json({ error: `Ошибка ${model === 'deepseek' ? 'DeepSeek' : 'ChatGPT'}: ${errText.slice(0, 200)}` }, { status: 400 });
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        return Response.json({ error: 'Не удалось разобрать ответ модели' }, { status: 500 });
      }
    } else {
      parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\nИстория переписки:\n${historyMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nСообщение пользователя: ${message}`,
        response_json_schema: responseSchema
      });
    }

    const action = parsed.action || 'none';

    // === Create ===
    if (action === 'create_transaction' && parsed.transaction) {
      const t = parsed.transaction;
      if (!t.amount || !t.type) {
        return Response.json({ reply: parsed.reply || 'Не удалось распознать сумму или тип операции' });
      }

      let matchedAccountId = null;
      if (accounts.length === 1) {
        matchedAccountId = accounts[0].id;
      } else if (t.account_hint) {
        const hint = t.account_hint.toLowerCase();
        for (const acc of accounts) {
          const accName = (acc.name || '').toLowerCase();
          if (accName.includes(hint) || hint.includes(accName)) { matchedAccountId = acc.id; break; }
          if ((hint.includes('карт') || hint.includes('card')) && acc.type === 'card') { matchedAccountId = acc.id; break; }
          if ((hint.includes('налич') || hint.includes('cash')) && acc.type === 'cash') { matchedAccountId = acc.id; break; }
          if (hint.includes('кредит') && acc.type === 'credit') { matchedAccountId = acc.id; break; }
        }
      }

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
      await applyBalanceDelta(matchedAccountId, effect(t.type, t.amount));
      if (t.type === 'expense') await applyBudgetDelta(t.category, t.amount);

      return Response.json({ reply: parsed.reply, action: 'created', transaction });
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
      await applyBalanceDelta(existing.account_id, -effect(existing.type, existing.amount));
      if (existing.type === 'expense') await applyBudgetDelta(existing.category, -existing.amount);

      await applyBalanceDelta(existing.account_id, effect(newType, newAmount));
      if (newType === 'expense') await applyBudgetDelta(newCategory, newAmount);

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
      await applyBalanceDelta(existing.account_id, -effect(existing.type, existing.amount));
      if (existing.type === 'expense') await applyBudgetDelta(existing.category, -existing.amount);
      await base44.entities.Transaction.delete(existing.id);
      return Response.json({ reply: parsed.reply || '🗑️ Операция удалена', action: 'deleted' });
    }

    return Response.json({ reply: parsed.reply, action: 'none' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});