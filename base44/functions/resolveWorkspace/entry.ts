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

    const svc = base44.asServiceRole;

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
    const family = myWs.find((w) => w.type === 'family');

    if (scope === 'family' && user.family_id && family) {
      return Response.json({
        workspace_id: family.id,
        visibility: 'shared',
        type: 'family'
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