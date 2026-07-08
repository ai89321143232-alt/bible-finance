import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Простая генерация XLSX через XML (Office Open XML)
function generateXlsx(sheets) {
    const escapeXml = (val) => String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const sharedStrings = [];
    const strIndex = {};
    const getStrIdx = (val) => {
        const s = escapeXml(val);
        if (strIndex[s] === undefined) {
            strIndex[s] = sharedStrings.length;
            sharedStrings.push(s);
        }
        return strIndex[s];
    };

    const colLetter = (idx) => {
        let s = '';
        let n = idx + 1;
        while (n > 0) {
            const r = (n - 1) % 26;
            s = String.fromCharCode(65 + r) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    };

    const sheetsXml = sheets.map((sheet, si) => {
        const rows = sheet.data.map((row, ri) => {
            const cells = row.map((cell, ci) => {
                const ref = `${colLetter(ci)}${ri + 1}`;
                if (typeof cell === 'number') {
                    return `<c r="${ref}" t="n"><v>${cell}</v></c>`;
                }
                const idx = getStrIdx(cell);
                return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
            }).join('');
            return `<row r="${ri + 1}">${cells}</row>`;
        }).join('');
        return { name: sheet.name, xml: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>` };
    });

    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${sharedStrings.map(s => `<si><t xml:space="preserve">${s}</t></si>`).join('')}</sst>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetsXml.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 2}"/>`).join('')}</sheets></workbook>`;

    const workbookRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>${sheetsXml.map((s, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>${sheetsXml.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;

    const relsRoot = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

    // Сборка ZIP вручную (stored, без сжатия)
    const enc = new TextEncoder();
    const files = [
        { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
        { name: '_rels/.rels', data: enc.encode(relsRoot) },
        { name: 'xl/workbook.xml', data: enc.encode(workbookXml) },
        { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRels) },
        { name: 'xl/sharedStrings.xml', data: enc.encode(sharedStringsXml) },
        ...sheetsXml.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(s.xml) }))
    ];

    const crc32 = (buf) => {
        let crc = 0xFFFFFFFF;
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[i] = c;
        }
        for (const byte of buf) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const u16 = (n) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; };
    const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };
    const concat = (...arrs) => { const total = arrs.reduce((s, a) => s + a.length, 0); const out = new Uint8Array(total); let off = 0; for (const a of arrs) { out.set(a, off); off += a.length; } return out; };

    const nameEnc = new TextEncoder();
    const localHeaders = [];
    const centralDirs = [];
    let offset = 0;

    for (const file of files) {
        const nameBytes = nameEnc.encode(file.name);
        const crc = crc32(file.data);
        const size = file.data.length;
        const local = concat(
            new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
            u16(20), u16(0), u16(0),
            u16(0), u16(0),
            u32(crc), u32(size), u32(size),
            u16(nameBytes.length), u16(0),
            nameBytes, file.data
        );
        const central = concat(
            new Uint8Array([0x50, 0x4B, 0x01, 0x02]),
            u16(20), u16(20), u16(0), u16(0),
            u16(0), u16(0),
            u32(crc), u32(size), u32(size),
            u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
            u32(0), u32(offset),
            nameBytes
        );
        localHeaders.push(local);
        centralDirs.push(central);
        offset += local.length;
    }

    const centralStart = offset;
    const centralData = concat(...centralDirs);
    const eocd = concat(
        new Uint8Array([0x50, 0x4B, 0x05, 0x06]),
        u16(0), u16(0),
        u16(files.length), u16(files.length),
        u32(centralData.length), u32(centralStart),
        u16(0)
    );

    return concat(...localHeaders, centralData, eocd);
}

function escapeHtml(val) {
    return String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Поддерживаем вызов и из автоматизации (без user), и из фронтенда (с user)
        let user = null;
        try { user = await base44.auth.me(); } catch (_) {}

        // Период: прошлый месяц
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [transactions, budgets, accounts] = await Promise.all([
            base44.asServiceRole.entities.Transaction.list('-date', 2000),
            base44.asServiceRole.entities.Budget.list(),
            base44.asServiceRole.entities.Account.list(),
        ]);

        // Фильтруем транзакции за прошлый месяц
        const monthTxns = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= firstDay && d <= lastDay;
        });

        const monthLabel = firstDay.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

        // --- Лист 1: Сводка по бюджетам ---
        const budgetRows = [['Бюджет', 'Категории', 'Лимит (₽)', 'Потрачено (₽)', 'Остаток (₽)', 'Использовано %', 'Статус']];
        for (const b of budgets) {
            const cats = (b.categories || (b.category ? [b.category] : [])).join(', ');
            const spent = b.spent_amount || 0;
            const limit = b.limit_amount || 0;
            const rest = limit - spent;
            const pct = limit > 0 ? Math.round(spent / limit * 100) : 0;
            const status = pct >= 100 ? 'ПРЕВЫШЕН' : pct >= 80 ? 'Близко к лимиту' : 'В норме';
            budgetRows.push([b.name, cats, limit, spent, rest, pct, status]);
        }

        // --- Лист 2: Транзакции за месяц ---
        const txnRows = [['Дата', 'Тип', 'Категория', 'Подкатегория', 'Сумма (₽)', 'Описание']];
        for (const t of monthTxns) {
            const date = new Date(t.date).toLocaleDateString('ru-RU');
            const type = t.type === 'income' ? 'Доход' : t.type === 'expense' ? 'Расход' : 'Перевод';
            txnRows.push([date, type, t.category || '', t.subcategory || '', t.amount || 0, t.description || '']);
        }

        // --- Лист 3: Расходы по категориям ---
        const catMap = {};
        for (const t of monthTxns.filter(t => t.type === 'expense')) {
            const cat = t.category || 'Без категории';
            catMap[cat] = (catMap[cat] || 0) + (t.amount || 0);
        }
        const catRows = [['Категория', 'Сумма расходов (₽)', 'Доля %']];
        const totalExpense = Object.values(catMap).reduce((s, v) => s + v, 0);
        for (const [cat, sum] of Object.entries(catMap).sort((a, b) => b[1] - a[1])) {
            const pct = totalExpense > 0 ? Math.round(sum / totalExpense * 100) : 0;
            catRows.push([cat, Math.round(sum), pct]);
        }

        // --- Лист 4: Счета ---
        const accRows = [['Счёт', 'Тип', 'Баланс (₽)', 'Валюта']];
        for (const a of accounts) {
            const type = { cash: 'Наличные', card: 'Карта', bank_account: 'Банк', savings: 'Накопления', credit: 'Кредит' }[a.type] || a.type;
            accRows.push([a.name, type, a.balance || 0, a.currency || 'RUB']);
        }

        const xlsxBytes = generateXlsx([
            { name: `Бюджеты - ${monthLabel}`, data: budgetRows },
            { name: 'Транзакции', data: txnRows },
            { name: 'По категориям', data: catRows },
            { name: 'Счета', data: accRows },
        ]);

        // Если вызов из фронтенда — вернуть файл для скачивания
        const accept = req.headers.get('accept') || '';
        if (accept.includes('application/octet-stream') || accept.includes('*/*')) {
            const fileName = `Семейный_отчет_${firstDay.toISOString().slice(0, 7)}.xlsx`;
            return new Response(xlsxBytes, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                }
            });
        }

        // Из автоматизации или обычного вызова — отправить email отчёт
        const totalIncome = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

        const overBudget = budgets.filter(b => (b.spent_amount || 0) > (b.limit_amount || 0));
        const nearLimit = budgets.filter(b => {
            const pct = b.limit_amount > 0 ? (b.spent_amount || 0) / b.limit_amount : 0;
            return pct >= 0.8 && pct < 1;
        });

        let emailBody = `<h2>Ежемесячный финансовый отчёт — ${monthLabel}</h2>`;
        emailBody += `<h3>📊 Сводка</h3>`;
        emailBody += `<ul><li>Доходы: <b>₽${Math.round(totalIncome).toLocaleString('ru-RU')}</b></li>`;
        emailBody += `<li>Расходы: <b>₽${Math.round(totalExpenses).toLocaleString('ru-RU')}</b></li>`;
        emailBody += `<li>Баланс: <b>₽${Math.round(totalIncome - totalExpenses).toLocaleString('ru-RU')}</b></li></ul>`;

        emailBody += `<h3>💰 Бюджеты</h3><table border="1" cellpadding="6" style="border-collapse:collapse">`;
        emailBody += `<tr><th>Бюджет</th><th>Лимит</th><th>Потрачено</th><th>%</th><th>Статус</th></tr>`;
        for (const b of budgets) {
            const spent = b.spent_amount || 0;
            const limit = b.limit_amount || 0;
            const pct = limit > 0 ? Math.round(spent / limit * 100) : 0;
            const status = pct >= 100 ? '🔴 Превышен' : pct >= 80 ? '🟡 Близко' : '🟢 Норма';
            const color = pct >= 100 ? '#ffe0e0' : pct >= 80 ? '#fff3cd' : '#e8f5e9';
            emailBody += `<tr style="background:${color}"><td>${escapeHtml(b.name)}</td><td>₽${Math.round(limit).toLocaleString('ru-RU')}</td><td>₽${Math.round(spent).toLocaleString('ru-RU')}</td><td>${pct}%</td><td>${status}</td></tr>`;
        }
        emailBody += `</table>`;

        if (overBudget.length > 0) {
            emailBody += `<p>⚠️ <b>Превышены лимиты:</b> ${overBudget.map(b => b.name).join(', ')}</p>`;
        }

        emailBody += `<h3>📂 Расходы по категориям</h3><table border="1" cellpadding="6" style="border-collapse:collapse">`;
        emailBody += `<tr><th>Категория</th><th>Сумма</th><th>Доля</th></tr>`;
        for (const [cat, sum] of Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
            const pct = totalExpenses > 0 ? Math.round(sum / totalExpenses * 100) : 0;
            emailBody += `<tr><td>${escapeHtml(cat)}</td><td>₽${Math.round(sum).toLocaleString('ru-RU')}</td><td>${pct}%</td></tr>`;
        }
        emailBody += `</table>`;
        emailBody += `<p style="color:#888;font-size:12px">Отчёт сформирован автоматически. Для детального Excel-отчёта перейдите в приложение.</p>`;

        // Отправляем email владельцу или текущему пользователю
        const emailTo = user?.email || null;
        if (emailTo) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: emailTo,
                subject: `Ежемесячный отчёт — ${monthLabel}`,
                body: emailBody,
                from_name: 'Библия Финансов'
            });
        }

        return Response.json({
            success: true,
            month: monthLabel,
            totalIncome: Math.round(totalIncome),
            totalExpenses: Math.round(totalExpenses),
            budgetsOverLimit: overBudget.map(b => b.name),
            budgetsNearLimit: nearLimit.map(b => b.name),
            emailSent: !!emailTo
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});