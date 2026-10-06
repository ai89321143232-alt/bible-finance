import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import * as XLSX from 'npm:xlsx@0.18.5';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'Не указан URL файла.' }, { status: 400 });

    const res = await fetch(file_url);
    if (!res.ok) return Response.json({ error: 'Не удалось скачать файл.' }, { status: 502 });

    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return Response.json({ headers, rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}