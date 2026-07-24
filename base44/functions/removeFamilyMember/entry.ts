import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Removes a member from a Family AND clears their family_id on the User record.
// Without the second step, a removed member keeps their old family_id and
// RLS rules (which match on family_id) would keep leaking family data to them.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { familyId, memberId } = await req.json();
    if (!familyId || !memberId) {
      return Response.json({ error: 'Укажите familyId и memberId' }, { status: 400 });
    }

    const family = await base44.asServiceRole.entities.Family.get(familyId);
    if (!family) return Response.json({ error: 'Семья не найдена' }, { status: 404 });

    if (family.owner_id !== user.id) {
      return Response.json({ error: 'Только владелец семьи может удалять участников' }, { status: 403 });
    }

    if (memberId === family.owner_id) {
      return Response.json({ error: 'Нельзя удалить владельца семьи' }, { status: 400 });
    }

    const updatedMembers = (family.members || []).filter((m) => m.user_id !== memberId);
    await base44.asServiceRole.entities.Family.update(familyId, { members: updatedMembers });

    const removedUser = await base44.asServiceRole.entities.User.get(memberId);
    if (removedUser?.family_id === familyId) {
      await base44.asServiceRole.entities.User.update(memberId, { family_id: null });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});