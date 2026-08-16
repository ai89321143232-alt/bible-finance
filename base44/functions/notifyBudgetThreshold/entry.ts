import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendPushToUser } from '../../shared/webPush.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data } = payload;

    if (!data || !data.is_active) {
      return Response.json({ message: 'Budget inactive, skipping' });
    }

    const limit = data.limit_amount || 0;
    const spent = data.spent_amount || 0;
    if (limit === 0) {
      return Response.json({ message: 'No limit, skipping' });
    }

    const threshold = data.notify_at_percent ?? 80;
    const pct = (spent / limit) * 100;

    // Ниже порога — сбрасываем флаг, чтобы уведомление пришло снова при следующем достижении порога
    if (pct < threshold) {
      if (data.notification_sent) {
        await base44.asServiceRole.entities.Budget.update(data.id, { notification_sent: false });
      }
      return Response.json({ message: 'Below threshold' });
    }

    // Уже уведомляли в этом периоде
    if (data.notification_sent) {
      return Response.json({ message: 'Already notified' });
    }

    const ownerId = data.user_id || data.created_by_id;
    const owner = await base44.asServiceRole.entities.User.get(ownerId);
    if (!owner?.email) {
      return Response.json({ message: 'No owner email found' });
    }

    const categories = data.categories?.join(', ') || data.category || data.name;
    const body = `Привет, ${owner.full_name || 'друг'}!

Ты потратил ${Math.round(pct)}% бюджета по категории "${categories}" (${spent.toLocaleString('ru-RU')} из ${limit.toLocaleString('ru-RU')} ${data.currency || 'RUB'}).

Стоит притормозить до конца периода, чтобы не выйти за лимит!

— Библия Финансов`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner.email,
      subject: `⚠️ Бюджет "${data.name}" — использовано ${Math.round(pct)}%`,
      body
    });

    // Push-уведомление: Web Push (PWA — Safari/Chrome) + нативный push (APK)
    await sendPushToUser(base44, ownerId, {
      title: `⚠️ Бюджет "${data.name}"`,
      body: `Использовано ${Math.round(pct)}% по категории "${categories}" (${spent.toLocaleString('ru-RU')} из ${limit.toLocaleString('ru-RU')} ${data.currency || 'RUB'})`,
      tag: `budget-${data.id}`,
      data: { url: '/Budgets' }
    });

    await base44.asServiceRole.entities.Budget.update(data.id, { notification_sent: true });

    return Response.json({ notified: true, pct });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});