import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// resolveWorkspace — СЕРВЕРНЫЙ GUARD (ЭТАП 3)
// ============================================================
// Определяет workspace_id на СЕРВЕРЕ по авторизованному пользователю.
// Клиент НЕ передаёт workspace_id — он не может его подделать.
//
// Вход (payload):
//   scope: 'personal' | 'family'  (по умолчанию 'personal')
//
// Выход:
//   { workspace_id, visibility, type }
//
// Логика:
//   scope='family' + пользователь в семье → family workspace + shared
//   иначе                                 → personal workspace + private
//
// Функция идемпотентно гарантирует наличие пространств: если их нет,
// вызывает provisionWorkspaces. Всегда возвращает валидный workspace_id.
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const scope = body.scope === 'family' ? 'family' : 'personal';
    const requestedWorkspaceId = body.workspace_id || null;

    const svc = base44.asServiceRole;
    const families = await svc.entities.Family.list();
    const currentFamily = families.find((family) =>
      family.owner_id === user.id || family.members?.some((member) => member.user_id === user.id)
    );
    const familyId = user.family_id || currentFamily?.id || null;

    const loadWorkspaces = async () => {
      const memberships = await svc.entities.WorkspaceMember.filter({ user_id: user.id });
      const wsIds = memberships.map((m) => m.workspace_id);
      if (wsIds.length === 0) return [];
      const allWs = await svc.entities.Workspace.list();
      return allWs.filter((w) => wsIds.includes(w.id));
    };

    let myWs = await loadWorkspaces();

    // Если пространств нет — провижн и повторная загрузка
    if (myWs.length === 0) {
      await base44.functions.invoke('provisionWorkspaces', {});
      myWs = await loadWorkspaces();
    }

    const personal = myWs.find((w) => w.type === 'personal');
    const family = myWs.find((w) => w.type === 'family' && w.family_id === familyId);

    // Приоритет: явно выбранное активное пространство (если пользователь его член)
    if (requestedWorkspaceId) {
      const chosen = myWs.find((w) => w.id === requestedWorkspaceId);
      if (chosen) {
        return Response.json({
          workspace_id: chosen.id,
          visibility: chosen.type === 'family' ? 'shared' : 'private',
          type: chosen.type,
          family_id: chosen.type === 'family' ? (chosen.family_id || user.family_id || null) : null
        });
      }
    }

    if (scope === 'family' && familyId && family) {
      return Response.json({
        workspace_id: family.id,
        visibility: 'shared',
        type: 'family',
        family_id: familyId
      });
    }

    if (!personal) {
      return Response.json({ error: 'No personal workspace found' }, { status: 500 });
    }

    return Response.json({
      workspace_id: personal.id,
      visibility: 'private',
      type: 'personal'
    });
  } catch (error) {
    console.error('resolveWorkspace error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});