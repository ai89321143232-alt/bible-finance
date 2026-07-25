// Полный сброс личных финансовых данных пользователя ("начать с чистого листа").
// Удаляет ТОЛЬКО записи, созданные текущим пользователем (created_by_id),
// не затрагивая данные других членов семьи, саму семью или рабочие пространства.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ENTITIES_TO_RESET = [
  'Transaction',
  'Account',
  'Budget',
  'Goal',
  'Investment',
  'ChildExpense',
  'Note',
  'TransactionTemplate',
  'FixedAsset',
  'Task',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results = {};
    for (const entityName of ENTITIES_TO_RESET) {
      const res = await base44.asServiceRole.entities[entityName].deleteMany({ created_by_id: user.id });
      results[entityName] = res;
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});