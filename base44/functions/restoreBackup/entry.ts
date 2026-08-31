import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  backupUser,
  BACKUP_ENTITIES,
  downloadBackupFile,
} from '../../shared/cloudBackup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { backup_id, selected_entities } = body;

    if (!backup_id || !selected_entities || !Array.isArray(selected_entities) || selected_entities.length === 0) {
      return Response.json({ error: 'backup_id and selected_entities required' }, { status: 400 });
    }

    const backup = await base44.entities.BackupRecord.get(backup_id);
    if (!backup || backup.user_id !== user.id) {
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Create pre-restore snapshot
    const preRestoreResult = await backupUser(base44, user.id, true);

    // Download the backup file from Drive
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const backupContent = await downloadBackupFile(accessToken, backup.file_id);
    const backupData = JSON.parse(backupContent);

    // Restore selected entities
    const results = {};
    for (const entityKey of selected_entities) {
      const entity = BACKUP_ENTITIES.find((e) => e.key === entityKey);
      if (!entity) continue;

      // Delete current records for this user
      await base44.asServiceRole.entities[entity.name].deleteMany({
        [entity.userField]: user.id,
      });

      // Create from snapshot
      const records = backupData.data[entityKey] || [];
      if (records.length > 0) {
        const cleanRecords = records.map((r) => {
          const { id, created_date, updated_date, created_by_id, ...rest } = r;
          return rest;
        });
        await base44.asServiceRole.entities[entity.name].bulkCreate(cleanRecords);
      }
      results[entityKey] = { restored: records.length };
    }

    return Response.json({ success: true, results, pre_restore: preRestoreResult });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}