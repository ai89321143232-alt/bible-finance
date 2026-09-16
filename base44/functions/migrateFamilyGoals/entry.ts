import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const [goals, families, workspaces] = await Promise.all([
      svc.entities.Goal.list(),
      svc.entities.Family.list(),
      svc.entities.Workspace.list(),
    ]);

    const familyForUser = (userId) => families.find((family) =>
      family.owner_id === userId || family.members?.some((member) => member.user_id === userId)
    );
    const updates = [];

    for (const goal of goals) {
      if (!goal.is_family_goal) continue;
      const ownerId = goal.created_by_id || goal.user_id;
      const family = goal.family_id
        ? families.find((item) => item.id === goal.family_id)
        : familyForUser(ownerId);
      if (!family) continue;

      const workspace = workspaces.find((item) => item.type === 'family' && item.family_id === family.id);
      const memberIds = [family.owner_id, ...(family.members || []).map((member) => member.user_id)].filter(Boolean);
      const shareWith = [...new Set([...(goal.share_with || []), ...memberIds])];
      const patch = {};

      if (goal.family_id !== family.id) patch.family_id = family.id;
      if (goal.visibility !== 'shared') patch.visibility = 'shared';
      if (workspace && goal.workspace_id !== workspace.id) patch.workspace_id = workspace.id;
      if (shareWith.length !== (goal.share_with || []).length) patch.share_with = shareWith;
      if (Object.keys(patch).length > 0) updates.push({ id: goal.id, ...patch });
    }

    if (updates.length > 0) await svc.entities.Goal.bulkUpdate(updates);

    const repairedGoals = goals.map((goal) => {
      const patch = updates.find((item) => item.id === goal.id);
      return patch ? { ...goal, ...patch } : goal;
    });
    const grouped = new Map();
    for (const goal of repairedGoals.filter((item) => item.is_family_goal && item.family_id)) {
      const ownerId = goal.created_by_id || goal.user_id || '';
      const key = `${goal.family_id}::${ownerId}::${goal.title.trim().toLowerCase()}`;
      const group = grouped.get(key) || [];
      group.push(goal);
      grouped.set(key, group);
    }

    const duplicateIds = [];
    for (const group of grouped.values()) {
      group.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
      duplicateIds.push(...group.slice(1).map((goal) => goal.id));
    }
    await Promise.all(duplicateIds.map((id) => svc.entities.Goal.delete(id)));

    return Response.json({ success: true, updated: updates.length, duplicates_deleted: duplicateIds.length });
  } catch (error) {
    console.error('migrateFamilyGoals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}