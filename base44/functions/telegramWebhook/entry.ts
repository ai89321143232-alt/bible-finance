import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { effect, applyBalanceDelta, applyBudgetDelta, getBudgetMatches, getAccessibleBudgets, matchAccount } from '../../shared/transactionEffects.ts';
import { buildAssistantSystemPrompt, invokeAssistantModel, computeFinancialContext } from '../../shared/financialAssistant.ts';
import { createCurrencyTools } from '../../shared/currencyConvert.ts';
import { looksLikeExpenseReport, buildExpenseReport } from '../../shared/expenseReport.ts';

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

const REPLY_KEYBOARD = {
  keyboard: [
    [{ text: '💰 Баланс' }, { text: '📊 Аналитика' }],
    [{ text: '📋 Операции' }]
  ],
  resize_keyboard: true,
  one_time: false
};

async function sendMessage(botToken, chatId, text, replyMarkup) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup ?? REPLY_KEYBOARD })
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

// Платформа при service-role create перезаписывает created_by_id системным service-ID,
// поэтому бот-записи оказываются нередактируемыми в приложении. После создания — явным
// update проставляем настоящего владельца (update не затирает created_by_id, в отличие от create).
async function reassignOwnership(entities, entityName, recordId, ownerId, familyId) {
  await entities[entityName].update(recordId, {
    created_by_id: ownerId,
    family_id: familyId || undefined
  });
}

function resolveBotActor(config, telegramUserId) {
  const linked = (config.linked_members || []).find((member) => String(member.telegram_user_id) === String(telegramUserId));
  if (linked?.user_id) return linked;
  if (String(config.telegram_user_id) === String(telegramUserId)) return { user_id: config.created_by_id, display_name: 'Владелец' };
  return null;
}

