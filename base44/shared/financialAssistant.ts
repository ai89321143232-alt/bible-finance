// Общая логика финансового AI-ассистента: системный промпт, схема ответа, вызов модели
// и сбор финансового контекста пользователя. Используется в aiChatAssistant (веб-чат)
// и telegramWebhook (Telegram-бот), чтобы поведение было идентичным в обоих каналах.

export const ASSISTANT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    action: { type: 'string', enum: ['create_transaction', 'create_investment', 'update_transaction', 'delete_transaction', 'none'] },
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
    investment: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['stocks', 'crypto', 'etf', 'bonds', 'deposit', 'real_estate', 'precious_metals', 'other'] },
        quantity: { type: 'number' },
        purchase_price: { type: 'number' },
        currency: { type: 'string' },
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

export function buildAssistantSystemPrompt({ categoryNames, accountNames, recentTxText, financial_context = '' }) {
  return `Ты — финансовый ассистент в приложении учёта личных финансов. Ты умеешь:
1) Отвечать на вопросы о финансах пользователя и давать отчёты по тратам/доходам (за сегодня, за период, по категориям) — используй предоставленные данные.
2) Добавлять новую транзакцию (расход/доход), когда пользователь описывает покупку/доход.
3) Записывать покупку инвестиции (акции, крипта, ETF, облигации, вклад, драгметаллы, недвижимость как актив), когда пользователь пишет, что купил/приобрёл/вложился в такой актив. Это НЕ обычный расход — используй action="create_investment" и заполни investment (не transaction). Деньги списываются со счёта, но операция не попадает в категории расходов и бюджеты — это инвестиционный актив.
   ПРИОРИТЕТ: если в сообщении есть слова/названия активов — акции, акций, крипта, криптовалюта, биткоин, bitcoin, ETF, облигации, вклад, депозит, золото, драгметаллы, инвестиция, инвестировал, портфель, тикер компании (например Apple, Tesla, Сбербанк) — ВСЕГДА выбирай action="create_investment", а НЕ create_transaction, даже если фраза звучит как "потратил"/"купил на Х рублей". Пример: "купил акции Apple на 10000 руб" → action="create_investment", investment={name:"Apple", type:"stocks", quantity:1, purchase_price:10000}. Обычным расходом (create_transaction) считай только покупку товаров/услуг для потребления, а не покупку финансового актива.
4) Редактировать существующую транзакцию (сумму, категорию, описание, дату), если пользователь просит что-то исправить.
5) Удалять существующую транзакцию, если пользователь просит её убрать/отменить.
6) Если в данных ниже есть раздел "РАСХОДЫ ЧЛЕНОВ СЕМЬИ" — используй его, чтобы отвечать на вопросы о том, кто из членов семьи и куда (на какие категории) тратит деньги, и кто тратит больше/меньше.

Доступные категории: ${categoryNames}
Доступные счета пользователя: ${accountNames}

Последние операции пользователя (используй id для правки/удаления, выбирай наиболее подходящую по описанию/сумме/дате из сообщения пользователя):
${recentTxText}

${financial_context || ''}

Важно: если пользователь спрашивает про остаток/баланс/"сколько у меня денег" — отвечай суммой из раздела "ОСТАТОК ДЕНЕГ" (реальный баланс счетов), а НЕ суммой расходов или дохода за месяц — это разные вещи.

Правила ответа: верни ТОЛЬКО валидный JSON вида:
{
  "reply": "текстовый ответ пользователю на русском языке",
  "action": "create_transaction" | "create_investment" | "update_transaction" | "delete_transaction" | "none",
  "transaction": null или { "type": "expense"|"income", "amount": число, "currency": "RUB", "category": "одна из доступных категорий", "description": "краткое описание", "date": "YYYY-MM-DDT00:00:00.000Z", "account_hint": "название счёта, если упомянуто, иначе пустая строка" },
  "investment": null или { "name": "название актива, например Apple или Bitcoin", "type": "stocks"|"crypto"|"etf"|"bonds"|"deposit"|"real_estate"|"precious_metals"|"other", "quantity": число (1, если не указано), "purchase_price": цена за единицу (если куплено на общую сумму X штук 1 — вся сумма), "currency": "RUB", "account_hint": "название счёта, если упомянуто, иначе пустая строка" },
  "transaction_id": null или "id операции из списка выше" (для update_transaction/delete_transaction),
  "updates": null или { "amount": число, "category": "...", "description": "...", "date": "...", "type": "expense"|"income" } (только изменённые поля, для update_transaction)
}

Если это вопрос/отчёт — action="none", transaction=null, а в reply дай содержательный ответ на основе данных.
Если описывается новая покупка/доход (обычная, не инвестиционная) — action="create_transaction" и заполни transaction.
Если описывается покупка инвестиционного актива — action="create_investment" и заполни investment, transaction оставь null.
Если просят исправить/поменять существующую операцию — action="update_transaction", укажи transaction_id и только изменённые поля в updates.
Если просят удалить/отменить операцию — action="delete_transaction" и укажи transaction_id.
Если не можешь однозначно определить, какую операцию редактировать/удалять — action="none" и в reply уточни у пользователя.`;
}

