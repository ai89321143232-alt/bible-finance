// Общая логика финансового AI-ассистента: системный промпт, схема ответа, вызов модели
// и сбор финансового контекста пользователя. Используется в aiChatAssistant (веб-чат)
// и telegramWebhook (Telegram-бот), чтобы поведение было идентичным в обоих каналах.
import { createCurrencyTools } from './currencyConvert.ts';

export const ASSISTANT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    action: { type: 'string', enum: ['create_transaction', 'create_transactions', 'create_investment', 'create_goal', 'create_budget', 'update_transaction', 'delete_transaction', 'none'] },
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
    transactions: {
      type: 'array',
      items: {
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
    goal: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        type: { type: 'string', enum: ['savings', 'debt_payoff', 'investment', 'purchase', 'emergency_fund', 'other'] },
        target_amount: { type: 'number' },
        currency: { type: 'string' },
        deadline: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] }
      }
    },
    budget: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        categories: { type: 'array', items: { type: 'string' } },
        limit_amount: { type: 'number' },
        period: { type: 'string', enum: ['weekly', 'monthly', 'quarterly', 'yearly'] },
        currency: { type: 'string' }
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
2а) МАССОВОЕ ДОБАВЛЕНИЕ: если пользователь прислал СПИСОК из нескольких операций — используй action="create_transactions" и заполни массив transactions (по одному элементу на каждую операцию). Списком считается ЛЮБОЕ сообщение с 2+ строками вида "описание – сумма" или "описание: сумма" (например: "Такси – 633 ₽\nБазар – 846 ₽"), даже если перед списком есть строка-заголовок с датой или счётом. Каждая операция: type (expense/income), amount (ЧИСЛО без пробелов-разделителей: "1 472 ₽" → 1472, "633 ₽" → 633), category (из доступных категорий, подбирай максимально близко по смыслу), description (название позиции без суммы), date (YYYY-MM-DDT00:00:00.000Z — если в заголовке указана дата как "30 АВГУСТА", переведи её в дату текущего года; если не указана — пустая строка). НЕ разбивай список на отдельные сообщения — верни весь массив одним ответом. Если в заголовке указан счёт (например "счет наличными") — проставь его в account_hint каждой операции.
3) Записывать покупку инвестиции (акции, крипта, ETF, облигации, вклад, драгметаллы, недвижимость как актив), когда пользователь пишет, что купил/приобрёл/вложился в такой актив. Это НЕ обычный расход — используй action="create_investment" и заполни investment (не transaction). Деньги списываются со счёта, но операция не попадает в категории расходов и бюджеты — это инвестиционный актив.
   ПРИОРИТЕТ: если в сообщении есть слова/названия активов — акции, акций, крипта, криптовалюта, биткоин, bitcoin, ETF, облигации, вклад, депозит, золото, драгметаллы, инвестиция, инвестировал, портфель, тикер компании (например Apple, Tesla, Сбербанк) — ВСЕГДА выбирай action="create_investment", а НЕ create_transaction, даже если фраза звучит как "потратил"/"купил на Х рублей". Пример: "купил акции Apple на 10000 руб" → action="create_investment", investment={name:"Apple", type:"stocks", quantity:1, purchase_price:10000}. Обычным расходом (create_transaction) считай только покупку товаров/услуг для потребления, а не покупку финансового актива.