async function savePendingLink(entities, config, telegramUserId, telegramUser) {
  const pending = config.pending_links || [];
  if (pending.some((item) => String(item.telegram_user_id) === String(telegramUserId))) return;
  const name = [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(' ') || telegramUser?.username || '';
  await entities.TelegramBotConfig.update(config.id, {
    pending_links: [...pending, { telegram_user_id: String(telegramUserId), telegram_display_name: name, requested_date: new Date().toISOString() }]
  });
}

const CATEGORY_ICONS = [
  ['🛒 Покупки', 'ShoppingCart'], ['🍽 Еда', 'Utensils'], ['🚗 Транспорт', 'Car'],
  ['🏠 Дом', 'Home'], ['💊 Здоровье', 'HeartPulse'], ['🎓 Учёба', 'GraduationCap']
];
const CATEGORY_COLORS = [['🟣 Фиолетовый', '#8B5CF6'], ['🔵 Синий', '#3B82F6'], ['🟢 Зелёный', '#22C55E'], ['🟠 Оранжевый', '#F97316'], ['🔴 Красный', '#EF4444'], ['🩷 Розовый', '#EC4899']];

function normalizeCategory(s) {
  return String(s || '').trim().toLowerCase();
}

function categoryMatches(budget, categoryName) {
  const categories = budget.categories || (budget.category ? [budget.category] : []);
  const norm = normalizeCategory(categoryName);
  return categories.some((item) => normalizeCategory(item) === norm);
}

// Свежая копия конфига: в одном запросе мы обновляем ожидания несколько раз,
// и устаревший снимок затирал бы соседние операции из списка.
async function freshConfig(entities, config) {
  return (await entities.TelegramBotConfig.get(config.id).catch(() => null)) || config;
}

const isMine = (telegramUserId) => (item) => String(item.telegram_user_id) === String(telegramUserId);

async function cancelPending(entities, config, telegramUserId) {
  const c = await freshConfig(entities, config);
  const notMine = (item) => !isMine(telegramUserId)(item);
  await entities.TelegramBotConfig.update(config.id, {
    pending_transactions: (c.pending_transactions || []).filter(notMine),
    pending_budget_transactions: (c.pending_budget_transactions || []).filter(notMine),
    pending_category_setup: (c.pending_category_setup || []).filter(notMine)
  });
}

async function saveCategorySetup(entities, config, telegramUserId, setup) {
  // Сохраняем несколько setup-ов для разных категорий (при обработке списка операций),
  // но обновляем существующий для той же категории.
  config = await freshConfig(entities, config);
  const remaining = (config.pending_category_setup || []).filter((item) =>
    !(String(item.telegram_user_id) === String(telegramUserId) &&
      normalizeCategory(item.category) === normalizeCategory(setup.category)));
  await entities.TelegramBotConfig.update(config.id, { pending_category_setup: [...remaining, { ...setup, telegram_user_id: String(telegramUserId) }] });
}

async function completeCategorySetup({ entities, config, setup, ownerId, telegramUserId, botToken, chatId, budgetScope }) {
  const account = await entities.Account.get(setup.account_id);
  if (!account) {
    await sendMessage(botToken, chatId, 'Не удалось найти выбранный счёт. Отправьте операцию ещё раз.');
    return;
  }
  // Сначала снимаем ожидание (защита от двойного нажатия), потом записываем
  config = await freshConfig(entities, config);
  await entities.TelegramBotConfig.update(config.id, { pending_category_setup: (config.pending_category_setup || []).filter((item) =>
    !(String(item.telegram_user_id) === String(telegramUserId) &&
      normalizeCategory(item.category) === normalizeCategory(setup.category))) });
  await createTransactionRecord({ entities, parsed: setup, account, ownerId, budgetScope });
  const accounts = await entities.Account.filter({ user_id: ownerId });
  const owner = await entities.User.get(ownerId).catch(() => null);
  await sendMessage(botToken, chatId, await buildTransactionReceipt(setup, accounts.find((item) => item.id === account.id) || account, accounts, owner));

  // Если есть ещё ожидающие setup-ы (другие категории из списка операций) — обрабатываем следующий
  const remaining = (config.pending_category_setup || []).filter((item) =>
    String(item.telegram_user_id) === String(telegramUserId) &&
    normalizeCategory(item.category) !== normalizeCategory(setup.category));
  if (remaining.length > 0) {
    const nextSetup = remaining[0];
    const nextAccount = await entities.Account.get(nextSetup.account_id);
    if (nextAccount) {
      await finalizeTransaction({ entities, config, parsed: nextSetup, account: nextAccount, ownerId, telegramUserId, botToken, chatId });
    }
  }
}

async function showBudgetChoice({ entities, config, setup, ownerId, telegramUserId, botToken, chatId }) {
  if (setup.category_type !== 'expense') {
    await completeCategorySetup({ entities, config, setup, ownerId, telegramUserId, botToken, chatId });
    return;
  }
  const budgets = await getAccessibleBudgets(entities, ownerId);
  await saveCategorySetup(entities, config, telegramUserId, { ...setup, stage: 'budget_choice' });
  await sendMessage(botToken, chatId, `Категория «${setup.category}» пока не входит ни в один бюджет. Выберите бюджет или создайте новый:`, {
    inline_keyboard: [
      ...budgets.map((budget) => [{ text: `${budget.name} — ${budget.limit_amount} ${budget.currency || 'RUB'}`, callback_data: `cat:budget:${budget.id}` }]),
      [{ text: '➕ Новый бюджет', callback_data: 'cat:newbudget' }],
      [{ text: '← Назад', callback_data: 'cat:back' }]
    ]
  });
}

async function beginCategorySetup({ entities, config, parsed, account, ownerId, telegramUserId, botToken, chatId }) {
  await saveCategorySetup(entities, config, telegramUserId, { ...parsed, account_id: account.id, owner_id: ownerId, stage: 'category_type' });
  await sendMessage(botToken, chatId, `Категории «${parsed.category}» ещё нет. Сначала выберите её тип:`, {
    inline_keyboard: [[
      { text: '💸 Расход', callback_data: 'cat:type:expense' },
      { text: '💰 Доход', callback_data: 'cat:type:income' }
    ]]
  });
}

async function ensureCategoryAndBudget({ entities, config, parsed, account, ownerId, telegramUserId, botToken, chatId }) {
  const categories = await entities.Category.list();
  const category = categories.find((item) => String(item.name).trim().toLowerCase() === String(parsed.category || 'Другое').trim().toLowerCase());
  if (!category) {
    await beginCategorySetup({ entities, config, parsed, account, ownerId, telegramUserId, botToken, chatId });
    return false;
  }
  if (parsed.type === 'expense') {
    const budgets = await getAccessibleBudgets(entities, ownerId);
    if (!budgets.some((budget) => categoryMatches(budget, parsed.category))) {
      await showBudgetChoice({ entities, config, setup: { ...parsed, account_id: account.id, category_type: 'expense', category_id: category.id }, ownerId, telegramUserId, botToken, chatId });
      return false;
    }
  }
  return true;
}

async function createTransactionRecord({ entities, parsed, account, ownerId, budgetScope }) {
  let txDate = new Date();
  if (parsed.date) {
    const d = new Date(parsed.date);
    if (!isNaN(d.getTime())) txDate = d;
  }

  // Проставляем family_id владельца бота, иначе операция видна только ему —
  // остальные члены семьи не увидят её ни в списке, ни в семейных финансах.
  const owner = await entities.User.get(ownerId).catch(() => null);

  const created = await entities.Transaction.create({
    type: parsed.type,
    amount: parsed.amount,
    currency: parsed.currency || account.currency || owner?.currency || 'RUB',
    category: parsed.category || 'Другое',
    description: parsed.description || 'Операция из Telegram',
    date: txDate.toISOString(),
    account_id: account.id,
    user_id: ownerId,
    created_by_id: ownerId,
    family_id: owner?.family_id || undefined,
    family_member_id: ownerId,
    budget_scope: budgetScope,
    source: 'telegram_bot'
  });
  await reassignOwnership(entities, 'Transaction', created.id, ownerId, owner?.family_id);

  await applyBalanceDelta(entities, account.id, effect(parsed.type, parsed.amount), ownerId);
  if (parsed.type === 'expense') await applyBudgetDelta(entities, ownerId, parsed.category, parsed.amount, budgetScope);
}

async function requestBudgetSelection({ entities, config, parsed, account, ownerId, telegramUserId, botToken, chatId, matches }) {
  config = await freshConfig(entities, config);
  // Не затираем другие ожидающие операции этого пользователя (из того же списка)
  const pending = config.pending_budget_transactions || [];
  await entities.TelegramBotConfig.update(config.id, {
    pending_budget_transactions: [...pending, {
      telegram_user_id: String(telegramUserId), account_id: account.id,
      type: parsed.type, amount: parsed.amount, currency: parsed.currency, category: parsed.category,
      description: parsed.description, date: parsed.date,
      personal_budget_id: matches.personal[0].id, family_budget_id: matches.family[0].id
    }]
  });
  const personal = matches.personal[0];
  const family = matches.family[0];
  await sendMessage(botToken, chatId, `С какого бюджета списать «${parsed.description || parsed.category}» — ${parsed.amount} ${parsed.currency || account.currency || ''}?`, {
    inline_keyboard: [[
      { text: `Личный: ${personal.name} (${personal.limit_amount - (personal.spent_amount || 0)} ${personal.currency || 'RUB'})`, callback_data: 'budget:personal' },
      { text: `Семейный: ${family.name} (${family.limit_amount - (family.spent_amount || 0)} ${family.currency || 'RUB'})`, callback_data: 'budget:family' }
    ], [
      { text: '👥 В оба бюджета', callback_data: 'budget:both' }
    ]]
  });
}

async function finalizeTransaction({ entities, config, parsed, account, ownerId, telegramUserId, botToken, chatId, budgetScope }) {
  const ready = await ensureCategoryAndBudget({ entities, config, parsed, account, ownerId, telegramUserId, botToken, chatId });
  if (!ready) return false;
  let selectedScope = budgetScope;
  if (parsed.type === 'expense' && !selectedScope) {
    const matches = await getBudgetMatches(entities, ownerId, parsed.category || 'Другое');
    if (matches.personal.length && matches.family.length) {
      await requestBudgetSelection({ entities, config, parsed, account, ownerId, telegramUserId, botToken, chatId, matches });
      return false;
    }
    selectedScope = matches.family.length ? 'family' : 'personal';
  }
  await createTransactionRecord({ entities, parsed, account, ownerId, budgetScope: selectedScope });
  const accounts = await entities.Account.filter({ user_id: ownerId });
  const freshAccount = accounts.find(a => a.id === account.id) || account;
  const owner = await entities.User.get(ownerId).catch(() => null);
  await sendMessage(botToken, chatId, await buildTransactionReceipt(parsed, freshAccount, accounts, owner));
  return true;
}

// Отправляет список счетов кнопками и сохраняет операции, ожидающие выбора счёта
async function requestAccountSelection({ entities, config, accounts, transactions, telegramUserId, botToken, chatId }) {
  config = await freshConfig(entities, config);
  const otherPending = (config.pending_transactions || []).filter((item) => String(item.telegram_user_id) !== String(telegramUserId));
  await entities.TelegramBotConfig.update(config.id, { pending_transactions: [...otherPending, ...transactions.map((item) => ({ ...item, telegram_user_id: String(telegramUserId) }))] });
  const keyboard = accounts.map(a => ([{ text: a.name, callback_data: `acc:${a.id}` }]));
  const summary = transactions.length === 1
    ? `${transactions[0].type === 'expense' ? '💸' : '💰'} ${transactions[0].description || 'Операция'} — ${transactions[0].amount} ₽`
    : `Найдено операций: ${transactions.length} на сумму ${transactions.reduce((s, t) => s + (t.amount || 0), 0)} ₽`;
  await sendMessage(botToken, chatId, `${summary}\n\nВыберите счёт для записи:`, { inline_keyboard: keyboard });
}

async function buildTransactionReceipt(parsed, account, allAccounts, owner) {
  const isExpense = parsed.type === 'expense';
  const emoji = isExpense ? '💸' : '💰';
  const sign = isExpense ? '−' : '+';
  const accountCurrency = account?.currency || 'RUB';
  const currency = createCurrencyTools(owner);
  const totals = currency.summarize((allAccounts || []).map(a => ({ amount: a.balance, currency: a.currency })));

  const lines = [
    `✅ Записано для <b>${owner?.full_name || 'вас'}</b>`,
    `📝 <b>${parsed.description || 'Операция из Telegram'}</b>`,
    '',
    `${emoji} <b>${sign}${currency.format(parsed.amount, parsed.currency || accountCurrency)}</b>`,
    `📂 Категория: ${parsed.category || 'Другое'}`,
    `🏦 Счёт: ${account?.name || '—'}`,
    '──────────────',
    `💳 Остаток на счёте: <code>${currency.format(account?.balance, accountCurrency)}</code>`,
    '💰 Общий баланс:',
    ...totals.lines.map(line => `<code>${line}</code>`),
    `<b>Итого: ${currency.format(totals.total)}</b>${totals.missing.length ? ` (без курса: ${totals.missing.join(', ')})` : ''}`
  ];
  return lines.join('\n');
}

// Если счёт один — сразу проводит операцию(и), иначе просит выбрать счёт кнопками
async function finalizeOrAskAccount({ entities, config, accounts, transactions, ownerId, telegramUserId, botToken, chatId }) {
  if (accounts.length <= 1) {
    const account = accounts[0];
    if (!account) {
      await sendMessage(botToken, chatId, 'Не найден счёт для записи операции. Добавьте счёт в приложении.');
      return;
    }
    for (const t of transactions) {
      await finalizeTransaction({ entities, config, parsed: t, account, ownerId, telegramUserId, botToken, chatId });
    }
    return;
  }
  await requestAccountSelection({ entities, config, accounts, transactions, telegramUserId, botToken, chatId });
}

// Обработка нажатия кнопки выбора счёта
async function handleAccountCallback({ base44, config, accounts, ownerId, telegramUserId, botToken, chatId, callbackQueryId, accountId, messageId }) {
  const entities = base44.asServiceRole.entities;
  const pending = (config.pending_transactions || []).filter((item) => String(item.telegram_user_id) === String(telegramUserId));
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

  // Снимаем ожидание до записи — повторное нажатие не создаст дубль
  await entities.TelegramBotConfig.update(config.id, { pending_transactions: (config.pending_transactions || []).filter((item) => String(item.telegram_user_id) !== String(telegramUserId)) });
  let recorded = 0;
  for (const t of pending) {
    const completed = await finalizeTransaction({ entities, config, parsed: t, account, ownerId, telegramUserId, botToken, chatId });
    if (completed) recorded++;
  }
  await answerCallbackQuery(botToken, callbackQueryId, recorded ? 'Записано ✅' : 'Выберите бюджет');
  await removeInlineKeyboard(botToken, chatId, messageId);

  const freshAccounts = await entities.Account.filter({ user_id: ownerId });
  const freshAccount = freshAccounts.find(a => a.id === accountId) || account;

  if (!recorded) return;
  if (pending.length === 1) {
    const owner = await entities.User.get(ownerId).catch(() => null);
    await sendMessage(botToken, chatId, await buildTransactionReceipt(pending[0], freshAccount, freshAccounts, owner));
  } else {
    const owner = await entities.User.get(ownerId).catch(() => null);
    const currency = createCurrencyTools(owner);
    const totals = currency.summarize(freshAccounts.map(a => ({ amount: a.balance, currency: a.currency })));
    const summary = pending.map(t => `  ${t.type === 'expense' ? '💸' : '💰'} ${t.description || 'Операция'} — <b>${currency.format(t.amount, t.currency || freshAccount.currency)}</b>`).join('\n');
    await sendMessage(botToken, chatId, `📝 <b>Записано ${pending.length} операций</b>\n\n${summary}\n\n──────────────\n💳 <b>Остаток на счёте:</b> <code>${currency.format(freshAccount.balance, freshAccount.currency)}</code>\n💰 <b>Общий баланс:</b>\n${totals.lines.map(line => `<code>${line}</code>`).join('\n')}\n<b>Итого: ${currency.format(totals.total)}</b>${totals.missing.length ? ` (без курса: ${totals.missing.join(', ')})` : ''}`);
  }
}

// Полноценный AI-чат в Telegram — те же вопросы/отчёты/создание/правка/удаление операций,
// что и в веб AI-ассистенте (aiChatAssistant), с сохранением истории переписки в конфиге бота.
async function handleTextMessage({ base44, config, account, accounts, ownerId, telegramUserId, botToken, chatId, text }) {
  const entities = base44.asServiceRole.entities;

  const owner = await entities.User.get(ownerId).catch(() => null);
  const model = owner?.ai_active_model && owner[`ai_${owner.ai_active_model}_key`] ? owner.ai_active_model : 'default';
  const apiKeys = { deepseek: owner?.ai_deepseek_key, openai: owner?.ai_openai_key };

  const categories = await entities.Category.list();
  const categoryNames = categories.map(c => `${c.name} (${c.type === 'income' ? 'доход' : 'расход'})`).join(', ') || 'нет категорий';
  const accountNames = accounts.map(a => a.name).join(', ') || 'нет счетов';

  const recentTxPage = await entities.Transaction.filter({ user_id: ownerId }, { sort: '-date', limit: 25 });
  const recentTx = (recentTxPage.items || recentTxPage).slice(0, 25);
  const recentTxText = recentTx.map(t =>
    `id=${t.id} | ${t.date?.slice(0, 10)} | ${t.type === 'expense' ? 'расход' : 'доход'} | ${t.amount} ${t.currency || 'RUB'} | ${t.category} | ${t.description || ''}`
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
  // Не используем parsed.reply напрямую: если действие реально не выполнено
  // (LLM вернула action='none' или не распознала данные), честно сообщаем об этом,
  // а не повторяем обманчивый текст LLM вроде «я добавил».
  let replyText = action === 'none' ? (parsed.reply || 'Не удалось распознать команду.') : '';

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
          transactions: items.map(t => ({ type: t.type, amount: t.amount, currency: t.currency, category: t.category || 'Другое', description: t.description || 'Операция из списка', date: t.date })),
          telegramUserId, botToken, chatId
        });
        const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: 'Уточняю счёт для записи операций…' }].slice(-20);
        await entities.TelegramBotConfig.update(config.id, { chat_history: newHistory });
        return;
      }
      await sendMessage(botToken, chatId, `📝 Записываю ${items.length} операци(й/ии)…`);
      let created = 0;
      let pendingSetup = false;
      const errors = [];
      for (const t of items) {
        const matchedAccountId = matchAccount(accounts, t.account_hint);
        const targetAccount = accounts.find(a => a.id === matchedAccountId) || account;
        if (!targetAccount) { errors.push('нет счёта'); continue; }
        try {
          const completed = await finalizeTransaction({ entities, config, parsed: t, account: targetAccount, ownerId, telegramUserId, botToken, chatId });
          if (completed) created++;
          else pendingSetup = true;
        } catch (e) {
          errors.push(`${t.description || t.category || 'операция'}: ${e.message || 'ошибка'}`);
        }
      }
      const total = items.reduce((s, t) => s + (t.amount || 0), 0);
      const freshAccounts = await entities.Account.filter({ user_id: ownerId });
      if (pendingSetup && created === 0) {
        // Бот уже показал выбор бюджета — не отправляем ошибку, просто обновляем историю
        const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: 'Уточняю бюджет для записи операций…' }].slice(-20);
        await entities.TelegramBotConfig.update(config.id, { chat_history: newHistory });
        return;
      }
      replyText = created > 0
        ? `📝 <b>Записано ${created} из ${items.length} операций</b>\n💰 Сумма: <b>${total.toLocaleString()} ₽</b>${errors.length ? `\n⚠️ Не записано: ${errors.join('; ')}` : ''}\n──────────────\n💰 <b>Общий баланс:</b> <code>${freshAccounts.reduce((s, a) => s + (a.balance || 0), 0).toLocaleString()} ₽</code>`
        : `❌ Не удалось записать ни одной операции${errors.length ? `: ${errors.join('; ')}` : ''}`;
    }
  } else if (action === 'create_transaction' && parsed.transaction) {
    const t = { ...parsed.transaction, type: normalizeType(parsed.transaction.type), amount: normalizeAmount(parsed.transaction.amount) };
    if (!t.amount || !t.type) {
      replyText = '❌ Не удалось распознать сумму или тип операции. Укажите: сумму, тип (расход/доход) и категорию.';
    } else {
      const matchedAccountId = matchAccount(accounts, t.account_hint);
      if (!matchedAccountId && accounts.length > 1) {
        // AI не смог определить счёт по подсказке — просим выбрать кнопками
        await requestAccountSelection({
          entities, config, accounts,
          transactions: [{ type: t.type, amount: t.amount, currency: t.currency, category: t.category || 'Другое', description: t.description || 'Операция из Telegram', date: t.date }],
          telegramUserId, botToken, chatId
        });
        const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: 'Уточняю счёт для записи операции…' }].slice(-20);
        await entities.TelegramBotConfig.update(config.id, { chat_history: newHistory });
        return;
      }
      const targetAccount = accounts.find(a => a.id === matchedAccountId) || account;
      if (!targetAccount) {
        replyText = '❌ Не найден счёт для записи операции. Добавьте счёт в приложении.';
      } else {
        const completed = await finalizeTransaction({ entities, config, parsed: t, account: targetAccount, ownerId, telegramUserId, botToken, chatId });
        if (!completed) return;
        replyText = '✅ Операция записана.';
      }
    }
  } else if (action === 'create_investment' && parsed.investment) {
    const inv = parsed.investment;
    if (!inv.name || !inv.type) {
      replyText = '❌ Не удалось распознать данные об инвестиции.';
    } else {
      const matchedAccountId = matchAccount(accounts, inv.account_hint);
      const targetAccount = accounts.find(a => a.id === matchedAccountId) || account;
      if (!targetAccount) {
        replyText = 'Не найден счёт для списания денег на покупку. Добавьте счёт в приложении.';
      } else {
        const quantity = inv.quantity || 1;
        const purchasePrice = inv.purchase_price || 0;
        const totalCost = quantity * purchasePrice;
        const createdInv = await entities.Investment.create({
          name: inv.name,
          type: inv.type,
          quantity,
          purchase_price: purchasePrice,
          current_price: purchasePrice,
          currency: inv.currency || owner?.currency || 'RUB',
          purchase_date: new Date().toISOString().split('T')[0],
          user_id: ownerId,
          family_id: owner?.family_id || undefined,
          created_by_id: ownerId
        });
        // Платформа перезаписывает created_by_id при service-role create — возвращаем настоящего владельца.
        await reassignOwnership(entities, 'Investment', createdInv.id, ownerId, owner?.family_id);
        await applyBalanceDelta(entities, targetAccount.id, -totalCost, ownerId);
        replyText = `✅ Записал покупку инвестиции: ${inv.name} на ${totalCost.toLocaleString()} ₽ (счёт: ${targetAccount.name})`;
      }
    }
  } else if (action === 'create_goal' && parsed.goal) {
    const g = parsed.goal;
    if (!g.title || !g.target_amount) {
      replyText = '❌ Не удалось распознать название или сумму цели.';
    } else {
      const createdGoal = await entities.Goal.create({
        title: g.title,
        type: g.type || 'savings',
        target_amount: g.target_amount,
        current_amount: 0,
        currency: g.currency || owner?.currency || 'RUB',
        deadline: g.deadline || undefined,
        priority: g.priority || 'medium',
        user_id: ownerId,
        created_by_id: ownerId,
        family_id: owner?.family_id || undefined,
        visibility: 'private',
        status: 'active'
      });
      await reassignOwnership(entities, 'Goal', createdGoal.id, ownerId, owner?.family_id);
      replyText = `✅ Создал цель: ${g.title} — накопить ${g.target_amount.toLocaleString()} ₽`;
    }
  } else if (action === 'create_budget' && parsed.budget) {
    const b = parsed.budget;
    if (!b.name || !b.limit_amount) {
      replyText = '❌ Не удалось распознать название или лимит бюджета.';
    } else {
      const createdBudget = await entities.Budget.create({
        name: b.name,
        categories: b.categories || [],
        limit_amount: b.limit_amount,
        spent_amount: 0,
        period: b.period || 'monthly',
        currency: b.currency || owner?.currency || 'RUB',
        user_id: ownerId,
        created_by_id: ownerId,
        family_id: owner?.family_id || undefined,
        visibility: 'private',
        is_active: true,
        start_date: new Date().toISOString().split('T')[0]
      });
      await reassignOwnership(entities, 'Budget', createdBudget.id, ownerId, owner?.family_id);
      replyText = `✅ Создал бюджет: ${b.name} — лимит ${b.limit_amount.toLocaleString()} ₽`;
    }
  } else if (action === 'update_transaction' && parsed.transaction_id && parsed.updates) {
    const existing = recentTx.find(t => t.id === parsed.transaction_id);
    if (!existing) {
      replyText = '❌ Не удалось найти указанную операцию. Укажите точный id из списка ваших последних операций.';
    } else {
      const u = parsed.updates;
      const newType = u.type || existing.type;
      const newAmount = u.amount !== undefined ? u.amount : existing.amount;
      const newCategory = u.category || existing.category;

      await applyBalanceDelta(entities, existing.account_id, -effect(existing.type, existing.amount), ownerId);
      if (existing.type === 'expense') await applyBudgetDelta(entities, ownerId, existing.category, -existing.amount, existing.budget_scope);

      await applyBalanceDelta(entities, existing.account_id, effect(newType, newAmount), ownerId);
      if (newType === 'expense') await applyBudgetDelta(entities, ownerId, newCategory, newAmount, existing.budget_scope);

      const updatePayload = {};
      if (u.type) updatePayload.type = u.type;
      if (u.amount !== undefined) updatePayload.amount = u.amount;
      if (u.category) updatePayload.category = u.category;
      if (u.description !== undefined) updatePayload.description = u.description;
      if (u.date) updatePayload.date = u.date;
      await entities.Transaction.update(existing.id, updatePayload);
      replyText = '✅ Операция обновлена';
    }
  } else if (action === 'delete_transaction' && parsed.transaction_id) {
    const existing = recentTx.find(t => t.id === parsed.transaction_id);
    if (!existing) {
      replyText = '❌ Не удалось найти указанную операцию. Укажите точный id из списка ваших последних операций.';
    } else {
      await applyBalanceDelta(entities, existing.account_id, -effect(existing.type, existing.amount), ownerId);
      if (existing.type === 'expense') await applyBudgetDelta(entities, ownerId, existing.category, -existing.amount, existing.budget_scope);
      await entities.Transaction.delete(existing.id);
      replyText = '🗑️ Операция удалена';
    }
  }

  await sendMessage(botToken, chatId, replyText || 'Не удалось обработать сообщение.');

  const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: replyText }].slice(-20);
  await entities.TelegramBotConfig.update(config.id, { chat_history: newHistory });
}

