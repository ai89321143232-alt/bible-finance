import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { backupUser, collectSnapshotsForUsers } from '../../shared/cloudBackup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Cron mode: backup all users with changes since last backup
    if (body.all) {
      const caller = await base44.auth.me().catch(() => null);
      if (caller && caller.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const users = await base44.asServiceRole.entities.User.list();
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayBackups = await base44.asServiceRole.entities.BackupRecord.filter({
        is_pre_restore: false,
        kind: { $ne: 'full_app' },
        backup_date: { $gte: todayStart.toISOString() },
      }, '-backup_date', 5000);
      const doneToday = new Set(todayBackups.map((b) => b.user_id));
      const pending = users.filter((u) => !doneToday.has(u.id));
      const snapshots = pending.length
        ? await collectSnapshotsForUsers(base44, pending.map((u) => u.id))
        : new Map();
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

      const results = [];
      for (const user of users) {
        try {
          if (doneToday.has(user.id)) {
            results.push({ user: user.id, skipped: 'already_today' });
            continue;
          }
          const r = await backupUser(base44, user.id, false, snapshots.get(user.id), accessToken);
          results.push({ user: user.id, skipped: r.skipped, reason: r.reason, file: r.record?.file_name, total: r.record?.total_records });
        } catch (e) {
          console.error(`[createBackup] user ${user.id}: ${e.message}`);
          results.push({ user: user.id, error: e.message });
        }
      }
      const created = results.filter((r) => r.skipped === false).length;
      const failed = results.filter((r) => r.error).length;
      console.log(`[createBackup] users=${users.length} created=${created} failed=${failed}`);
      return Response.json({ users: users.length, created, failed, results });
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