import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // === CASE 2: Finalize — account selected by user, create transaction now ===
        if (body.account_id && body.parsed) {
            const { parsed, account_id } = body;
            const amount = parsed.amount;

            const transaction = await base44.asServiceRole.entities.Transaction.create({
                type: parsed.type,
                amount,
                currency: parsed.currency || 'RUB',
                category: parsed.category,
                description: parsed.description,
                date: parsed.date || new Date().toISOString(),
                account_id,
                user_id: user.id
            });

            // Update account balance
            const account = await base44.asServiceRole.entities.Account.get(account_id);
            if (account) {
                if (parsed.type === 'expense') {
                    await base44.asServiceRole.entities.Account.update(account_id, {
                        balance: account.balance - amount
                    });
                } else {
                    await base44.asServiceRole.entities.Account.update(account_id, {
                        balance: account.balance + amount
                    });
                }
            }

            // Update matching budget for expenses (only user's own budgets)
            if (parsed.type === 'expense' && parsed.category) {
                const budgets = await base44.asServiceRole.entities.Budget.filter({ is_active: true, user_id: user.id });
                for (const budget of budgets) {
                    const cats = budget.categories?.length > 0
                        ? budget.categories
                        : budget.category ? [budget.category] : [];
                    if (cats.includes(parsed.category)) {
                        await base44.asServiceRole.entities.Budget.update(budget.id, {
                            spent_amount: (budget.spent_amount || 0) + amount
                        });
                    }
                }
            }

            return Response.json({ success: true, transaction, parsed });
        }

        // === CASE 1: Initial — transcribe audio and extract data ===
        const { audio_url } = body;
        if (!audio_url) {
            return Response.json({ error: 'audio_url is required' }, { status: 400 });
        }

        // 1. Transcribe audio
        const transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });
        if (!transcript) {
            return Response.json({ error: 'Could not transcribe audio' }, { status: 400 });
        }

        // 2. Extract transaction data + account name via LLM
        const today = new Date().toISOString().split('T')[0];
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Ты финансовый ассистент. Извлеки данные о транзакции из следующего текста на русском языке.
            
Текст: "${transcript}"
Сегодняшняя дата: ${today}

Правила:
- type: "expense" если это расход/потратил/купил/заплатил, "income" если это доход/получил/заработал/пришло
- amount: только число (без валюты)
- currency: "RUB" по умолчанию, если упомянуто "доллар" → "USD", "евро" → "EUR"
- category: выбери наиболее подходящую из списка: "Еда и рестораны", "Транспорт", "Здоровье", "Развлечения", "Одежда", "ЖКХ", "Связь", "Образование", "Зарплата", "Другое"
- description: краткое описание транзакции (1-5 слов)
- date: дата в формате YYYY-MM-DDT00:00:00.000Z (сегодня если не указана другая)
- account_hint: если пользователь упомянул счёт/карту/кошелёк (например "с карты", "с наличных", "на зарплатную", "с кредитки"), извлеки это как ключевое слово (1-3 слова). Если не упомянуто — оставь пустой строкой.

Если не удалось распознать сумму — верни error: "Не удалось распознать сумму"`,
            response_json_schema: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["expense", "income"] },
                    amount: { type: "number" },
                    currency: { type: "string" },
                    category: { type: "string" },
                    description: { type: "string" },
                    date: { type: "string" },
                    account_hint: { type: "string" },
                    error: { type: "string" }
                }
            }
        });

        if (result.error) {
            return Response.json({ error: result.error, transcript });
        }

        // 3. Try to match account_hint to user's accounts
        let matchedAccountId = null;
        if (result.account_hint && result.account_hint.trim()) {
            const accounts = await base44.asServiceRole.entities.Account.filter({
                user_id: user.id
            });
            const hint = result.account_hint.toLowerCase();
            // Match by name contains or common keywords
            for (const acc of accounts) {
                const accName = (acc.name || '').toLowerCase();
                if (accName.includes(hint) || hint.includes(accName)) {
                    matchedAccountId = acc.id;
                    break;
                }
                // Keyword matching
                if ((hint.includes('карт') || hint.includes('card')) && acc.type === 'card') {
                    matchedAccountId = acc.id;
                    break;
                }
                if ((hint.includes('налич') || hint.includes('cash')) && acc.type === 'cash') {
                    matchedAccountId = acc.id;
                    break;
                }
                if (hint.includes('кредит') && acc.type === 'credit') {
                    matchedAccountId = acc.id;
                    break;
                }
            }
        }

        // 4. If account matched — create transaction immediately
        if (matchedAccountId) {
            const transaction = await base44.asServiceRole.entities.Transaction.create({
                type: result.type,
                amount: result.amount,
                currency: result.currency || 'RUB',
                category: result.category,
                description: result.description,
                date: result.date || new Date().toISOString(),
                account_id: matchedAccountId,
                user_id: user.id
            });

            // Update account balance
            const account = await base44.asServiceRole.entities.Account.get(matchedAccountId);
            if (account) {
                if (result.type === 'expense') {
                    await base44.asServiceRole.entities.Account.update(matchedAccountId, {
                        balance: account.balance - result.amount
                    });
                } else {
                    await base44.asServiceRole.entities.Account.update(matchedAccountId, {
                        balance: account.balance + result.amount
                    });
                }
            }

            // Update budget for expenses (only user's own budgets)
            if (result.type === 'expense' && result.category) {
                const budgets = await base44.asServiceRole.entities.Budget.filter({ is_active: true, user_id: user.id });
                for (const budget of budgets) {
                    const cats = budget.categories?.length > 0
                        ? budget.categories
                        : budget.category ? [budget.category] : [];
                    if (cats.includes(result.category)) {
                        await base44.asServiceRole.entities.Budget.update(budget.id, {
                            spent_amount: (budget.spent_amount || 0) + result.amount
                        });
                    }
                }
            }

            return Response.json({
                success: true,
                transaction,
                transcript,
                parsed: result
            });
        }

        // 5. No account matched — return parsed data, let frontend ask user
        return Response.json({
            needs_account: true,
            transcript,
            parsed: result
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});