function accountTypeIcon(type) {
  const icons = { cash: '💵', card: '💳', bank_account: '🏦', savings: '🐖', credit: '🔴' };
  return icons[type] || '💳';
}

async function handleBalanceButton({ entities, accounts, ownerId, botToken, chatId }) {
  if (!accounts.length) {
    await sendMessage(botToken, chatId, '❌ Не найдено ни одного счёта. Добавьте счёт в приложении.');
    return;
  }
  const owner = await entities.User.get(ownerId).catch(() => null);
  const currency = createCurrencyTools(owner);
  const totals = currency.summarize(accounts.map(a => ({ amount: a.balance, currency: a.currency })));
  const lines = [
    '💰 <b>Ваши балансы</b>',
    '',
    ...accounts.map(a => `${accountTypeIcon(a.type)} ${a.name}: <code>${currency.format(a.balance, a.currency || currency.profileCurrency)}</code>${a.is_active === false ? ' (неактивен)' : ''}`),
    '──────────────',
    '<b>Разбивка по валютам:</b>',
    ...totals.lines.map(line => `<code>${line}</code>`),
    `<b>📊 Общий баланс:</b> <code>${currency.format(totals.total)}</code>${totals.missing.length ? `\n⚠️ Не включены без курса: ${totals.missing.join(', ')}` : ''}`
  ];
  await sendMessage(botToken, chatId, lines.join('\n'));
}

