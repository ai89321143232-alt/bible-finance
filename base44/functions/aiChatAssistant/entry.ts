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

    const updateBalanceAndBudget = async (accId, type, amount, category) => {
      const account = await base44.asServiceRole.entities.Account.get(accId);
      if (account) {
        await base44.asServiceRole.entities.Account.update(accId, {
          balance: type === 'expense' ? account.balance - amount : account.balance + amount
        });
      }
      if (type === 'expense' && category) {
        const budgets = await base44.asServiceRole.entities.Budget.filter({ is_active: true, user_id: user.id });
        for (const budget of budgets) {
          const cats = budget.categories?.length > 0 ? budget.categories : (budget.category ? [budget.category] : []);
          if (cats.includes(category)) {
            await base44.asServiceRole.entities.Budget.update(budget.id, { spent_amount: (budget.spent_amount || 0) + amount });
          }
        }
      }
    };

    // === Finalize: user picked an account for a pending transaction ===
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
      await updateBalanceAndBudget(account_id, t.type, t.amount, t.category);
      return Response.json({
        reply: `✅ Записал: ${t.type === 'expense' ? '-' : '+'}${t.amount} ₽ (${t.category})`,
        transaction
      });
    }

    if (!message) return Response.json({ error: 'message is required' }, { status: 400 });

    const categories = await base44.entities.Category.list();
    const categoryNames = categories.map(c => `${c.name} (${c.type === 'income' ? 'доход' : 'расход'})`).join(', ') || 'нет категорий';
    const accountNames = accounts.map(a => a.name).join(', ') || 'нет счетов';

    const systemPrompt = `Ты — голосовой финансовый ассистент в приложении учёта личных финансов. Пользователь может как задавать вопросы о своих финансах, так и голосом/текстом добавлять транзакции (расходы/доходы).

Доступные категории: ${categoryNames}
Доступные счета пользователя: ${accountNames}

${financial_context || ''}

Правила ответа: верни ТОЛЬКО валидный JSON вида:
{
  "reply": "текстовый ответ пользователю на русском языке",
  "is_transaction": true или false,
  "transaction": null или { "type": "expense"|"income", "amount": число, "currency": "RUB", "category": "одна из доступных категорий", "description": "краткое описание", "date": "YYYY-MM-DDT00:00:00.000Z", "account_hint": "название счёта, если упомянуто, иначе пустая строка" }
}

Если пользователь описывает трату/доход — is_transaction=true и заполни transaction. Если это общий вопрос про финансы/аналитику — is_transaction=false, transaction=null, а в reply дай содержательный ответ, используя предоставленные данные.`;

    const historyMessages = (history || []).slice(-10)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    let parsed;
    if (model === 'deepseek' || model === 'openai') {
      const apiKey = model === 'deepseek' ? user.data?.ai_deepseek_key : user.data?.ai_openai_key;
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
        response_json_schema: {
          type: 'object',
          properties: {
            reply: { type: 'string' },
            is_transaction: { type: 'boolean' },
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
            }
          }
        }
      });
    }

    if (!parsed.is_transaction || !parsed.transaction) {
      return Response.json({ reply: parsed.reply });
    }

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
    await updateBalanceAndBudget(matchedAccountId, t.type, t.amount, t.category);

    return Response.json({ reply: parsed.reply, transaction });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});