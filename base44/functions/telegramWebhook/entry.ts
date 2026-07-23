import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const EXPENSE_CATEGORIES = 'Еда и рестораны, Транспорт, Здоровье, Развлечения, Одежда, ЖКХ, Связь, Образование, Зарплата, Другое';

async function sendMessage(botToken, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) {
    // best-effort — webhook must still respond ok to Telegram
  }
}

async function downloadTelegramFile(botToken, fileId) {
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const infoData = await infoRes.json();
  if (!infoData.ok) return null;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${infoData.result.file_path}`);
  return await fileRes.arrayBuffer();
}

async function finalizeTransaction({ base44, parsed, account, ownerId, botToken, chatId }) {
  let txDate = new Date();
  if (parsed.date) {
    const d = new Date(parsed.date);
    if (!isNaN(d.getTime())) txDate = d;
  }

  await base44.asServiceRole.entities.Transaction.create({
    type: parsed.type,
    amount: parsed.amount,
    currency: account.currency || 'RUB',
    category: parsed.category || 'Другое',
    description: parsed.description || 'Операция из Telegram',
    date: txDate.toISOString(),
    account_id: account.id,
    user_id: ownerId,
    source: 'telegram_bot'
  });

  const newBalance = parsed.type === 'expense'
    ? (account.balance || 0) - parsed.amount
    : (account.balance || 0) + parsed.amount;
  await base44.asServiceRole.entities.Account.update(account.id, { balance: newBalance });

  const emoji = parsed.type === 'expense' ? '💸' : '💰';
  await sendMessage(
    botToken,
    chatId,
    `${emoji} Записано: ${parsed.description || 'Операция'}\nСумма: ${parsed.amount} ${account.currency || 'RUB'}\nКатегория: ${parsed.category || 'Другое'}\nСчёт: ${account.name}`
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const configId = new URL(req.url).searchParams.get('configId');
    if (!configId) return Response.json({ ok: true });

    const config = await base44.asServiceRole.entities.TelegramBotConfig.get(configId).catch(() => null);
    if (!config || !config.is_active) return Response.json({ ok: true });

    const update = await req.json();
    const message = update.message;
    if (!message) return Response.json({ ok: true });

    const botToken = config.bot_token;
    const chatId = message.chat.id;
    const fromId = String(message.from?.id || '');

    if (fromId !== String(config.telegram_user_id)) {
      await sendMessage(botToken, chatId, 'Этот бот подключён к другому аккаунту в приложении.');
      return Response.json({ ok: true });
    }

    const ownerId = config.created_by_id;
    let account = config.default_account_id
      ? await base44.asServiceRole.entities.Account.get(config.default_account_id).catch(() => null)
      : null;
    if (!account) {
      const accounts = await base44.asServiceRole.entities.Account.filter({ user_id: ownerId });
      account = accounts[0];
    }
    if (!account) {
      await sendMessage(botToken, chatId, 'Не найден счёт для записи операции. Добавьте счёт в приложении.');
      return Response.json({ ok: true });
    }

    // Голосовое сообщение
    if (message.voice) {
      const audioBuffer = await downloadTelegramFile(botToken, message.voice.file_id);
      if (!audioBuffer) {
        await sendMessage(botToken, chatId, 'Не удалось загрузить голосовое сообщение.');
        return Response.json({ ok: true });
      }
      const audioFile = new File([audioBuffer], 'voice.ogg', { type: 'audio/ogg' });
      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: audioFile });
      const transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: file_url });

      if (!transcript) {
        await sendMessage(botToken, chatId, 'Не удалось распознать голосовое сообщение.');
        return Response.json({ ok: true });
      }

      const today = new Date().toISOString().split('T')[0];
      const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Ты финансовый ассистент. Извлеки данные о транзакции из текста на русском языке.\n\nТекст: "${transcript}"\nСегодняшняя дата: ${today}\n\nПравила:\n- type: "expense" если это расход/потратил/купил/заплатил, "income" если доход/получил/заработал/пришло\n- amount: только число\n- category: выбери наиболее подходящую из списка: ${EXPENSE_CATEGORIES}\n- description: краткое описание (1-5 слов)\n- date: дата в формате YYYY-MM-DD (сегодня, если не указана другая)\n\nЕсли не удалось распознать сумму — верни error: "Не удалось распознать сумму"`,
        response_json_schema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['expense', 'income'] },
            amount: { type: 'number' },
            category: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string' },
            error: { type: 'string' }
          }
        }
      });

      if (parsed.error || !parsed.amount) {
        await sendMessage(botToken, chatId, `Не удалось распознать операцию: ${parsed.error || 'сумма не найдена'}`);
        return Response.json({ ok: true });
      }

      await finalizeTransaction({ base44, parsed, account, ownerId, botToken, chatId });
      return Response.json({ ok: true });
    }

    // Фото (чек или скриншот банковской операции)
    if (message.photo && message.photo.length > 0) {
      const bestPhoto = message.photo[message.photo.length - 1];
      const imgBuffer = await downloadTelegramFile(botToken, bestPhoto.file_id);
      if (!imgBuffer) {
        await sendMessage(botToken, chatId, 'Не удалось загрузить фото.');
        return Response.json({ ok: true });
      }
      const imgFile = new File([imgBuffer], 'receipt.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: imgFile });

      const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            merchant: { type: 'string' },
            amount: { type: 'number' },
            operation_type: { type: 'string', enum: ['expense', 'income'] },
            date: { type: 'string' },
            category: { type: 'string' }
          }
        }
      });

      if (extracted.status !== 'success' || !extracted.output?.amount) {
        await sendMessage(botToken, chatId, 'Не удалось распознать чек или выписку на фото.');
        return Response.json({ ok: true });
      }

      const out = extracted.output;
      const parsed = {
        type: out.operation_type === 'income' ? 'income' : 'expense',
        amount: out.amount,
        category: out.category || 'Другое',
        description: out.merchant || 'Операция по фото',
        date: out.date
      };

      await finalizeTransaction({ base44, parsed, account, ownerId, botToken, chatId });
      return Response.json({ ok: true });
    }

    if (message.text) {
      await sendMessage(botToken, chatId, 'Отправьте голосовое сообщение с описанием операции или фото чека/выписки — я запишу её в приложение.');
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('telegramWebhook error:', error);
    return Response.json({ ok: true });
  }
});