async function showAnalyticsPeriods(botToken, chatId) {
  await sendMessage(botToken, chatId, 'Выберите период аналитики:', {
    inline_keyboard: [[
      { text: 'Месяц', callback_data: 'analytics:month' },
      { text: 'Квартал', callback_data: 'analytics:quarter' },
      { text: 'Год', callback_data: 'analytics:year' }
    ]]
  });
}

async function handleAnalyticsButton({ entities, ownerId, config, botToken, chatId, period = 'month' }) {
  const timezone = config.timezone || 'Europe/Moscow';
  const owner = await entities.User.get(ownerId).catch(() => null);
  const currency = createCurrencyTools(owner);
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const year = Number(parts.year);
  const month = Number(parts.month) - 1;
  const startMonth = period === 'year' ? 0 : period === 'quarter' ? Math.floor(month / 3) * 3 : month;
  const periodStart = new Date(Date.UTC(year, startMonth, 1));
  const periodEnd = period === 'year' ? new Date(Date.UTC(year + 1, 0, 1)) : period === 'quarter' ? new Date(Date.UTC(year, startMonth + 3, 1)) : new Date(Date.UTC(year, month + 1, 1));
  const myTx = await entities.Transaction.filter({ user_id: ownerId, date: { $gte: periodStart.toISOString(), $lt: periodEnd.toISOString() } });
  const expenses = myTx.filter(t => t.type === 'expense');
  const income = myTx.filter(t => t.type === 'income');
  const totalSpent = currency.summarize(expenses.map(t => ({ amount: t.amount, currency: t.currency }))).total;
  const totalIncome = currency.summarize(income.map(t => ({ amount: t.amount, currency: t.currency }))).total;
  const byCategory = {};
  for (const t of expenses) {
    const converted = currency.convert(t.amount, t.currency || currency.profileCurrency);
    if (converted == null) continue;
    const cat = t.category || 'Другое';
    byCategory[cat] = (byCategory[cat] || 0) + converted;
  }
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const lines = [
    `📊 <b>Аналитика за ${period === 'year' ? 'год' : period === 'quarter' ? 'квартал' : 'месяц'}</b>`, 
    '',
    `💸 Всего расходов: <code>${currency.format(totalSpent)}</code> в ${expenses.length} операциях`,
    `💰 Доход: <code>${currency.format(totalIncome)}</code>`,
    '',
    '<b>Топ-5 категорий:</b>',
    ''
  ];
  for (const [cat, amount] of sorted) {
    const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
    const filled = Math.round(pct / 10);
    lines.push(`${'▓'.repeat(filled)}${'░'.repeat(10 - filled)} <b>${cat}</b> — <code>${currency.format(amount)}</code> (${pct}%)`);
  }
  const budgets = await entities.Budget.filter({ user_id: ownerId });
  const activeBudgets = budgets.filter(b => b.is_active !== false);
  if (activeBudgets.length) {
    const budgetTotals = currency.summarize(activeBudgets.map(b => ({ amount: b.spent_amount, currency: b.currency })));
    lines.push('', '<b>Бюджеты:</b>', '');
    for (const b of activeBudgets.slice(0, 5)) {
      const limit = b.limit_amount || 0;
      const spent = b.spent_amount || 0;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const status = pct >= 150 ? '💥' : pct >= 100 ? '🔴' : pct >= 80 ? '🟠' : '🟢';
      lines.push(`${status} ${b.name}: <code>${currency.format(spent, b.currency || currency.profileCurrency)} / ${currency.format(limit, b.currency || currency.profileCurrency)}</code> (${pct}%)`);
    }
    lines.push('', `<b>Потрачено по бюджетам:</b> <code>${currency.format(budgetTotals.total)}</code>${budgetTotals.missing.length ? ` (без курса: ${budgetTotals.missing.join(', ')})` : ''}`);
  }
  await sendMessage(botToken, chatId, lines.join('\n'));
}

