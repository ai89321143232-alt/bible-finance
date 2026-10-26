import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildPortableSnapshot } from '../../shared/portableBackup.ts';
import { getOrCreateDriveFolder, uploadBackupFile, computeChecksum } from '../../shared/cloudBackup.ts';

// Полный переносимый бэкап всех данных приложения.
// mode: "drive" (по умолчанию, ежедневный workflow) — сохраняет JSON на Google Диск владельца;
// mode: "download" — возвращает JSON для скачивания.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'download' ? 'download' : 'drive';

    const { content, counts, total } = await buildPortableSnapshot(base44);
    const json = JSON.stringify(content);
    const now = new Date();
    const fileName = `BibleFinance_Full_${now.toISOString().split('T')[0]}_${now.getTime()}.json`;

    if (mode === 'download') {
      return Response.json({ file_name: fileName, total, counts, content });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const folderId = await getOrCreateDriveFolder(accessToken, 'bible_finance_full_backup');
    const file = await uploadBackupFile(accessToken, folderId, fileName, json);

    const record = await base44.asServiceRole.entities.BackupRecord.create({
      provider: 'googledrive',
      kind: 'full_app',
      file_id: file.id,
      file_name: fileName,
      backup_date: now.toISOString(),
      checksum: computeChecksum(json),
      entity_counts: counts,
      total_records: total,
      is_pre_restore: false,
      user_id: user.id,
    });

    return Response.json({ success: true, record_id: record.id, file_name: fileName, total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}