// model: 'default' | 'deepseek' | 'openai'; apiKeys: { deepseek, openai }
export async function invokeAssistantModel({ base44, model, apiKeys = {}, systemPrompt, historyMessages, message }) {
  if (model === 'deepseek' || model === 'openai') {
    const apiKey = model === 'deepseek' ? apiKeys.deepseek : apiKeys.openai;
    if (!apiKey) {
      return { error: `Добавьте API-ключ для ${model === 'deepseek' ? 'DeepSeek' : 'ChatGPT'} в настройках` };
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
      return { error: `Ошибка ${model === 'deepseek' ? 'DeepSeek' : 'ChatGPT'}: ${errText.slice(0, 200)}` };
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    try {
      return JSON.parse(content);
    } catch (e) {
      return { error: 'Не удалось разобрать ответ модели' };
    }
  }

  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `${systemPrompt}\n\nИстория переписки:\n${historyMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nСообщение пользователя: ${message}`,
    response_json_schema: ASSISTANT_RESPONSE_SCHEMA
  });
}

// Собирает текстовый финансовый контекст пользователя (для Telegram-бота, где нет фронтенда,
// который бы прислал этот контекст, как в веб-чате).
export async function computeFinancialContext(entities, ownerId) {
  const [allTransactions, allBudgets, allGoals, allInvestments, allAccounts, owner] = await Promise.all([
    entities.Transaction.list('-date', 300),
    entities.Budget.list(),
    entities.Goal.list(),
    entities.Investment.list(),
    entities.Account.list(),
    entities.User.get(ownerId).catch(() => null)
  ]);
  const family = owner?.family_id ? await entities.Family.get(owner.family_id).catch(() => null) : null;

  const mine = (arr) => arr.filter(x => x.created_by_id === ownerId || x.user_id === ownerId);
  const transactions = mine(allTransactions);
  const budgets = mine(allBudgets).filter(b => b.is_active);
  const goals = mine(allGoals).filter(g => g.status === 'active');
  const investments = mine(allInvestments);
  const accounts = mine(allAccounts);
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = now.toISOString().slice(0, 10);

  const monthTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const todayTransactions = transactions.filter(t => (t.date || '').slice(0, 10) === todayStr);
  const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const expensesByCategory = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category || 'Другое'] = (acc[t.category || 'Другое'] || 0) + t.amount;
      return acc;
    }, {});

  const investmentValue = investments.reduce((sum, inv) => sum + (inv.quantity * (inv.current_price || inv.purchase_price)), 0);

  // Расходы по каждому члену семьи за текущий месяц, отсортированные по сумме —
  // чтобы ассистент мог рассказать, кто и куда тратит деньги в семье.
  let familySection = '';
  if (family?.members?.length > 0) {
    const familyMonthExpenses = allTransactions.filter(t =>
      t.type === 'expense' && new Date(t.date) >= monthStart &&
      family.members.some(m => t.user_id === m.user_id || t.created_by_id === m.user_id)
    );
    const byMember = family.members.map(m => {
      const memberTx = familyMonthExpenses.filter(t => t.user_id === m.user_id || t.created_by_id === m.user_id);
      const total = memberTx.reduce((s, t) => s + t.amount, 0);
      const byCat = memberTx.reduce((acc, t) => {
        const cat = t.category || 'Другое';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {});
      const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
      return { name: m.display_name || m.name, total, topCat };
    }).sort((a, b) => b.total - a.total);

    familySection = `
РАСХОДЫ ЧЛЕНОВ СЕМЬИ ЗА МЕСЯЦ (${family.name}), отсортировано по убыванию суммы:
${byMember.map(b => `- ${b.name}: ${b.total.toLocaleString()} ₽${b.topCat ? ` (больше всего на «${b.topCat[0]}»: ${b.topCat[1].toLocaleString()} ₽)` : ''}`).join('\n')}
`;
  }

  return `
Финансовые данные пользователя:

ОСТАТОК ДЕНЕГ (текущий баланс на счетах прямо сейчас — используй ЭТО значение, если спрашивают "сколько денег", "какой остаток", "баланс"):
${accounts.map(a => `- ${a.name}: ${(a.balance || 0).toLocaleString()} ₽`).join('\n') || '- Нет счетов'}
- ИТОГО остаток по всем счетам: ${totalBalance.toLocaleString()} ₽

СЕГОДНЯ (${todayStr}):
- Доход: ${todayIncome.toLocaleString()} ₽
- Расходы: ${todayExpenses.toLocaleString()} ₽

ДОХОДЫ И РАСХОДЫ (текущий месяц, НЕ путать с остатком денег):
- Общий доход: ${monthIncome.toLocaleString()} ₽
- Общие расходы: ${monthExpenses.toLocaleString()} ₽
- Разница доход-расход за месяц: ${(monthIncome - monthExpenses).toLocaleString()} ₽

РАСХОДЫ ПО КАТЕГОРИЯМ:
${Object.entries(expensesByCategory).map(([cat, amount]) => `- ${cat}: ${amount.toLocaleString()} ₽`).join('\n') || '- Нет данных'}

БЮДЖЕТЫ:
${budgets.map(b => `- ${b.name}: потрачено ${(b.spent_amount || 0).toLocaleString()} из ${b.limit_amount.toLocaleString()} ₽`).join('\n') || '- Нет бюджетов'}

ФИНАНСОВЫЕ ЦЕЛИ:
${goals.map(g => `- ${g.title}: накоплено ${(g.current_amount || 0).toLocaleString()} из ${g.target_amount.toLocaleString()} ₽`).join('\n') || '- Нет целей'}

ИНВЕСТИЦИОННЫЙ ПОРТФЕЛЬ:
- Общая стоимость: ${investmentValue.toLocaleString()} ₽
${familySection}`;
}