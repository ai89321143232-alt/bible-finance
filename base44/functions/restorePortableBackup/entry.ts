import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { validatePortable, restorePortable } from '../../shared/portableBackup.ts';

// Восстановление из загруженного JSON-файла полного бэкапа (добавляет записи, не удаляя текущие).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { file_uri } = await req.json().catch(() => ({}));
    if (!file_uri) return Response.json({ error: 'file_uri is required' }, { status: 400 });

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
    const res = await fetch(signed_url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return Response.json({ error: 'Не удалось прочитать файл' }, { status: 400 });

    let data;
    try {
      data = JSON.parse(await res.text());
    } catch {
      return Response.json({ error: 'Файл не является корректным JSON' }, { status: 400 });
    }
    const invalid = validatePortable(data);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    const report = await restorePortable(base44, data, user.id);
    return Response.json({ success: true, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}