async function handleBudgetCallback({ entities, config, ownerId, telegramUserId, budgetScope, botToken, chatId, callbackQueryId, messageId }) {
  const pending = (config.pending_budget_transactions || []).filter((item) => String(item.telegram_user_id) === String(telegramUserId));
  if (!pending.length) {
    await answerCallbackQuery(botToken, callbackQueryId, 'Операция уже обработана');
    await removeInlineKeyboard(botToken, chatId, messageId);
    return;
  }
  // Обрабатываем первую ожидающую операцию; остальные спросим следующими сообщениями
  const [item, ...rest] = pending;
  await entities.TelegramBotConfig.update(config.id, {
    pending_budget_transactions: [...(config.pending_budget_transactions || []).filter((p) => String(p.telegram_user_id) !== String(telegramUserId)), ...rest]
  });
  const account = await entities.Account.get(item.account_id).catch(() => null);
  if (account) await finalizeTransaction({ entities, config, parsed: item, account, ownerId, telegramUserId, botToken, chatId, budgetScope });
  else await sendMessage(botToken, chatId, 'Счёт для этой операции не найден — запрос устарел.');
  if (rest.length) {
    const next = rest[0];
    await sendMessage(botToken, chatId, `С какого бюджета списать «${next.description || next.category}» — ${next.amount} ${next.currency || ''}?`, {
      inline_keyboard: [[{ text: 'Личный', callback_data: 'budget:personal' }, { text: 'Семейный', callback_data: 'budget:family' }], [{ text: '👥 В оба бюджета', callback_data: 'budget:both' }]]
    });
  }
  await answerCallbackQuery(botToken, callbackQueryId, 'Записано ✅');
  await removeInlineKeyboard(botToken, chatId, messageId);
}

