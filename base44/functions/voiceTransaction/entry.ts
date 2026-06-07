import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { audio_url } = await req.json();
        if (!audio_url) {
            return Response.json({ error: 'audio_url is required' }, { status: 400 });
        }

        // 1. Транскрибируем аудио
        const transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });

        if (!transcript) {
            return Response.json({ error: 'Could not transcribe audio' }, { status: 400 });
        }

        // 2. Извлекаем данные транзакции из текста через LLM
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
                    error: { type: "string" }
                }
            }
        });

        if (result.error) {
            return Response.json({ error: result.error, transcript });
        }

        // 3. Создаём транзакцию
        const transaction = await base44.entities.Transaction.create({
            type: result.type,
            amount: result.amount,
            currency: result.currency || 'RUB',
            category: result.category,
            description: result.description,
            date: result.date || new Date().toISOString(),
            user_id: user.id
        });

        return Response.json({ 
            success: true,
            transaction,
            transcript,
            parsed: result
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});