4) Создавать финансовую цель (накопить на отпуск, на машину, на подушку безопасности, погасить долг и т.д.), когда пользователь говорит "создай цель", "хочу накопить на", "поставь цель" и т.п. Используй action="create_goal" и заполни goal.
5) Создавать бюджет (лимит на категорию расходов), когда пользователь говорит "создай бюджет на продукты", "установи лимит", "бюджет на транспорт" и т.п. Используй action="create_budget" и заполни budget. Категории выбирай из доступных категорий пользователя.
6) Редактировать существующую транзакцию (сумму, категорию, описание, дату), если пользователь просит что-то исправить.
7) Удалять существующую транзакцию, если пользователь просит её убрать/отменить.
8) Если в данных ниже есть раздел "РАСХОДЫ ЧЛЕНОВ СЕМЬИ" — используй его, чтобы отвечать на вопросы о том, кто из членов семьи и куда (на какие категории) тратит деньги, и кто тратит больше/меньше.
9) Если пользователь спрашивает об инвестициях, портфеле, активах или о том, куда вложены деньги — в ответе сначала укажи общую стоимость портфеля, затем перечисли КАЖДЫЙ актив из раздела «ИНВЕСТИЦИОННЫЙ ПОРТФЕЛЬ»: название, тип и текущую стоимость. Не ограничивайся общей суммой. Если спрашивают о конкретном активе, ответь по соответствующей строке списка.
10) Оформляй КАЖДЫЙ текстовый ответ дружелюбно и структурированно для Telegram: используй подходящие эмодзи в заголовках и возле ключевых сумм (например, 💰 для баланса, 📈 для инвестиций, 📉 для расходов, ✅ для подтверждения). Длинные ответы разделяй на короткие смысловые блоки с переносами строк; перечисления оформляй отдельными строками с маркерами. Не злоупотребляй эмодзи: одного на заголовок или строку достаточно. Сохраняй точность чисел и не добавляй вымышленных данных.

Доступные категории: ${categoryNames}
Доступные счета пользователя: ${accountNames}

Последние операции пользователя (используй id для правки/удаления, выбирай наиболее подходящую по описанию/сумме/дате из сообщения пользователя):
${recentTxText}

${financial_context || ''}

Важно: если пользователь спрашивает про остаток/баланс/"сколько у меня денег" — отвечай суммой из раздела "ОСТАТОК ДЕНЕГ" (реальный баланс счетов), а НЕ суммой расходов или дохода за месяц — это разные вещи.

ВАЛЮТА: извлекай валюту из сообщения пользователя. Поддерживаемые коды: RUB (рубль/₽), USD (доллар/$), EUR (евро/€), KZT (тенге/₸), BYN (белорусский рубль), UAH (гривна), UZS (сум/узбекский сум). Если пользователь явно указал валюту — используй её код. Если не указал — "RUB".
Правила ответа: верни ТОЛЬКО валидный JSON вида:
{
  "reply": "текстовый ответ пользователю на русском языке",
  "action": "create_transaction" | "create_transactions" | "create_investment" | "update_transaction" | "delete_transaction" | "none",
  "transaction": null или { "type": "expense"|"income", "amount": число, "currency": "код валюты из сообщения или RUB", "category": "одна из доступных категорий", "description": "краткое описание", "date": "YYYY-MM-DDT00:00:00.000Z", "account_hint": "название счёта, если упомянуто, иначе пустая строка" },
  "investment": null или { "name": "название актива, например Apple или Bitcoin", "type": "stocks"|"crypto"|"etf"|"bonds"|"deposit"|"real_estate"|"precious_metals"|"other", "quantity": число (1, если не указано), "purchase_price": цена за единицу (если куплено на общую сумму X штук 1 — вся сумма), "currency": "код валюты из сообщения или RUB", "account_hint": "название счёта, если упомянуто, иначе пустая строка" },
  "goal": null или { "title": "название цели", "type": "savings"|"debt_payoff"|"investment"|"purchase"|"emergency_fund"|"other", "target_amount": число, "currency": "код валюты из сообщения или RUB", "deadline": "YYYY-MM-DD или null", "priority": "low"|"medium"|"high" },
  "budget": null или { "name": "название бюджета", "categories": ["категория1", "категория2"], "limit_amount": число, "period": "weekly"|"monthly"|"quarterly"|"yearly", "currency": "код валюты из сообщения или RUB" },
  "transaction_id": null или "id операции из списка выше" (для update_transaction/delete_transaction),
  "updates": null или { "amount": число, "category": "...", "description": "...", "date": "...", "type": "expense"|"income" } (только изменённые поля, для update_transaction)
}