async function handleCategoryCallback({ entities, config, ownerId, telegramUserId, data, botToken, chatId, callbackQueryId, messageId }) {
  const setup = (config.pending_category_setup || []).find((item) => String(item.telegram_user_id) === String(telegramUserId));
  if (!setup) {
    await answerCallbackQuery(botToken, callbackQueryId, 'Настройка уже завершена');
    await removeInlineKeyboard(botToken, chatId, messageId);
    return;
  }
  if (data === 'cat:back') {
    const previousStage = setup.stage === 'category_icon' ? 'category_type' : setup.stage === 'category_color' ? 'category_icon' : 'budget_choice';
    await saveCategorySetup(entities, config, telegramUserId, { ...setup, stage: previousStage });
    if (previousStage === 'category_type') {
      await sendMessage(botToken, chatId, 'Выберите тип категории:', { inline_keyboard: [[{ text: '💸 Расход', callback_data: 'cat:type:expense' }, { text: '💰 Доход', callback_data: 'cat:type:income' }]] });
    } else if (previousStage === 'category_icon') {
      await sendMessage(botToken, chatId, 'Выберите иконку:', { inline_keyboard: [...CATEGORY_ICONS.map(([label, icon]) => [{ text: label, callback_data: `cat:icon:${icon}` }]), [{ text: '← Назад', callback_data: 'cat:back' }]] });
    }
  } else if (data.startsWith('cat:type:')) {
    const categoryType = data.slice(9);
    await saveCategorySetup(entities, config, telegramUserId, { ...setup, stage: 'category_icon', category_type: categoryType });
    await sendMessage(botToken, chatId, 'Выберите иконку:', { inline_keyboard: [...CATEGORY_ICONS.map(([label, icon]) => [{ text: label, callback_data: `cat:icon:${icon}` }]), [{ text: '← Назад', callback_data: 'cat:back' }]] });
  } else if (data.startsWith('cat:icon:')) {
    await saveCategorySetup(entities, config, telegramUserId, { ...setup, stage: 'category_color', icon: data.slice(9) });
    await sendMessage(botToken, chatId, 'Выберите цвет:', { inline_keyboard: [...CATEGORY_COLORS.map(([label, color]) => [{ text: label, callback_data: `cat:color:${color}` }]), [{ text: '← Назад', callback_data: 'cat:back' }]] });
  } else if (data.startsWith('cat:color:')) {
    const owner = await entities.User.get(ownerId).catch(() => null);
    const category = await entities.Category.create({ name: setup.category, type: setup.category_type, icon: setup.icon, color: data.slice(10), family_id: owner?.family_id || undefined, created_by_id: ownerId });
    await reassignOwnership(entities, 'Category', category.id, ownerId, owner?.family_id);
    await showBudgetChoice({ entities, config, setup: { ...setup, stage: 'budget_choice', color: data.slice(10), category_id: category.id }, ownerId, telegramUserId, botToken, chatId });
  } else if (data.startsWith('cat:budget:')) {
    const budget = await entities.Budget.get(data.slice(11));
    if (!budget) return;
    const categories = Array.from(new Set([...(budget.categories || (budget.category ? [budget.category] : [])), setup.category]));
    await entities.Budget.update(budget.id, { categories });
    await completeCategorySetup({ entities, config, setup, ownerId, telegramUserId, botToken, chatId, budgetScope: budget.is_family_budget ? 'family' : 'personal' });
  } else if (data === 'cat:newbudget') {
    await saveCategorySetup(entities, config, telegramUserId, { ...setup, stage: 'budget_name' });
    await sendMessage(botToken, chatId, 'Напишите название нового бюджета:');
  }
  await answerCallbackQuery(botToken, callbackQueryId, 'Готово');
  await removeInlineKeyboard(botToken, chatId, messageId);
}

