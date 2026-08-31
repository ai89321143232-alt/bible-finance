import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { effect, applyBalanceDelta, applyBudgetDelta, matchAccount } from '../../shared/transactionEffects.ts';
import { buildAssistantSystemPrompt, invokeAssistantModel, computeFinancialContext } from '../../shared/financialAssistant.ts';

const EXPENSE_CATEGORIES = 'Еда и рестораны, Транспорт, Здоровье, Развлечения, Одежда, ЖКХ, Связь, Образование, Зарплата, Другое';

// Модель может вернуть type по-русски ("расход"/"доход") — приводим к enum сущности Transaction,
// иначе create бросит ошибку валидации и весь список тихо упадёт без ответа пользователю.
function normalizeType(raw) {
  const t = String(raw || '').toLowerCase().trim();
  if (['расход', 'трата', 'потратил', 'spent', 'expense'].includes(t)) return 'expense';
  if (['доход', 'прибыль', 'получил', 'income', 'earning'].includes(t)) return 'income';
  if (['transfer', 'перевод'].includes(t)) return 'transfer';
  return t === 'income' || t === 'expense' || t === 'transfer' ? t : 'expense';
}

// Модель может вернуть сумму строкой с пробелом-разделителем ("1 472") или с символом валюты ("633 ₽") —
// Number("1 472") даёт NaN, поэтому чистим строку: оставляем только цифры, точку и минус.
function normalizeAmount(raw) {
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw || '').replace(/[^\d.\-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

async function sendMessage(botToken, chatId, text, replyMarkup) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup })
    });
  } catch (e) {
    // best-effort — webhook must still respond ok to Telegram
  }
}

async function answerCallbackQuery(botToken, callbackQueryId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    });
  } catch (e) {
    // best-effort
  }
}

async function removeInlineKeyboard(botToken, chatId, messageId) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
    });
  } catch (e) {
    // best-effort
  }
}

// Дата "YYYY-MM-DD" в часовом поясе пользователя (а не сервера/VPN) — чтобы операции,
// отправленные ночью по местному времени, попадали на правильный день.
function localDateString(timezone) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

