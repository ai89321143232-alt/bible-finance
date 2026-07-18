import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем премиум статус
    if (user.subscription_tier !== 'premium' && user.subscription_tier !== 'family') {
      return Response.json({ error: 'Premium subscription required' }, { status: 403 });
    }

    const { analysisType } = await req.json();

    // Получаем необходимые данные
    const transactions = await base44.entities.Transaction.filter(
      { created_by_id: user.id },
      '-date',
      100
    );

    const budgets = await base44.entities.Budget.filter(
      { created_by_id: user.id },
      '-created_date',
      50
    );

    let prompt = '';
    let jsonSchema = {};

    if (analysisType === 'forecast') {
      // Прогноз будущих расходов
      const last12Months = transactions.filter(t => {
        const date = new Date(t.date);
        const now = new Date();
        return (now - date) / (1000 * 60 * 60 * 24) <= 365;
      });

      const categoryTotals = {};
      last12Months.forEach(t => {
        if (t.type === 'expense') {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
      });

      prompt = `Проанализируй исторические расходы пользователя за последний год по категориям: ${JSON.stringify(categoryTotals)}. 
      Предскажи основные категории расходов на следующий месяц и ожидаемые суммы.
      Учти сезонные тренды и среднемесячные значения.
      Выведи результат в JSON с категориями и предсказанными суммами.`;

      jsonSchema = {
        type: 'object',
        properties: {
          forecast: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                predicted_amount: { type: 'number' },
                confidence: { type: 'string' }
              }
            }
          },
          summary: { type: 'string' }
        }
      };
    } else if (analysisType === 'recommendations') {
      // Персонализированные советы
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      prompt = `Проанализируй финансовые данные пользователя:
      - Общий доход: ${totalIncome}
      - Общие расходы: ${totalExpenses}
      - Текущие бюджеты: ${JSON.stringify(budgets.map(b => ({ name: b.name, limit: b.limit_amount, spent: b.spent_amount })))}
      
      Дай 3-4 персонализированных совета по оптимизации бюджета и экономии средств, основываясь на его тратах.`;

      jsonSchema = {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                potential_savings: { type: 'number' }
              }
            }
          }
        }
      };
    } else if (analysisType === 'anomalies') {
      // Выявление аномалий
      const recentTransactions = transactions.slice(0, 30);
      const avgByCategory = {};

      transactions.slice(0, 100).forEach(t => {
        if (t.type === 'expense') {
          if (!avgByCategory[t.category]) {
            avgByCategory[t.category] = { total: 0, count: 0 };
          }
          avgByCategory[t.category].total += t.amount;
          avgByCategory[t.category].count += 1;
        }
      });

      Object.keys(avgByCategory).forEach(cat => {
        avgByCategory[cat].avg = avgByCategory[cat].total / avgByCategory[cat].count;
      });

      prompt = `Проанализируй эти недавние транзакции: ${JSON.stringify(recentTransactions)}
      В контексте исторических средних по категориям: ${JSON.stringify(avgByCategory)}
      
      Выяви любые аномалии или необычные траты (значительно выше среднего), объясни их и предложи рекомендации.
      Используй пороговое значение 1.5x от среднего значения как аномалию.`;

      jsonSchema = {
        type: 'object',
        properties: {
          anomalies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                transaction_id: { type: 'string' },
                category: { type: 'string' },
                amount: { type: 'number' },
                deviation: { type: 'string' },
                recommendation: { type: 'string' }
              }
            }
          },
          risk_level: { type: 'string' }
        }
      };
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: jsonSchema
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});