Если это вопрос/отчёт — action="none", transaction=null, а в reply дай содержательный ответ на основе данных.
Если описывается ОДНА новая покупка/доход — action="create_transaction" и заполни transaction.
Если пользователь прислал СПИСОК из нескольких операций — action="create_transactions" и заполни массив transactions (transaction оставь null).
Если описывается покупка инвестиционного актива — action="create_investment" и заполни investment, transaction оставь null.
Если просят создать финансовую цель — action="create_goal" и заполни goal, transaction оставь null. Тип цели: savings (накопление), debt_payoff (погашение долга), investment (инвестиционная цель), purchase (покупка), emergency_fund (подушка безопасности), other. Priority по умолчанию "medium".
Если просят создать бюджет — action="create_budget" и заполни budget, transaction оставь null. Категории выбирай из доступных категорий, period по умолчанию "monthly".
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

// Возвращает {year, month, day} даты в конкретном часовом поясе (IANA), чтобы день/месяц
// определялись по времени пользователя, а не по времени сервера.
function tzDateParts(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return { year: parseInt(parts.year), month: parseInt(parts.month), day: parseInt(parts.day) };
}

// Собирает текстовый финансовый контекст пользователя (для Telegram-бота, где нет фронтенда,
// который бы прислал этот контекст, как в веб-чате).
// timezone (IANA, например "Europe/Moscow") — часовой пояс пользователя, чтобы "сегодня"/"этот месяц"
// определялись по его локальному времени, а не по времени сервера.
export async function computeFinancialContext(entities, ownerId, timezone = 'UTC') {
  const [allTransactions, allBudgets, allGoals, allInvestments, allAccounts, owner] = await Promise.all([
    entities.Transaction.list('-date', 300),
    entities.Budget.list(),
    entities.Goal.list(),
    entities.Investment.list(),
    entities.Account.list(),
    entities.User.get(ownerId).catch(() => null)
  ]);
  const family = owner?.family_id ? await entities.Family.get(owner.family_id).catch(() => null) : null;
  const currency = createCurrencyTools(owner);

  const mine = (arr) => arr.filter(x => x.created_by_id === ownerId || x.user_id === ownerId);
  const scopeMode = owner?.scope_mode || owner?.data?.scope_mode || 'all';
  const inScope = (record) => scopeMode === 'all' || (record.scope || 'personal') === scopeMode;
  const accounts = mine(allAccounts).filter(inScope);
  const accountIds = new Set(accounts.map(a => a.id));
  const transactions = mine(allTransactions).filter(t => accountIds.has(t.account_id));
  const budgets = mine(allBudgets).filter(b => b.is_active && inScope(b));
  const goals = mine(allGoals).filter(g => g.status === 'active' && inScope(g));
  const investments = mine(allInvestments).filter(inScope);
  const accountTotals = currency.summarize(accounts.map(a => ({ amount: a.balance, currency: a.currency })));

  const now = new Date();
  const { year, month, day } = tzDateParts(now, timezone);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isInvestmentExpense = (t) => t.category === 'Инвестиции' || t.category === 'Investments';
  const monthTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
  const sumByType = (list, type) => currency.summarize(list.filter(t => t.type === type && (type !== 'expense' || !isInvestmentExpense(t))).map(t => ({ amount: t.amount, currency: t.currency }))).total;
  const monthIncome = sumByType(monthTransactions, 'income');
  const monthExpenses = sumByType(monthTransactions, 'expense');

  const todayTransactions = transactions.filter(t => (t.date || '').slice(0, 10) === todayStr);
  const todayIncome = sumByType(todayTransactions, 'income');
  const todayExpenses = sumByType(todayTransactions, 'expense');

  const expensesByCategory = monthTransactions
    .filter(t => t.type === 'expense' && !isInvestmentExpense(t))
    .reduce((acc, t) => {
      const converted = currency.convert(t.amount, t.currency || currency.profileCurrency);
      if (converted != null) acc[t.category || 'Другое'] = (acc[t.category || 'Другое'] || 0) + converted;
      return acc;
    }, {});

  const investmentRows = investments.map(inv => {
    const price = Number(inv.current_price || inv.purchase_price) || 0;
    return { amount: inv.type === 'deposit' ? price : (Number(inv.quantity) || 0) * price, currency: inv.currency || currency.profileCurrency };
  });
  const investmentTotals = currency.summarize(investmentRows);

  // Расходы по каждому члену семьи за текущий месяц, отсортированные по сумме —
  // чтобы ассистент мог рассказать, кто и куда тратит деньги в семье.
  let familySection = '';
  if (family?.members?.length > 0) {
    const scopedFamilyAccountIds = new Set(allAccounts
      .filter(a => scopeMode === 'all' || (a.scope || 'personal') === scopeMode)
      .map(a => a.id));
    const familyMonthExpenses = allTransactions.filter(t =>
      t.type === 'expense' && !isInvestmentExpense(t) && new Date(t.date) >= monthStart &&
      scopedFamilyAccountIds.has(t.account_id) &&
      family.members.some(m => t.user_id === m.user_id || t.created_by_id === m.user_id)
    );
    const byMember = family.members.map(m => {
      const memberTx = familyMonthExpenses.filter(t => t.user_id === m.user_id || t.created_by_id === m.user_id);
      const total = currency.summarize(memberTx.map(t => ({ amount: t.amount, currency: t.currency }))).total;
      return { name: m.display_name || m.name, total };
    }).sort((a, b) => b.total - a.total);

    familySection = `
РАСХОДЫ ЧЛЕНОВ СЕМЬИ ЗА МЕСЯЦ (${family.name}) в ${currency.profileCurrency}:
${byMember.map(b => `- ${b.name}: ${currency.format(b.total)}`).join('\n')}
`;
  }

  return `
Финансовые данные пользователя:

ОСТАТОК ДЕНЕГ (текущий баланс на счетах прямо сейчас — используй ЭТО значение, если спрашивают "сколько денег", "какой остаток", "баланс"):
${accounts.map(a => `- ${a.name}: ${currency.format(a.balance, a.currency || currency.profileCurrency)}`).join('\n') || '- Нет счетов'}
Разбивка по валютам:
${accountTotals.lines.join('\n') || '- Нет счетов'}
- ИТОГО остаток по всем счетам: ${currency.format(accountTotals.total)}${accountTotals.missing.length ? ` (не включены без курса: ${accountTotals.missing.join(', ')})` : ''}

СЕГОДНЯ (${todayStr}) в ${currency.profileCurrency}:
- Доход: ${currency.format(todayIncome)}
- Расходы: ${currency.format(todayExpenses)}

ДОХОДЫ И РАСХОДЫ (текущий месяц, НЕ путать с остатком денег) в ${currency.profileCurrency}:
- Общий доход: ${currency.format(monthIncome)}
- Общие расходы: ${currency.format(monthExpenses)}
- Разница доход-расход за месяц: ${currency.format(monthIncome - monthExpenses)}

РАСХОДЫ ПО КАТЕГОРИЯМ (в ${currency.profileCurrency}):
${Object.entries(expensesByCategory).map(([cat, amount]) => `- ${cat}: ${currency.format(amount)}`).join('\n') || '- Нет данных'}

БЮДЖЕТЫ:
${budgets.map(b => `- id=${b.id} | ${b.name}: потрачено ${currency.format(b.spent_amount, b.currency || currency.profileCurrency)} из ${currency.format(b.limit_amount, b.currency || currency.profileCurrency)}`).join('\n') || '- Нет бюджетов'}

ФИНАНСОВЫЕ ЦЕЛИ:
${goals.map(g => `- id=${g.id} | ${g.title}: накоплено ${currency.format(g.current_amount, g.currency || currency.profileCurrency)} из ${currency.format(g.target_amount, g.currency || currency.profileCurrency)}`).join('\n') || '- Нет целей'}

ИНВЕСТИЦИОННЫЙ ПОРТФЕЛЬ:
${investments.map((inv, index) => `- id=${inv.id} | ${inv.name} (${inv.type}): ${currency.format(investmentRows[index].amount, investmentRows[index].currency)}`).join('\n') || '- Нет инвестиций'}
Разбивка по валютам:
${investmentTotals.lines.join('\n') || '- Нет инвестиций'}
- Общая стоимость в ${currency.profileCurrency}: ${currency.format(investmentTotals.total)}${investmentTotals.missing.length ? ` (не включены без курса: ${investmentTotals.missing.join(', ')})` : ''}
${familySection}`;
}