async function downloadTelegramFile(botToken, fileId) {
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const infoData = await infoRes.json();
  if (!infoData.ok) return null;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${infoData.result.file_path}`);
  return await fileRes.arrayBuffer();
}

async function createTransactionRecord({ entities, parsed, account, ownerId }) {
  let txDate = new Date();
  if (parsed.date) {
    const d = new Date(parsed.date);
    if (!isNaN(d.getTime())) txDate = d;
  }

  // Проставляем family_id владельца бота, иначе операция видна только ему —
  // остальные члены семьи не увидят её ни в списке, ни в семейных финансах.
  const owner = await entities.User.get(ownerId).catch(() => null);

  await entities.Transaction.create({
    type: parsed.type,
    amount: parsed.amount,
    currency: account.currency || 'RUB',
    category: parsed.category || 'Другое',
    description: parsed.description || 'Операция из Telegram',
    date: txDate.toISOString(),
    account_id: account.id,
    user_id: ownerId,
    created_by_id: ownerId,
    family_id: owner?.family_id || undefined,
    source: 'telegram_bot'
  });

  await applyBalanceDelta(entities, account.id, effect(parsed.type, parsed.amount), ownerId);
  if (parsed.type === 'expense') await applyBudgetDelta(entities, ownerId, parsed.category, parsed.amount);
}

async function finalizeTransaction({ entities, parsed, account, ownerId, botToken, chatId }) {
  await createTransactionRecord({ entities, parsed, account, ownerId });
  const emoji = parsed.type === 'expense' ? '💸' : '💰';
  await sendMessage(
    botToken,
    chatId,
    `${emoji} Записано: ${parsed.description || 'Операция'}\nСумма: ${parsed.amount} ${account.currency || 'RUB'}\nКатегория: ${parsed.category || 'Другое'}\nСчёт: ${account.name}`
  );
}

// Отправляет список счетов кнопками и сохраняет операции, ожидающие выбора счёта
async function requestAccountSelection({ entities, config, accounts, transactions, botToken, chatId }) {
  await entities.TelegramBotConfig.update(config.id, { pending_transactions: transactions });
  const keyboard = accounts.map(a => ([{ text: a.name, callback_data: `acc:${a.id}` }]));
  const summary = transactions.length === 1
    ? `${transactions[0].type === 'expense' ? '💸' : '💰'} ${transactions[0].description || 'Операция'} — ${transactions[0].amount} ₽`
    : `Найдено операций: ${transactions.length} на сумму ${transactions.reduce((s, t) => s + (t.amount || 0), 0)} ₽`;
  await sendMessage(botToken, chatId, `${summary}\n\nВыберите счёт для записи:`, { inline_keyboard: keyboard });
}

// Если счёт один — сразу проводит операцию(и), иначе просит выбрать счёт кнопками
async function finalizeOrAskAccount({ entities, config, accounts, transactions, ownerId, botToken, chatId }) {
  if (accounts.length <= 1) {
    const account = accounts[0];
    if (!account) {
      await sendMessage(botToken, chatId, 'Не найден счёт для записи операции. Добавьте счёт в приложении.');
      return;
    }
    for (const t of transactions) {
      await finalizeTransaction({ entities, parsed: t, account, ownerId, botToken, chatId });
    }
    return;
  }
  await requestAccountSelection({ entities, config, accounts, transactions, botToken, chatId });
}

// Обработка нажатия кнопки выбора счёта
async function handleAccountCallback({ base44, config, accounts, ownerId, botToken, chatId, callbackQueryId, accountId, messageId }) {
  const entities = base44.asServiceRole.entities;
  const pending = config.pending_transactions || [];
  if (pending.length === 0) {
    await answerCallbackQuery(botToken, callbackQueryId, 'Операция уже обработана');
    await removeInlineKeyboard(botToken, chatId, messageId);
    return;
  }
  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    await answerCallbackQuery(botToken, callbackQueryId, 'Счёт не найден');
    return;
  }

  for (const t of pending) {
    await createTransactionRecord({ entities, parsed: t, account, ownerId });
  }
  await entities.TelegramBotConfig.update(config.id, { pending_transactions: [] });
  await answerCallbackQuery(botToken, callbackQueryId, 'Записано ✅');
  await removeInlineKeyboard(botToken, chatId, messageId);

  const total = pending.reduce((s, t) => s + (t.amount || 0), 0);
  const label = pending.length === 1
    ? `${pending[0].type === 'expense' ? '💸' : '💰'} Записано: ${pending[0].description || 'Операция'}\nСумма: ${pending[0].amount} ${account.currency || 'RUB'}\nКатегория: ${pending[0].category || 'Другое'}\nСчёт: ${account.name}`
    : `✅ Записано ${pending.length} операций на сумму ${total} ${account.currency || 'RUB'}\nСчёт: ${account.name}`;
  await sendMessage(botToken, chatId, label);
}

// Полноценный AI-чат в Telegram — те же вопросы/отчёты/создание/правка/удаление операций,
// что и в веб AI-ассистенте (aiChatAssistant), с сохранением истории переписки в конфиге бота.
async function handleTextMessage({ base44, config, account, accounts, ownerId, botToken, chatId, text }) {
  const entities = base44.asServiceRole.entities;

  const owner = await entities.User.get(ownerId).catch(() => null);
  const model = owner?.ai_active_model && owner[`ai_${owner.ai_active_model}_key`] ? owner.ai_active_model : 'default';
  const apiKeys = { deepseek: owner?.ai_deepseek_key, openai: owner?.ai_openai_key };

  const categories = await entities.Category.list();
  const categoryNames = categories.map(c => `${c.name} (${c.type === 'income' ? 'доход' : 'расход'})`).join(', ') || 'нет категорий';
  const accountNames = accounts.map(a => a.name).join(', ') || 'нет счетов';

  const allTx = await entities.Transaction.list('-date', 200);
  const recentTx = allTx.filter(t => t.created_by_id === ownerId || t.user_id === ownerId).slice(0, 25);
  const recentTxText = recentTx.map(t =>
    `id=${t.id} | ${t.date?.slice(0, 10)} | ${t.type === 'expense' ? 'расход' : 'доход'} | ${t.amount} ₽ | ${t.category} | ${t.description || ''}`
  ).join('\n') || 'нет операций';

  const financial_context = await computeFinancialContext(entities, ownerId, config.timezone || 'Europe/Moscow');
  const systemPrompt = buildAssistantSystemPrompt({ categoryNames, accountNames, recentTxText, financial_context });

  const history = (config.chat_history || []).slice(-10);
  const parsed = await invokeAssistantModel({ base44, model, apiKeys, systemPrompt, historyMessages: history, message: text });

  if (parsed.error) {
    await sendMessage(botToken, chatId, `⚠️ ${parsed.error}`);
    return;
  }

  const action = parsed.action || 'none';
  let replyText = parsed.reply || '';

  if (action === 'create_transactions' && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
    const items = parsed.transactions
      .map(t => ({ ...t, type: normalizeType(t.type), amount: normalizeAmount(t.amount) }))
      .filter(t => t.amount && t.type);
    if (items.length === 0) {
      replyText = replyText || 'Не удалось распознать операции из списка.';
    } else {
      // Если хотя бы у одной операции есть подсказка счёта — пытаемся сопоставить,
      // иначе используем счёт по умолчанию. При нескольких счетах и отсутствии подсказки — спрашиваем.
      const needAccountSelection = accounts.length > 1 && !items.every(t => matchAccount(accounts, t.account_hint));
      if (needAccountSelection) {
        await requestAccountSelection({
          entities, config, accounts,
          transactions: items.map(t => ({ type: t.type, amount: t.amount, category: t.category || 'Другое', description: t.description || 'Операция из списка', date: t.date })),
          botToken, chatId
        });
        const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: 'Уточняю счёт для записи операций…' }].slice(-20);
        await entities.TelegramBotConfig.update(config.id, { chat_history: newHistory });
        return;
      }
      await sendMessage(botToken, chatId, `📝 Записываю ${items.length} операци(й/ии)…`);
      let created = 0;
      const errors = [];
      for (const t of items) {
        const matchedAccountId = matchAccount(accounts, t.account_hint);
        const targetAccount = accounts.find(a => a.id === matchedAccountId) || account;
        if (!targetAccount) { errors.push('нет счёта'); continue; }
        try {
          await createTransactionRecord({ entities, parsed: t, account: targetAccount, ownerId });
          created++;
        } catch (e) {
          errors.push(`${t.description || t.category || 'операция'}: ${e.message || 'ошибка'}`);
        }
      }
      const total = items.reduce((s, t) => s + (t.amount || 0), 0);
      replyText = replyText || `✅ Записано ${created} из ${items.length} операций на сумму ${total.toLocaleString()} ₽${errors.length ? `\n⚠️ Не записано: ${errors.join('; ')}` : ''}`;
    }
  } else if (action === 'create_transaction' && parsed.transaction) {
    const t = { ...parsed.transaction, type: normalizeType(parsed.transaction.type), amount: normalizeAmount(parsed.transaction.amount) };
    if (!t.amount || !t.type) {
      replyText = replyText || 'Не удалось распознать сумму или тип операции.';
    } else {
      const matchedAccountId = matchAccount(accounts, t.account_hint);
      if (!matchedAccountId && accounts.length > 1) {
        // AI не смог определить счёт по подсказке — просим выбрать кнопками
        await requestAccountSelection({
          entities, config, accounts,
          transactions: [{ type: t.type, amount: t.amount, category: t.category || 'Другое', description: t.description || 'Операция из Telegram', date: t.date }],
          botToken, chatId
        });
        const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: 'Уточняю счёт для записи операции…' }].slice(-20);
        await entities.TelegramBotConfig.update(config.id, { chat_history: newHistory });
        return;
      }
      const targetAccount = accounts.find(a => a.id === matchedAccountId) || account;
      if (!targetAccount) {
        replyText = 'Не найден счёт для записи операции. Добавьте счёт в приложении.';
      } else {
        await entities.Transaction.create({
          type: t.type,
          amount: t.amount,
          currency: t.currency || targetAccount.currency || 'RUB',
          category: t.category || 'Другое',
          description: t.description || 'Операция из Telegram',
          date: t.date || new Date().toISOString(),
          account_id: targetAccount.id,
          user_id: ownerId,
          created_by_id: ownerId,
          family_id: owner?.family_id || undefined,
          source: 'telegram_bot'
        });
        await applyBalanceDelta(entities, targetAccount.id, effect(t.type, t.amount), ownerId);
        if (t.type === 'expense') await applyBudgetDelta(entities, ownerId, t.category, t.amount);
        replyText = replyText || `✅ Записал: ${t.type === 'expense' ? '-' : '+'}${t.amount} ₽ (${t.category || 'Другое'})`;
      }
    }
  } else if (action === 'create_investment' && parsed.investment) {
    const inv = parsed.investment;
    if (!inv.name || !inv.type) {
      replyText = replyText || 'Не удалось распознать данные об инвестиции.';
    } else {
      const matchedAccountId = matchAccount(accounts, inv.account_hint);
      const targetAccount = accounts.find(a => a.id === matchedAccountId) || account;
      if (!targetAccount) {
        replyText = 'Не найден счёт для списания денег на покупку. Добавьте счёт в приложении.';
      } else {
        const quantity = inv.quantity || 1;
        const purchasePrice = inv.purchase_price || 0;
        const totalCost = quantity * purchasePrice;
        await entities.Investment.create({
          name: inv.name,
          type: inv.type,
          quantity,
          purchase_price: purchasePrice,
          current_price: purchasePrice,
          currency: inv.currency || 'RUB',
          purchase_date: new Date().toISOString().split('T')[0],
          user_id: ownerId,
          family_id: owner?.family_id || undefined,
          created_by_id: ownerId
        });
        // Явно дублируем created_by_id — платформа может перезаписать его при service-role create.
        await applyBalanceDelta(entities, targetAccount.id, -totalCost, ownerId);
        replyText = replyText || `✅ Записал покупку инвестиции: ${inv.name} на ${totalCost.toLocaleString()} ₽ (счёт: ${targetAccount.name})`;
      }
    }
  } else if (action === 'create_goal' && parsed.goal) {
    const g = parsed.goal;
    if (!g.title || !g.target_amount) {
      replyText = replyText || 'Не удалось распознать название или сумму цели.';
    } else {
      await entities.Goal.create({
        title: g.title,
        type: g.type || 'savings',
        target_amount: g.target_amount,
        current_amount: 0,
        currency: g.currency || 'RUB',
        deadline: g.deadline || undefined,
        priority: g.priority || 'medium',
        user_id: ownerId,
        created_by_id: ownerId,
        family_id: owner?.family_id || undefined,
        visibility: 'private',
        status: 'active'
      });
      replyText = replyText || `✅ Создал цель: ${g.title} — накопить ${g.target_amount.toLocaleString()} ₽`;
    }
  } else if (action === 'create_budget' && parsed.budget) {
    const b = parsed.budget;
    if (!b.name || !b.limit_amount) {
      replyText = replyText || 'Не удалось распознать название или лимит бюджета.';
    } else {
      await entities.Budget.create({
        name: b.name,
        categories: b.categories || [],
        limit_amount: b.limit_amount,
        spent_amount: 0,
        period: b.period || 'monthly',
        currency: b.currency || 'RUB',
        user_id: ownerId,
        created_by_id: ownerId,
        family_id: owner?.family_id || undefined,
        visibility: 'private',
        is_active: true,
        start_date: new Date().toISOString().split('T')[0]
      });
      replyText = replyText || `✅ Создал бюджет: ${b.name} — лимит ${b.limit_amount.toLocaleString()} ₽`;
    }
  } else if (action === 'update_transaction' && parsed.transaction_id && parsed.updates) {
    const existing = recentTx.find(t => t.id === parsed.transaction_id);
    if (!existing) {
      replyText = replyText || 'Не удалось найти указанную операцию.';
    } else {
      const u = parsed.updates;
      const newType = u.type || existing.type;
      const newAmount = u.amount !== undefined ? u.amount : existing.amount;
      const newCategory = u.category || existing.category;

      await applyBalanceDelta(entities, existing.account_id, -effect(existing.type, existing.amount), ownerId);
      if (existing.type === 'expense') await applyBudgetDelta(entities, ownerId, existing.category, -existing.amount);

      await applyBalanceDelta(entities, existing.account_id, effect(newType, newAmount), ownerId);
      if (newType === 'expense') await applyBudgetDelta(entities, ownerId, newCategory, newAmount);

      const updatePayload = {};
      if (u.type) updatePayload.type = u.type;
      if (u.amount !== undefined) updatePayload.amount = u.amount;
      if (u.category) updatePayload.category = u.category;
      if (u.description !== undefined) updatePayload.description = u.description;
      if (u.date) updatePayload.date = u.date;
      await entities.Transaction.update(existing.id, updatePayload);
      replyText = replyText || '✅ Операция обновлена';
    }
  } else if (action === 'delete_transaction' && parsed.transaction_id) {
    const existing = recentTx.find(t => t.id === parsed.transaction_id);
    if (!existing) {
      replyText = replyText || 'Не удалось найти указанную операцию.';
    } else {
      await applyBalanceDelta(entities, existing.account_id, -effect(existing.type, existing.amount), ownerId);
      if (existing.type === 'expense') await applyBudgetDelta(entities, ownerId, existing.category, -existing.amount);
      await entities.Transaction.delete(existing.id);
      replyText = replyText || '🗑️ Операция удалена';
    }
  }

  await sendMessage(botToken, chatId, replyText || 'Не удалось обработать сообщение.');

  const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: replyText }].slice(-20);
  await entities.TelegramBotConfig.update(config.id, { chat_history: newHistory });
}

function mimeAndNameFromDocument(doc) {
  const name = doc.file_name || 'file';
  const mime = doc.mime_type || 'application/octet-stream';
  return { name, mime };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const configId = new URL(req.url).searchParams.get('configId');
    if (!configId) return Response.json({ ok: true });

    const config = await base44.asServiceRole.entities.TelegramBotConfig.get(configId).catch(() => null);
    if (!config || !config.is_active) return Response.json({ ok: true });

    // Верификация происхождения запроса: Telegram при setWebhook(secret_token)
    // отправляет заголовок X-Telegram-Bot-Api-Secret-Token. Проверяем ДО обработки
    // update — подделка тела с from.id больше не проходит (finding 4).
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    if (!config.webhook_secret || secretHeader !== config.webhook_secret) {
      return Response.json({ ok: true });
    }

    const update = await req.json();
    const botToken = config.bot_token;

    // Нажатие на кнопку выбора счёта
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id;
      const fromId = String(cq.from?.id || '');
      if (fromId !== String(config.telegram_user_id)) {
        await answerCallbackQuery(botToken, cq.id, 'Этот бот подключён к другому аккаунту.');
        return Response.json({ ok: true });
      }
      const data = cq.data || '';
      if (data.startsWith('acc:')) {
        const accountId = data.slice(4);
        const ownerId = config.created_by_id;
        const allAccounts = await base44.asServiceRole.entities.Account.filter({ user_id: ownerId });
        const accounts = allAccounts.length > 0 ? allAccounts : await base44.asServiceRole.entities.Account.filter({ created_by_id: ownerId });
        const messageId = cq.message?.message_id;
        await handleAccountCallback({ base44, config, accounts, ownerId, botToken, chatId, callbackQueryId: cq.id, accountId, messageId });
      }
      return Response.json({ ok: true });
    }

    const message = update.message;
    if (!message) return Response.json({ ok: true });

    const chatId = message.chat.id;
    const fromId = String(message.from?.id || '');

    if (fromId !== String(config.telegram_user_id)) {
      await sendMessage(botToken, chatId, 'Этот бот подключён к другому аккаунту в приложении.');
      return Response.json({ ok: true });
    }

    const ownerId = config.created_by_id;
    const allAccounts = await base44.asServiceRole.entities.Account.filter({ user_id: ownerId });
    const accounts = allAccounts.length > 0 ? allAccounts : await base44.asServiceRole.entities.Account.filter({ created_by_id: ownerId });
    let account = config.default_account_id
      ? await base44.asServiceRole.entities.Account.get(config.default_account_id).catch(() => null)
      : null;
    if (!account) account = accounts[0];
    if (!account) {
      await sendMessage(botToken, chatId, 'Не найден счёт для записи операции. Добавьте счёт в приложении.');
      return Response.json({ ok: true });
    }

    const entities = base44.asServiceRole.entities;

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

      if (!transcript || !transcript.trim()) {
        await sendMessage(botToken, chatId, 'Не удалось распознать голосовое сообщение. Попробуйте записать ещё раз или напишите текстом.');
        return Response.json({ ok: true });
      }

      // Голос обрабатывается через полный AI-ассистент — тот же, что и текстовые сообщения.
      // Это даёт более надёжное распознавание суммы/категории и поддерживает правку/удаление/вопросы.
      await handleTextMessage({ base44, config, account, accounts, ownerId, botToken, chatId, text: transcript.trim() });
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

      await finalizeOrAskAccount({ entities, config, accounts, transactions: [parsed], ownerId, botToken, chatId });
      return Response.json({ ok: true });
    }

    // Файл (PDF или банковская выписка: pdf, csv, xlsx, png/jpg документом)
    if (message.document) {
      const { name, mime } = mimeAndNameFromDocument(message.document);
      const fileBuffer = await downloadTelegramFile(botToken, message.document.file_id);
      if (!fileBuffer) {
        await sendMessage(botToken, chatId, 'Не удалось загрузить файл.');
        return Response.json({ ok: true });
      }
      const docFile = new File([fileBuffer], name, { type: mime });
      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: docFile });

      await sendMessage(botToken, chatId, '📄 Обрабатываю файл, это может занять немного времени…');

      const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  merchant: { type: 'string' },
                  amount: { type: 'number' },
                  operation_type: { type: 'string', enum: ['expense', 'income'] },
                  date: { type: 'string' },
                  category: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const rows = extracted.status === 'success' ? (extracted.output?.transactions || []) : [];
      const valid = rows.filter(r => r && r.amount);
      if (valid.length === 0) {
        await sendMessage(botToken, chatId, 'Не удалось распознать операции в этом файле. Поддерживаются PDF, CSV, XLSX, а также фото чеков.');
        return Response.json({ ok: true });
      }

      const transactions = valid.map(r => ({
        type: r.operation_type === 'income' ? 'income' : 'expense',
        amount: r.amount,
        category: r.category || 'Другое',
        description: r.merchant || 'Операция из выписки',
        date: r.date
      }));

      await finalizeOrAskAccount({ entities, config, accounts, transactions, ownerId, botToken, chatId });
      return Response.json({ ok: true });
    }

    // Текстовое сообщение — полноценный AI-чат (вопросы, отчёты, создание/правка/удаление операций)
    if (message.text) {
      if (message.text.trim() === '/start') {
        await sendMessage(botToken, chatId, 'Привет! 👋 Я твой финансовый ассистент. Спроси меня об операциях, попроси отчёт, отправь голосовое/фото чека/PDF или CSV выписку — или просто опиши покупку текстом, и я всё запишу. Если счетов несколько — предложу выбрать нужный кнопками.');
        return Response.json({ ok: true });
      }
      try {
        await handleTextMessage({ base44, config, account, accounts, ownerId, botToken, chatId, text: message.text });
      } catch (e) {
        console.error('handleTextMessage error:', e);
        await sendMessage(botToken, chatId, '⚠️ Не удалось обработать сообщение. Попробуйте ещё раз или переформулируйте.');
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('telegramWebhook error:', error);
    return Response.json({ ok: true });
  }
});