async function handlePendingCategoryText({ entities, config, ownerId, telegramUserId, botToken, chatId, text }) {
  const setup = (config.pending_category_setup || []).find((item) => String(item.telegram_user_id) === String(telegramUserId));
  if (!setup) return false;
  if (setup.stage === 'budget_name') {
    await saveCategorySetup(entities, config, telegramUserId, { ...setup, stage: 'budget_limit', budget_name: text.trim() });
    await sendMessage(botToken, chatId, 'Укажите месячный лимит бюджета числом:');
    return true;
  }
  if (setup.stage === 'budget_limit') {
    const limit = normalizeAmount(text);
    if (!limit) {
      await sendMessage(botToken, chatId, 'Введите лимит числом, например: 15000');
      return true;
    }
    const owner = await entities.User.get(ownerId).catch(() => null);
    await entities.Budget.create({ name: setup.budget_name || `Бюджет: ${setup.category}`, categories: [setup.category], limit_amount: limit, spent_amount: 0, period: 'monthly', currency: setup.currency || owner?.currency || 'RUB', user_id: ownerId, created_by_id: ownerId, family_id: owner?.family_id || undefined, visibility: 'private', is_active: true, start_date: new Date().toISOString().slice(0, 10) });
    await completeCategorySetup({ entities, config, setup, ownerId, telegramUserId, botToken, chatId, budgetScope: 'personal' });
    return true;
  }
  return false;
}

async function handleOperationsButton({ entities, ownerId, botToken, chatId }) {
  const myTx = (await entities.Transaction.filter({ user_id: ownerId })).slice(0, 10);

  if (!myTx.length) {
    await sendMessage(botToken, chatId, '📋 <b>Последние операции</b>\n\nОпераций пока нет. Отправьте голосовое, фото чека или опишите покупку текстом.');
    return;
  }

  const lines = ['📋 <b>Последние 10 операций</b>', ''];
  for (let i = 0; i < myTx.length; i++) {
    const t = myTx[i];
    const emoji = t.type === 'expense' ? '💸' : t.type === 'income' ? '💰' : '🔄';
    const sign = t.type === 'expense' ? '−' : '+';
    const date = t.date ? new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '';
    const desc = t.description ? ` — ${t.description.length > 30 ? t.description.slice(0, 30) + '…' : t.description}` : '';
    lines.push(`${i + 1}. ${emoji} ${date} <b>${sign}${t.amount.toLocaleString()} ${t.currency || 'RUB'}</b>\n   📂 ${t.category || 'Другое'}${desc}`);
  }

  await sendMessage(botToken, chatId, lines.join('\n'));
}

