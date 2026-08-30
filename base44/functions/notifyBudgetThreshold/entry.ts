import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendPushToUser } from '../../shared/webPush.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    // Не доверяем полям из тела запроса (user_id/name/categories/id и т.д.) —
    // внешний злоумышленник мог бы подделать их, отправив POST на публичный URL.
    // Определяем бюджет по event.entity_id и берём ВСЕ поля из реальной записи БД.
    const entityId = event?.entity_id || data?.id;
    if (!entityId) {
      return Response.json({ message: 'No entity_id, skipping' });
    }

    const budget = await base44.asServiceRole.entities.Budget.get(entityId).catch(() => null);
    if (!budget) {
      return Response.json({ message: 'Budget not found, skipping' });
    }

    if (!budget.is_active) {
      return Response.json({ message: 'Budget inactive, skipping' });
    }

    const limit = budget.limit_amount || 0;
    const spent = budget.spent_amount || 0;
    if (limit === 0) {
      return Response.json({ message: 'No limit, skipping' });
    }

    const threshold = budget.notify_at_percent ?? 80;
    const pct = (spent / limit) * 100;

    // Ниже порога — сбрасываем флаг, чтобы уведомление пришло снова при следующем достижении порога
    if (pct < threshold) {
      if (budget.notification_sent) {
        await base44.asServiceRole.entities.Budget.update(budget.id, { notification_sent: false });
      }
      return Response.json({ message: 'Below threshold' });
    }

    // Уже уведомляли в этом периоде
    if (budget.notification_sent) {
      return Response.json({ message: 'Already notified' });
    }

    const ownerId = budget.user_id || budget.created_by_id;
    const owner = await base44.asServiceRole.entities.User.get(ownerId).catch(() => null);
    if (!owner?.email) {
      return Response.json({ message: 'No owner email found' });
    }

    const categories = budget.categories?.join(', ') || budget.category || budget.name;
    const body = `Привет, ${owner.full_name || 'друг'}!

Ты потратил ${Math.round(pct)}% бюджета по категории "${categories}" (${spent.toLocaleString('ru-RU')} из ${limit.toLocaleString('ru-RU')} ${budget.currency || 'RUB'}).

Стоит притормозить до конца периода, чтобы не выйти за лимит!

— Библия Финансов`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner.email,
      subject: `⚠️ Бюджет "${budget.name}" — использовано ${Math.round(pct)}%`,
      body
    });

    // Push-уведомление: Web Push (PWA — Safari/Chrome) + нативный push (APK)
    await sendPushToUser(base44, ownerId, {
      title: `⚠️ Бюджет "${budget.name}"`,
      body: `Использовано ${Math.round(pct)}% по категории "${categories}" (${spent.toLocaleString('ru-RU')} из ${limit.toLocaleString('ru-RU')} ${budget.currency || 'RUB'})`,
      tag: `budget-${budget.id}`,
      data: { url: '/Budgets' }
    });

    await base44.asServiceRole.entities.Budget.update(budget.id, { notification_sent: true });

    return Response.json({ notified: true, pct });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});