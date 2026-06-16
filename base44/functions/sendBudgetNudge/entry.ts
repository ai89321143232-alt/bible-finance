import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const budgets = await base44.asServiceRole.entities.Budget.filter({ is_active: true });
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth; // 0..1

    const warnings = [];

    for (const budget of budgets) {
      const limit = budget.limit_amount || 0;
      const spent = budget.spent_amount || 0;
      if (limit === 0) continue;

      const spentPercent = spent / limit;
      const expectedPercent = monthProgress;

      // Если потрачено значительно больше ожидаемой пропорции
      if (spentPercent > expectedPercent * 1.3 && spentPercent > 0.3) {
        const categories = budget.categories?.join(', ') || budget.category || budget.name;
        const overshoot = Math.round((spentPercent - expectedPercent) * 100);
        warnings.push(
          `• "${categories}": потрачено ${Math.round(spentPercent * 100)}% бюджета при ${Math.round(expectedPercent * 100)}% месяца (опережение на ${overshoot}%)`
        );
      }
    }

    if (warnings.length === 0) {
      return Response.json({ notified: false, reason: 'no warnings' });
    }

    const body = `Привет, ${user.full_name || 'друг'}!

Заметил, что по некоторым категориям расходы идут быстрее обычного:

${warnings.join('\n')}

Возможно, стоит притормозить до конца месяца. Держи ситуацию под контролем!

— Библия Финансов`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: '⚠️ Бюджет под давлением — проверь расходы',
      body
    });

    return Response.json({ notified: true, warnings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});