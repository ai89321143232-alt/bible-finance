import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const body = await req.json();
        const { event, data } = body;

        // Не доверяем полям из тела (data.id/description/amount/type) —
        // внешний злоумышленник мог бы подделать их, чтобы перезаписать категорию
        // чужой транзакции. Определяем транзакцию по event.entity_id и берём
        // description/type из реальной записи БД.
        const entityId = event?.entity_id || data?.id;
        if (!entityId) {
            return Response.json({ skipped: true, reason: 'no entity_id' });
        }

        const txn = await base44.asServiceRole.entities.Transaction.get(entityId).catch(() => null);
        if (!txn) {
            return Response.json({ skipped: true, reason: 'transaction not found' });
        }

        if (txn.category) {
            // Уже есть категория — пропускаем
            return Response.json({ skipped: true });
        }

        if (txn.type !== 'expense') {
            // Категоризируем только расходы
            return Response.json({ skipped: true, reason: 'not an expense' });
        }

        // Получаем все бюджеты для определения доступных категорий
        const budgets = await base44.asServiceRole.entities.Budget.list();
        const budgetCategories = [];
        for (const b of budgets) {
            if (b.categories && Array.isArray(b.categories)) {
                for (const cat of b.categories) {
                    if (!budgetCategories.includes(cat)) budgetCategories.push(cat);
                }
            }
            if (b.category && !budgetCategories.includes(b.category)) {
                budgetCategories.push(b.category);
            }
            if (b.name && !budgetCategories.includes(b.name)) {
                budgetCategories.push(b.name);
            }
        }

        // Стандартные категории как фолбэк
        const defaultCategories = [
            'Продукты', 'Рестораны и кафе', 'Транспорт', 'Такси', 'Бензин',
            'ЖКХ', 'Связь и интернет', 'Здоровье и аптека', 'Одежда и обувь',
            'Развлечения', 'Образование', 'Путешествия', 'Спорт', 'Красота',
            'Электроника', 'Дом и ремонт', 'Подарки', 'Дети', 'Животные', 'Другое'
        ];

        const allCategories = budgetCategories.length > 0
            ? budgetCategories
            : defaultCategories;

        const description = txn.description || '';
        const amount = txn.amount || 0;

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Ты помощник по личным финансам. Определи категорию расхода.

Описание расхода: "${description}"
Сумма: ${amount} руб.

Доступные категории: ${allCategories.join(', ')}

Выбери ОДНУ наиболее подходящую категорию из списка выше. Если ни одна не подходит точно, выбери "Другое".
Верни только название категории, без лишних слов.`,
            response_json_schema: {
                type: "object",
                properties: {
                    category: { type: "string" }
                }
            }
        });

        const category = result?.category;
        if (!category) {
            return Response.json({ skipped: true, reason: 'no category returned' });
        }

        // Обновляем ту же найденную запись — ID из БД, не из тела
        await base44.asServiceRole.entities.Transaction.update(txn.id, { category });

        return Response.json({ success: true, category });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});