import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const existing = await base44.entities.TelegramBotConfig.list();
    const config = existing[0] || null;

    if (body.action === 'disconnect') {
      if (config) {
        try {
          await fetch(`https://api.telegram.org/bot${config.bot_token}/deleteWebhook`);
        } catch (e) {
          // ignore — we still want to remove local config
        }
        await base44.entities.TelegramBotConfig.delete(config.id);
      }
      return Response.json({ success: true });
    }

    const { bot_token, telegram_user_id, default_account_id } = body;
    if (!bot_token || !telegram_user_id) {
      return Response.json({ error: 'Укажите токен бота и ваш Telegram ID' }, { status: 400 });
    }

    const meRes = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return Response.json({ error: 'Неверный токен бота. Проверьте токен, полученный от @BotFather' }, { status: 400 });
    }

    const payload = {
      bot_token,
      bot_username: meData.result.username,
      telegram_user_id: String(telegram_user_id),
      default_account_id: default_account_id || undefined,
      is_active: true,
      last_error: null
    };

    const saved = config
      ? await base44.entities.TelegramBotConfig.update(config.id, payload)
      : await base44.entities.TelegramBotConfig.create(payload);

    const configId = saved.id || config?.id;
    // req.url origin points at the internal dispatcher (used for authenticated SDK calls)
    // and is NOT reachable by Telegram — it returns 401 for external callers.
    // Use the public app URL sent by the frontend (window.location.origin) instead.
    const origin = body.app_url || new URL(req.url).origin;
    const webhookUrl = `${origin}/functions/telegramWebhook?configId=${configId}`;

    const setRes = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    const setData = await setRes.json();

    if (!setData.ok) {
      await base44.entities.TelegramBotConfig.update(configId, {
        last_error: setData.description || 'Не удалось установить webhook'
      });
      return Response.json({ error: setData.description || 'Не удалось подключить бота' }, { status: 400 });
    }

    return Response.json({ success: true, bot_username: meData.result.username });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});