function mimeAndNameFromDocument(doc) {
  const name = doc.file_name || 'file';
  const mime = doc.mime_type || 'application/octet-stream';
  return { name, mime };
}

export default async function (req) {
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
      const actor = resolveBotActor(config, fromId);
      if (!actor) {
        await answerCallbackQuery(botToken, cq.id, 'Доступ к боту ожидает подтверждения владельца семьи.');
        return Response.json({ ok: true });
      }
      const data = cq.data || '';
      if (data.startsWith('acc:')) {
        const accountId = data.slice(4);
        const ownerId = actor.user_id;
        const accounts = await base44.asServiceRole.entities.Account.filter({ user_id: ownerId });
        const messageId = cq.message?.message_id;
        await handleAccountCallback({ base44, config, accounts, ownerId, telegramUserId: fromId, botToken, chatId, callbackQueryId: cq.id, accountId, messageId });
      } else if (data.startsWith('budget:')) {
        await handleBudgetCallback({ entities: base44.asServiceRole.entities, config, ownerId: actor.user_id, telegramUserId: fromId, budgetScope: data.slice(7), botToken, chatId, callbackQueryId: cq.id, messageId: cq.message?.message_id });
      } else if (data.startsWith('analytics:')) {
        await handleAnalyticsButton({ entities: base44.asServiceRole.entities, ownerId: actor.user_id, config, botToken, chatId, period: data.slice(10) });
        await answerCallbackQuery(botToken, cq.id, 'Готово');
        await removeInlineKeyboard(botToken, chatId, cq.message?.message_id);
      } else if (data.startsWith('cat:')) {
        await handleCategoryCallback({ entities: base44.asServiceRole.entities, config, ownerId: actor.user_id, telegramUserId: fromId, data, botToken, chatId, callbackQueryId: cq.id, messageId: cq.message?.message_id });
      }
      return Response.json({ ok: true });
    }

    const message = update.message;
    if (!message) return Response.json({ ok: true });

    const chatId = message.chat.id;
    const fromId = String(message.from?.id || '');

    const actor = resolveBotActor(config, fromId);
    if (!actor) {
      await savePendingLink(base44.asServiceRole.entities, config, fromId, message.from);
      await sendMessage(botToken, chatId, 'Запрос на доступ отправлен владельцу семьи. После подтверждения напишите /start ещё раз.');
      return Response.json({ ok: true });
    }

    const ownerId = actor.user_id;
    const accounts = await base44.asServiceRole.entities.Account.filter({ user_id: ownerId });
    let account = accounts.find((item) => item.id === config.default_account_id) || accounts[0];
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
      await handleTextMessage({ base44, config, account, accounts, ownerId, telegramUserId: fromId, botToken, chatId, text: transcript.trim() });
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

      await finalizeOrAskAccount({ entities, config, accounts, transactions: [parsed], ownerId, telegramUserId: fromId, botToken, chatId });
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

      await finalizeOrAskAccount({ entities, config, accounts, transactions, ownerId, telegramUserId: fromId, botToken, chatId });
      return Response.json({ ok: true });
    }

    // Текстовое сообщение — полноценный AI-чат (вопросы, отчёты, создание/правка/удаление операций)
    if (message.text) {
      const text = message.text.trim();

      if (text === '/start') {
        await sendMessage(botToken, chatId, 'Привет! 👋 Я твой финансовый ассистент.\n\nОтравь голосовое, фото чека, PDF/CSV выписку или просто опиши покупку текстом — и я всё запишу.\n\nИспользуй кнопки внизу для быстрого доступа:\n💰 <b>Баланс</b> — остатки по всем счетам\n📊 <b>Аналитика</b> — расходы за месяц по категориям\n📋 <b>Операции</b> — последние 10 транзакций');
        return Response.json({ ok: true });
      }

      if (['/cancel', 'отмена', 'отменить'].includes(text.toLowerCase())) {
        await cancelPending(entities, config, fromId);
        await sendMessage(botToken, chatId, '🧹 Все ожидающие операции отменены. Можно отправлять новые.');
        return Response.json({ ok: true });
      }

      // Обработка кнопок основной клавиатуры — до AI, чтобы не тратить LLM-вызовы
      // Запросы о балансе/статусе счетов — сразу полный список всех счетов, без AI
      const lower = text.toLowerCase();
      const isBalanceQuery = !/\d/.test(lower) && /(баланс|сч[её]т|остат|сколько.*денег)/.test(lower);
      if (text === '💰 Баланс' || isBalanceQuery) {
        await handleBalanceButton({ entities, accounts, ownerId, botToken, chatId });
        return Response.json({ ok: true });
      }
      if (text === '📊 Аналитика') {
        await showAnalyticsPeriods(botToken, chatId);
        return Response.json({ ok: true });
      }
      if (text === '📋 Операции') {
        await handleOperationsButton({ entities, ownerId, botToken, chatId });
        return Response.json({ ok: true });
      }

      if (await handlePendingCategoryText({ entities, config, ownerId, telegramUserId: fromId, botToken, chatId, text })) {
        return Response.json({ ok: true });
      }

      if (looksLikeExpenseReport(text)) {
        const report = await buildExpenseReport({ base44, entities, ownerId, timezone: config.timezone || 'Europe/Moscow', text });
        if (report) {
          await sendMessage(botToken, chatId, report);
          const history = (config.chat_history || []).slice(-10);
          await entities.TelegramBotConfig.update(config.id, { chat_history: [...history, { role: 'user', content: text }, { role: 'assistant', content: report }].slice(-20) });
          return Response.json({ ok: true });
        }
      }

      try {
        await handleTextMessage({ base44, config, account, accounts, ownerId, telegramUserId: fromId, botToken, chatId, text: message.text });
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
}