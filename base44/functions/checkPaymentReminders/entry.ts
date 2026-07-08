import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// checkPaymentReminders — проверяет задачи и цели, по которым пора напомнить
// об оплате, и отправляет email-уведомления пользователям.
// Запускается ежедневной автоматизацией (scheduled). Работает под service role,
// т.к. вызывается планировщиком без пользовательского токена.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // ближайшие 24 часа

    const results = { tasksNotified: 0, goalsNotified: 0, errors: [] as string[] };

    // Кэш email по user id, чтобы не дёргать одного пользователя многократно
    const userCache = new Map<string, { email: string; name: string } | null>();
    const getUser = async (userId: string) => {
      if (!userId) return null;
      if (userCache.has(userId)) return userCache.get(userId);
      let info: { email: string; name: string } | null = null;
      try {
        const u = await base44.asServiceRole.entities.User.filter({ id: userId });
        if (u && u[0]?.email) info = { email: u[0].email, name: u[0].full_name || 'пользователь' };
      } catch (_e) {
        info = null;
      }
      userCache.set(userId, info);
      return info;
    };

    const fmtAmount = (amount) =>
      amount ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount) : null;

    // ---- ЗАДАЧИ ----
    // Кандидаты: напоминания включены, ещё не отправлено, статус не completed
    const tasks = await base44.asServiceRole.entities.Task.filter({
      reminder_enabled: true,
      notification_sent: false,
    });

    for (const task of tasks) {
      if (task.status === 'completed') continue;
      // Дата, к которой привязано напоминание: reminder_date или due_date
      const targetStr = task.reminder_date || task.due_date;
      if (!targetStr) continue;
      const target = new Date(targetStr);
      // Напоминаем, если дата уже наступила или наступит в ближайшие 24ч
      if (target > soon) continue;

      const user = await getUser(task.created_by_id);
      if (!user) continue;

      try {
        const amountLine = fmtAmount(task.amount);
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `Напоминание об оплате: ${task.title}`,
          body:
            `Здравствуйте, ${user.name}!\n\n` +
            `Напоминаем о необходимости внести оплату по задаче:\n` +
            `«${task.title}»\n` +
            (amountLine ? `Сумма: ${amountLine}\n` : '') +
            `Срок: ${new Date(targetStr).toLocaleDateString('ru-RU')}\n\n` +
            (task.description ? `${task.description}\n\n` : '') +
            `— Библия Финансов`,
        });
        await base44.asServiceRole.entities.Task.update(task.id, { notification_sent: true });
        results.tasksNotified++;
      } catch (e) {
        results.errors.push(`task ${task.id}: ${e.message}`);
      }
    }

    // ---- ЦЕЛИ ---- (напоминание о приближении дедлайна)
    const goals = await base44.asServiceRole.entities.Goal.filter({
      status: 'active',
      notification_sent: false,
    });

    for (const goal of goals) {
      if (!goal.deadline) continue;
      const target = new Date(goal.deadline);
      if (target > soon) continue;

      const user = await getUser(goal.created_by_id);
      if (!user) continue;

      try {
        const remaining = fmtAmount((goal.target_amount || 0) - (goal.current_amount || 0));
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `Приближается срок цели: ${goal.title}`,
          body:
            `Здравствуйте, ${user.name}!\n\n` +
            `Приближается дедлайн вашей финансовой цели:\n` +
            `«${goal.title}»\n` +
            (remaining ? `Осталось накопить: ${remaining}\n` : '') +
            `Срок: ${target.toLocaleDateString('ru-RU')}\n\n` +
            `— Библия Финансов`,
        });
        await base44.asServiceRole.entities.Goal.update(goal.id, { notification_sent: true });
        results.goalsNotified++;
      } catch (e) {
        results.errors.push(`goal ${goal.id}: ${e.message}`);
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});