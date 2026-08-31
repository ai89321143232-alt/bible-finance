import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { backupUser } from '../../shared/cloudBackup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Cron mode: backup all users with changes since last backup
    if (body.all) {
      const users = await base44.asServiceRole.entities.User.list();
      const results = [];
      for (const user of users) {
        try {
          const lastBackups = await base44.asServiceRole.entities.BackupRecord.filter({
            user_id: user.id,
            is_pre_restore: false,
          });
          const lastBackup = lastBackups
            .sort((a, b) => new Date(b.backup_date) - new Date(a.backup_date))[0];

          if (lastBackup) {
            const hoursSince =
              (Date.now() - new Date(lastBackup.backup_date).getTime()) / 3600000;
            if (hoursSince < 20) {
              results.push({ user: user.id, skipped: 'recent_backup' });
              continue;
            }
          }

          const result = await backupUser(base44, user.id);
          results.push({ user: user.id, ...result });
        } catch (e) {
          results.push({ user: user.id, error: e.message });
        }
      }
      return Response.json({ results });
    }

    // Manual mode: backup current user
    let userId = body.user_id;
    if (!userId) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      userId = user.id;
    }

    const result = await backupUser(base44, userId);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}