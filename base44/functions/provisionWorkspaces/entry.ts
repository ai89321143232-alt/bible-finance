import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// provisionWorkspaces — ЭТАП 1 МИГРАЦИИ НА WORKSPACE-АРХИТЕКТУРУ
// ============================================================
// Идемпотентная функция. Безопасна для повторного запуска.
// Для ТЕКУЩЕГО пользователя:
//   1. Создаёт Personal Workspace, если его ещё нет.
//   2. Создаёт запись WorkspaceMember (role: owner), если её нет.
//   3. Если пользователь в семье — создаёт/находит Family Workspace.
//   4. Проставляет workspace_id всем финансовым записям пользователя,
//      у которых его ещё нет. НИЧЕГО НЕ УДАЛЯЕТ.
//
// Личные записи → personal workspace. Записи с family_id → family workspace.
// ============================================================

const FINANCIAL_ENTITIES = [
  'Transaction',
  'Account',
  'Budget',
  'Goal',
  'Investment',
  'Category',
  'ChildExpense',
  'Task'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = base44.asServiceRole;
    const report: Record<string, unknown> = { user_id: user.id };

    // ---- 1. Personal Workspace ----
    const existingPersonal = await svc.entities.Workspace.filter({
      owner_id: user.id,
      type: 'personal'
    });
    let personalWorkspace = existingPersonal[0];
    if (!personalWorkspace) {
      personalWorkspace = await svc.entities.Workspace.create({
        name: 'Личное пространство',
        type: 'personal',
        owner_id: user.id,
        currency: 'RUB',
        is_active: true
      });
      report.personal_created = true;
    }
    report.personal_workspace_id = personalWorkspace.id;

    // ---- 2. WorkspaceMember для personal ----
    const existingPersonalMember = await svc.entities.WorkspaceMember.filter({
      workspace_id: personalWorkspace.id,
      user_id: user.id
    });
    if (existingPersonalMember.length === 0) {
      await svc.entities.WorkspaceMember.create({
        workspace_id: personalWorkspace.id,
        user_id: user.id,
        role: 'owner',
        user_email: user.email,
        user_name: user.full_name,
        is_active: true
      });
      report.personal_member_created = true;
    }

    // ---- 3. Family Workspace (если пользователь в семье) ----
    let familyWorkspace = null;
    if (user.family_id) {
      const existingFamily = await svc.entities.Workspace.filter({
        family_id: user.family_id,
        type: 'family'
      });
      familyWorkspace = existingFamily[0];
      if (!familyWorkspace) {
        familyWorkspace = await svc.entities.Workspace.create({
          name: 'Семейное пространство',
          type: 'family',
          owner_id: user.id,
          family_id: user.family_id,
          currency: 'RUB',
          is_active: true
        });
        report.family_created = true;
      }
      report.family_workspace_id = familyWorkspace.id;

      const existingFamilyMember = await svc.entities.WorkspaceMember.filter({
        workspace_id: familyWorkspace.id,
        user_id: user.id
      });
      if (existingFamilyMember.length === 0) {
        await svc.entities.WorkspaceMember.create({
          workspace_id: familyWorkspace.id,
          user_id: user.id,
          role: 'member',
          user_email: user.email,
          user_name: user.full_name,
          is_active: true
        });
        report.family_member_created = true;
      }
    }

    // ---- 4. Проставить workspace_id существующим записям ----
    const backfill: Record<string, number> = {};
    for (const entityName of FINANCIAL_ENTITIES) {
      let updated = 0;
      // Только записи, созданные этим пользователем и без workspace_id
      const records = await svc.entities[entityName].filter({ created_by: user.email });
      for (const rec of records) {
        if (rec.workspace_id) continue;
        // family-запись → family workspace, иначе personal
        const targetWs = (rec.family_id && familyWorkspace)
          ? familyWorkspace.id
          : personalWorkspace.id;
        const isShared = !!(rec.family_id && familyWorkspace);
        await svc.entities[entityName].update(rec.id, {
          workspace_id: targetWs,
          ...(entityName !== 'Category' ? { visibility: isShared ? 'shared' : 'private' } : {})
        });
        updated++;
      }
      backfill[entityName] = updated;
    }
    report.backfill = backfill;
    report.success = true;

    return Response.json(report);
  } catch (error) {
    console.error('provisionWorkspaces error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});