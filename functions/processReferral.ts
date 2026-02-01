import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { referral_code } = await req.json();

    if (!referral_code) {
      return Response.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Ищем пользователя с таким кодом
    const referrer = await base44.asServiceRole.entities.User.filter({
      referral_code: referral_code
    });

    if (!referrer || referrer.length === 0) {
      return Response.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    const referrerId = referrer[0].id;

    // Проверяем, не привел ли уже пользователь этого человека
    if (user.referred_by) {
      return Response.json({ 
        error: 'Пользователь уже приглашен другом' 
      }, { status: 400 });
    }

    // Активируем демо режим для нового пользователя (14 дней)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    await base44.auth.updateMe({
      referred_by: referrerId,
      demo_mode_enabled: true,
      demo_mode_end_date: endDate.toISOString().split('T')[0]
    });

    // Обновляем счетчик рефералов у пригласившего
    const referrerData = referrer[0];
    await base44.asServiceRole.entities.User.update(referrerId, {
      referred_users_count: (referrerData.referred_users_count || 0) + 1
    });

    // Также активируем месяц подписки для пригласившего (можно через отдельную логику платежей)

    return Response.json({
      success: true,
      message: 'Реферальный код применен. Демо режим активирован на 14 дней',
      demo_end_date: endDate.toISOString().split('T')[0]
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});