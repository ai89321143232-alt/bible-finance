import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем, есть ли уже демо режим
    if (user.demo_mode_enabled) {
      return Response.json({ 
        error: 'Демо режим уже активирован',
        demo_end_date: user.demo_mode_end_date
      }, { status: 400 });
    }

    // Устанавливаем демо режим на 14 дней
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    await base44.auth.updateMe({
      demo_mode_enabled: true,
      demo_mode_end_date: endDate.toISOString().split('T')[0]
    });

    return Response.json({
      success: true,
      message: 'Демо режим активирован на 14 дней',
      demo_end_date: endDate.toISOString().split('T')[0]
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});