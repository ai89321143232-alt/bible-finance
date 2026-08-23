import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// aiFinancialPlanner — комплексный ИИ-планировщик финансов.
// analysisType:
//   cashflow            — прогноз кассового разрыва по дням
//   daily_limit         — адаптивный дневной лимит трат
//   subscriptions       — поиск подписок-двойников и переплат
//   debt_strategy       — стратегия погашения долгов (снежный ком / лавина)
//   goal_acceleration   — прогноз достижения цели с ускорением
//   pre_purchase        — проверка крупной траты перед совершением (payload: amount, category, description)
//   monthly_report      — расширенный ежемесячный ИИ-отчёт
//   balance_allocation  — баланс между долгами и накоплениями
//   spending_clusters   — сегментация расходов (импульсивные/выходные/вечерние)
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { analysisType, payload = {} } = body;
    const language = body.language || payload.language || (user.language) || 'ru';
    const langName = language === 'en' ? 'English' : 'русском';
    const langInstruction = ` Отвечай ТОЛЬКО на ${langName} языке. Все текстовые поля должны быть на ${langName} языке.`;

    // Сбор данных
    const [allTx, allBudgets, allGoals, allInvestments, allAccounts, allDebts, allRecurring] = await Promise.all([
      base44.entities.Transaction.list('-date', 500),
      base44.entities.Budget.list(),
      base44.entities.Goal.list(),
      base44.entities.Investment.list(),
      base44.entities.Account.list(),
      base44.entities.DebtAccount.list(),
      base44.entities.RecurringPayment.list()
    ]);

    const mine = (arr) => arr.filter(x => x.created_by_id === user.id || x.user_id === user.id);
    const transactions = mine(allTx);
    const budgets = mine(allBudgets).filter(b => b.is_active);
    const goals = mine(allGoals).filter(g => g.status === 'active');
    const investments = mine(allInvestments);
    const accounts = mine(allAccounts);
    const debts = mine(allDebts).filter(d => d.status === 'active');
    const recurring = mine(allRecurring).filter(r => r.is_active && !r.cancelled);

    const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const recentTx = transactions.filter(t => new Date(t.date) >= sixMonthsAgo);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTx = transactions.filter(t => new Date(t.date) >= monthStart);
    const monthExpenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;

    const expensesByCategory = recentTx.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category || 'Другое'] = (acc[t.category || 'Другое'] || 0) + t.amount;
      return acc;
    }, {});

    // Общие суммы регулярных обязательств
    const recurringMonthly = recurring.reduce((s, r) => {
      const mult = { weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }[r.period] || 1;
      return s + r.amount * mult;
    }, 0);
    const debtMonthly = debts.reduce((s, d) => s + (d.monthly_payment || 0), 0);

    let prompt = '';
    let jsonSchema = {};

    // ----------------------------------------------------------------
    if (analysisType === 'cashflow') {
      // Детерминированный прогноз на 30 дней вперёд от сегодня
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dailyIncome = monthIncome / daysInMonth;
      const recentExpensesTotal = recentTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const dailyExpense = recentExpensesTotal / 180;

      // Предстоящие списания подписок в ближайшие 30 дней
      const recurringCharges = recurring.map(r => {
        const next = r.next_charge_date ? new Date(r.next_charge_date) : null;
        return { name: r.name, amount: r.amount, next: next, period: r.period };
      }).filter(r => r.next);

      // Предстоящие платежи по долгам в ближайшие 30 дней (по payment_day)
      const debtPayments = debts.map(d => ({ name: d.name, amount: d.monthly_payment || 0, payment_day: d.payment_day }));

      const dailyTable = [];
      let runningBalance = totalBalance;
      let breakDay = null;
      let minBalance = totalBalance;

      for (let i = 0; i < 30; i++) {
        const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        const dayOfMonth = d.getDate();

        let plannedIn = dailyIncome;
        let plannedOut = dailyExpense;

        // Списания подписок, попадающие на этот день
        for (const r of recurringCharges) {
          if (r.next && r.next.toISOString().slice(0, 10) === dateStr) {
            plannedOut += r.amount;
          }
        }
        // Платежи по долгам, попадающие на этот день месяца
        for (const dp of debtPayments) {
          if (dp.payment_day === dayOfMonth) {
            plannedOut += dp.amount;
          }
        }

        runningBalance += plannedIn - plannedOut;
        if (runningBalance < minBalance) minBalance = runningBalance;
        if (breakDay === null && runningBalance < 0) breakDay = dateStr;

        dailyTable.push({
          date: dateStr,
          planned_in: Math.round(plannedIn),
          planned_out: Math.round(plannedOut),
          balance: Math.round(runningBalance)
        });
      }

      const upcomingRecurring = recurring.map(r => ({ name: r.name, amount: r.amount, next: r.next_charge_date, period: r.period }));
      const upcomingDebt = debts.map(d => ({ name: d.name, remaining: d.remaining_amount, monthly: d.monthly_payment, day: d.payment_day }));

      prompt = `Ты финансовый аналитик. Прогноз движения денежных средств на ближайшие 30 дней уже рассчитан.

Текущий баланс счетов: ${totalBalance.toLocaleString()} ₽
Дата возможного кассового разрыва: ${breakDay || 'нет (баланс не уйдёт в минус)'}
Минимальный прогнозируемый баланс: ${minBalance.toLocaleString()} ₽
Таблица движения средств (детерминированные реальные даты от пользователя — НЕ ИЗМЕНЯЙ их):
${JSON.stringify(dailyTable)}
Регулярные платежи (подписки): ${JSON.stringify(upcomingRecurring)}
Долги с ежемесячными платежами: ${JSON.stringify(upcomingDebt)}
Средние расходы по категориям за 6 мес: ${JSON.stringify(expensesByCategory)}
Доход за текущий месяц: ${monthIncome.toLocaleString()} ₽
Расход за текущий месяц: ${monthExpenses.toLocaleString()} ₽

Определи:
1. Какие 3-5 расходов можно отложить/оптимизировать в критический период (до кассового разрыва).
2. Краткое резюме ситуации.
Ответ строго в JSON по схеме. Поля break_day, min_balance, daily_table уже посчитаны — верни их дословно из данных выше, НЕ выдумывай свои даты.`;
      jsonSchema = {
        type: 'object',
        properties: {
          break_day: { type: 'string', description: 'Дата возможного кассового разрыва или null (детерминированная реальная дата — не изменяй)' },
          min_balance: { type: 'number', description: 'Минимальный прогнозируемый баланс (детерминированное значение — не изменяй)' },
          daily_table: { type: 'array', description: 'Детерминированные реальные даты от пользователя — не изменяй', items: { type: 'object', properties: { date: { type: 'string' }, planned_in: { type: 'number' }, planned_out: { type: 'number' }, balance: { type: 'number' } } } },
          suggestions: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, savings: { type: 'number' } } } },
          summary: { type: 'string' }
        }
      };

      const _cfResult = await base44.integrations.Core.InvokeLLM({
        prompt: prompt + langInstruction,
        add_context_from_internet: false,
        response_json_schema: jsonSchema
      });
      // Инъектируем детерминированные значения — не доверяем LLM переписывать даты
      if (_cfResult && typeof _cfResult === 'object') {
        _cfResult.break_day = breakDay;
        _cfResult.min_balance = minBalance;
        _cfResult.daily_table = dailyTable;
      }
      return Response.json(_cfResult);
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'daily_limit') {
      const todayStr = now.toISOString().slice(0, 10);
      const todayExpenses = transactions.filter(t => t.type === 'expense' && (t.date || '').slice(0, 10) === todayStr).reduce((s, t) => s + t.amount, 0);
      const avgDailyExpense = recentTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / 180;
      prompt = `Ты финансовый советник. Рассчитай адаптивный дневной лимит трат на сегодня.

Текущий баланс: ${totalBalance.toLocaleString()} ₽
Осталось дней до конца месяца: ${daysLeftInMonth}
Доход за месяц: ${monthIncome.toLocaleString()} ₽
Уже потрачено в этом месяце: ${monthExpenses.toLocaleString()} ₽
Потрачено сегодня: ${todayExpenses.toLocaleString()} ₽
Средний дневной расход за 6 мес: ${Math.round(avgDailyExpense).toLocaleString()} ₽
Обязательные ежемесячные платежи (подписки+долги): ${(recurringMonthly + debtMonthly).toLocaleString()} ₽

Рассчитай: сколько можно потратить СЕГОДНЯ, чтобы к концу месяца осталось хотя бы 0 ₽ с учётом обязательных платежей. Дай 2 совета, как не превысить лимит.
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          daily_limit: { type: 'number' },
          already_spent_today: { type: 'number' },
          remaining_today: { type: 'number' },
          projection_end_of_month: { type: 'number' },
          tips: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' }
        }
      };
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'subscriptions') {
      const recurringList = recurring.map(r => ({ name: r.name, amount: r.amount, period: r.period, next: r.next_charge_date, category: r.category }));
      // Поиск похожих по описанию транзакций (потенциальные дубликаты подписок)
      const expenseTx = recentTx.filter(t => t.type === 'expense' && t.is_recurring).map(t => ({ desc: t.description, amount: t.amount, category: t.category, date: t.date }));
      prompt = `Ты финансовый аналитик. Найди подписки-двойники, забытые и неиспользуемые подписки, а также переплаты.

Активные подписки пользователя: ${JSON.stringify(recurringList)}
Повторяющиеся транзакции за 6 мес: ${JSON.stringify(expenseTx)}

Выяви:
1. Дубликаты подписок (одна и та же услуга у разных провайдеров или дважды).
2. Подписки, которыми пользователь вероятно не пользуется (нет связанных транзакций).
3. Где можно сэкономить (сменить тариф, отменить).
Оцени потенциальную ежемесячную экономию.
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          duplicates: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' }, monthly_savings: { type: 'number' } } } },
          unused: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' }, monthly_savings: { type: 'number' } } } },
          optimize: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, suggestion: { type: 'string' }, monthly_savings: { type: 'number' } } } },
          total_monthly_savings: { type: 'number' },
          summary: { type: 'string' }
        }
      };
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'debt_strategy') {
      const debtList = debts.map(d => ({ name: d.name, type: d.type, remaining: d.remaining_amount, rate: d.interest_rate, monthly: d.monthly_payment, creditor: d.creditor }));
      const availableForDebt = Math.max(0, monthIncome - monthExpenses - recurringMonthly);
      prompt = `Ты финансовый аналитик по долгам. Построй стратегию погашения.

Долги пользователя: ${JSON.stringify(debtList)}
Свободно для досрочного погашения в месяц: ${availableForDebt.toLocaleString()} ₽

Сравни стратегии "снежного кома" (от меньшего остатка) и "лавины" (от большей ставки).
Для каждой рассчитай:
- Порядок погашения.
- Примерную дату освобождения от каждого долга.
- Общую экономию на процентах по сравнению с минимальными платежами.
Дай итоговую рекомендацию.
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          snowball: { type: 'object', properties: { order: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, payoff_date: { type: 'string' } } } }, total_interest: { type: 'number' } } },
          avalanche: { type: 'object', properties: { order: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, payoff_date: { type: 'string' } } } }, total_interest: { type: 'number' } } },
          recommended: { type: 'string', enum: ['snowball', 'avalanche'] },
          savings_vs_minimal: { type: 'number' },
          summary: { type: 'string' }
        }
      };
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'goal_acceleration') {
      const goalId = payload.goal_id;
      const goal = goals.find(g => g.id === goalId) || goals[0];
      if (!goal) return Response.json({ error: 'Нет активных целей' }, { status: 400 });
      const monthsElapsed = goal.created_date ? Math.max(1, (now - new Date(goal.created_date)) / (30 * 24 * 60 * 60 * 1000)) : 1;
      const avgMonthlyContribution = (goal.current_amount || 0) / monthsElapsed;
      prompt = `Ты финансовый планировщик. Сделай прогноз достижения цели.

Цель: ${goal.title}
Целевая сумма: ${goal.target_amount.toLocaleString()} ₽
Накоплено: ${(goal.current_amount || 0).toLocaleString()} ₽
Дедлайн: ${goal.deadline || 'не задан'}
Средняя скорость накопления: ${Math.round(avgMonthlyContribution).toLocaleString()} ₽/мес
Свободный остаток в месяц: ${Math.max(0, monthIncome - monthExpenses - recurringMonthly).toLocaleString()} ₽

Рассчитай:
1. Дату достижения при текущей скорости.
2. Сколько нужно добавлять в месяц, чтобы достичь цели к дедлайну.
3. На сколько месяцев раньше можно достичь цели, если добавить +2000 ₽/мес.
4. Рекомендацию по auto_contribute.
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          current_pace_date: { type: 'string' },
          required_monthly: { type: 'number' },
          accelerated_date: { type: 'string' },
          recommended_contribution: { type: 'number' },
          months_saved: { type: 'number' },
          summary: { type: 'string' }
        }
      };
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'pre_purchase') {
      const amount = Number(payload.amount) || 0;
      const category = payload.category || 'Другое';
      const description = payload.description || '';
      const similarTx = recentTx.filter(t => t.type === 'expense' && t.category === category).slice(0, 10);
      prompt = `Ты финансовый советник. Пользователь планирует крупную трату. Оцени её безопасность.

Планируемая трата: ${amount.toLocaleString()} ₽, категория: ${category}, описание: ${description}
Текущий баланс: ${totalBalance.toLocaleString()} ₽
Расход за месяц: ${monthExpenses.toLocaleString()} ₽
Доход за месяц: ${monthIncome.toLocaleString()} ₽
Бюджеты по этой категории: ${JSON.stringify(budgets.filter(b => (b.categories || []).includes(category)).map(b => ({ name: b.name, limit: b.limit_amount, spent: b.spent_amount })))}
Похожие траты за 6 мес: ${JSON.stringify(similarTx.map(t => ({ amount: t.amount, date: t.date })))}

Оцени:
1. Поместится ли трата в бюджет текущего месяца.
2. Не нарушит ли она финансовую цель или долг.
3. Был ли похожий необязательный расход в последнее время.
4. Рекомендация: одобрить / отложить / отказаться.
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['approve', 'postpone', 'decline'] },
          fits_budget: { type: 'boolean' },
          budget_impact: { type: 'string' },
          goal_impact: { type: 'string' },
          similar_recent: { type: 'string' },
          recommendation: { type: 'string' },
          summary: { type: 'string' }
        }
      };
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'monthly_report') {
      // Текущий (идущий) месяц — с 1-го числа по сегодня
      const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const curEnd = now;
      const curTx = transactions.filter(t => { const d = new Date(t.date); return d >= curStart && d <= curEnd; });
      const curIncome = curTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const curExpenses = curTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const curBalance = curIncome - curExpenses;
      const curByCategory = curTx.filter(t => t.type === 'expense').reduce((acc, t) => { const c = t.category || 'Другое'; acc[c] = (acc[c] || 0) + t.amount; return acc; }, {});
      const curIncomeByCategory = curTx.filter(t => t.type === 'income').reduce((acc, t) => { const c = t.category || 'Другое'; acc[c] = (acc[c] || 0) + t.amount; return acc; }, {});

      // Прошлый месяц — для сравнения (рост/снижение категорий)
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const prevTx = transactions.filter(t => { const d = new Date(t.date); return d >= prevStart && d <= prevEnd; });
      const prevIncome = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const prevExpenses = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const prevByCategory = prevTx.filter(t => t.type === 'expense').reduce((acc, t) => { const c = t.category || 'Другое'; acc[c] = (acc[c] || 0) + t.amount; return acc; }, {});

      // Реальная дельта по категориям (только если есть данные за прошлый месяц)
      const hasPrev = prevTx.length > 0;
      const growth = [];
      const decline = [];
      if (hasPrev) {
        const allCats = Array.from(new Set([...Object.keys(curByCategory), ...Object.keys(prevByCategory)]));
        for (const cat of allCats) {
          const cur = curByCategory[cat] || 0;
          const prev = prevByCategory[cat] || 0;
          if (cur === 0 && prev === 0) continue;
          if (prev === 0) { growth.push({ category: cat, amount: cur, change_percent: 100 }); continue; }
          if (cur === 0) { decline.push({ category: cat, amount: 0, change_percent: -100 }); continue; }
          const pct = Math.round(((cur - prev) / prev) * 100);
          if (pct > 0) growth.push({ category: cat, amount: cur, change_percent: pct });
          else if (pct < 0) decline.push({ category: cat, amount: cur, change_percent: pct });
        }
        growth.sort((a, b) => b.change_percent - a.change_percent);
        decline.sort((a, b) => a.change_percent - b.change_percent);
      }

      prompt = `Ты финансовый аналитик. Составь расширенный ежемесячный отчёт по ТЕКУЩЕМУ (идущему) месяцу.

Период: ${curStart.toLocaleDateString('ru-RU')} — ${curEnd.toLocaleDateString('ru-RU')}
Реальный доход: ${curIncome.toLocaleString()} ₽
Реальный расход: ${curExpenses.toLocaleString()} ₽
Реальный остаток: ${curBalance.toLocaleString()} ₽
Кол-во транзакций: ${curTx.length}
Расходы по категориям (текущий месяц): ${JSON.stringify(curByCategory)}
Доходы по категориям (текущий месяц): ${JSON.stringify(curIncomeByCategory)}
Прошлый месяц: доход ${prevIncome.toLocaleString()} ₽, расход ${prevExpenses.toLocaleString()} ₽
Расходы по категориям (прошлый месяц): ${JSON.stringify(prevByCategory)}
Уже посчитанный рост категорий: ${JSON.stringify(growth.slice(0, 3))}
Уже посчитанное снижение категорий: ${JSON.stringify(decline.slice(0, 3))}
Текущие бюджеты: ${JSON.stringify(budgets.map(b => ({ name: b.name, limit: b.limit_amount, spent: b.spent_amount })))}
Цели: ${JSON.stringify(goals.map(g => ({ title: g.title, target: g.target_amount, current: g.current_amount })))}
Долги: ${JSON.stringify(debts.map(d => ({ name: d.name, remaining: d.remaining_amount })))}

КРИТИЧЕСКИ ВАЖНО:
- Используй ТОЛЬКО приведённые выше реальные числа. НЕ ВЫДУМЫВАЙ категории, суммы или проценты.
- Сводку (summary) бери дословно из реальных значений выше.
- top_growth и top_decline бери ИЗ предоставленного «уже посчитанного» списка. Если он пуст — верни пустой массив.
- Если по категории нет данных — не упоминай её.
- Рекомендации делай только на основе реальных категорий и сумм из текущего месяца.

Структура отчёта:
1. Сводка (доход/расход/остаток + изменение к прошлому месяцу в %).
2. Топ-3 категории роста и снижения (из посчитанных списков).
3. Топ-3 рекомендации по улучшению.
4. Прогноз на следующий месяц.
5. Личные/семейные рекорды.
6. Библейская мудрость о финансах (одна фраза с цитатой).
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          summary: { type: 'object', properties: { income: { type: 'number' }, expenses: { type: 'number' }, balance: { type: 'number' }, income_change: { type: 'number' }, expense_change: { type: 'number' } } },
          top_growth: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, amount: { type: 'number' }, change_percent: { type: 'number' } } } },
          top_decline: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, amount: { type: 'number' }, change_percent: { type: 'number' } } } },
          recommendations: { type: 'array', items: { type: 'string' } },
          next_month_forecast: { type: 'string' },
          records: { type: 'array', items: { type: 'string' } },
          bible_wisdom: { type: 'string' }
        }
      };

      const _result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt + langInstruction,
        add_context_from_internet: false,
        response_json_schema: jsonSchema
      });
      // Переопределяем сводку и рост/снижение реальными значениями — не доверяем LLM
      if (_result && typeof _result === 'object') {
        const incomeChange = prevIncome > 0 ? Math.round(((curIncome - prevIncome) / prevIncome) * 100) : (curIncome > 0 ? 100 : 0);
        const expenseChange = prevExpenses > 0 ? Math.round(((curExpenses - prevExpenses) / prevExpenses) * 100) : (curExpenses > 0 ? 100 : 0);
        _result.summary = { income: curIncome, expenses: curExpenses, balance: curBalance, income_change: incomeChange, expense_change: expenseChange };
        _result.top_growth = growth.slice(0, 3);
        _result.top_decline = decline.slice(0, 3);
      }
      return Response.json(_result);
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'balance_allocation') {
      const debtList = debts.map(d => ({ name: d.name, remaining: d.remaining_amount, rate: d.interest_rate, monthly: d.monthly_payment }));
      const emergencyGoal = goals.find(g => g.type === 'emergency_fund');
      prompt = `Ты финансовый планировщик. Распредели свободные средства между погашением долгов и накоплениями.

Свободный остаток в месяц: ${Math.max(0, monthIncome - monthExpenses - recurringMonthly).toLocaleString()} ₽
Долги: ${JSON.stringify(debtList)}
Активные цели: ${JSON.stringify(goals.map(g => ({ title: g.title, target: g.target_amount, current: g.current_amount, type: g.type })))}
Подушка безопасности (emergency_fund): ${emergencyGoal ? `${emergencyGoal.current_amount}/${emergencyGoal.target_amount}` : 'не задана'}

Определи:
1. Какую долю направить на долги, какую — на накопления.
2. Очередность: сначала микрозаймы (высокая ставка) или сначала подушка безопасности?
3. Точные суммы в рублях на каждый долг и каждую цель.
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          debt_allocation: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, amount: { type: 'number' }, reason: { type: 'string' } } } },
          savings_allocation: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, amount: { type: 'number' } } } },
          priority: { type: 'string', enum: ['debt_first', 'savings_first', 'balanced'] },
          rationale: { type: 'string' },
          summary: { type: 'string' }
        }
      };
    }

    // ----------------------------------------------------------------
    else if (analysisType === 'spending_clusters') {
      const expenseTx = recentTx.filter(t => t.type === 'expense').map(t => ({
        amount: t.amount, category: t.category, date: t.date, day: new Date(t.date).getDay(), hour: new Date(t.date).getHours()
      }));
      prompt = `Ты финансовый аналитик поведенческих паттернов. Выяви сегменты трат.

Транзакции за 6 мес (с днём недели и часом): ${JSON.stringify(expenseTx.slice(0, 200))}

Выяви кластеры:
1. Импульсивные вечерние траты.
2. Траты по выходным.
3. Регулярные обязательные.
4. Сезонные.
Для каждого кластера укажи долю от общих расходов, топ-категории и совет по снижению.
Ответ строго в JSON.`;
      jsonSchema = {
        type: 'object',
        properties: {
          clusters: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, share_percent: { type: 'number' }, top_categories: { type: 'array', items: { type: 'string' } }, advice: { type: 'string' } } } },
          summary: { type: 'string' }
        }
      };
    }

    // ----------------------------------------------------------------
    else {
      return Response.json({ error: 'Unknown analysisType: ' + analysisType }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt + langInstruction,
      add_context_from_internet: false,
      response_json_schema: jsonSchema
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});