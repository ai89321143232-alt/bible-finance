import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const service = base44.asServiceRole.entities;
    const entities = ['Investment', 'Goal', 'DebtAccount', 'FixedAsset'];
    const migrated = {};
    for (const name of entities) {
      const result = await service[name].updateMany({ scope: { $exists: false } }, { $set: { scope: 'personal' } });
      migrated[name] = result?.modified_count || result?.count || 0;
    }
    const investments = await service.Investment.list();
    const repairs = investments.filter((item) => item.user_id && item.created_by_id !== item.user_id);
    if (repairs.length) await service.Investment.bulkUpdate(repairs.map((item) => ({ id: item.id, created_by_id: item.user_id })));
    return Response.json({ migrated, repairedInvestments: repairs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}