import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code || !code.trim()) {
      return Response.json({ error: 'Введите промокод' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const matches = await base44.asServiceRole.entities.PromoCode.filter({ code: normalizedCode });
    const promo = matches[0];

    if (!promo || !promo.is_active) {
      return Response.json({ error: 'Промокод не найден или недействителен' }, { status: 404 });
    }
    if ((promo.used_count || 0) >= (promo.max_uses || 1)) {
      return Response.json({ error: 'Промокод уже был использован максимальное количество раз' }, { status: 400 });
    }

    const durationDays = promo.duration_days || 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    const endDateStr = endDate.toISOString().slice(0, 10);

    await base44.auth.updateMe({
      subscription: promo.plan,
      subscription_plan: promo.plan,
      subscription_end_date: endDateStr,
      is_trial_active: false
    });

    await base44.asServiceRole.entities.PromoCode.update(promo.id, {
      used_count: (promo.used_count || 0) + 1
    });

    return Response.json({ success: true, plan: promo.plan, subscription_end_date: endDateStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});