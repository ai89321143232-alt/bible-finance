import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Deletes a Family AND clears family_id on every member's User record.
// Only the family owner can perform this. Without clearing family_id on
// members, they would keep referencing a deleted family via RLS rules.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { familyId } = await req.json();
    if (!familyId) {
      return Response.json({ error: 'Укажите familyId' }, { status: 400 });
    }

    const family = await base44.asServiceRole.entities.Family.get(familyId);
    if (!family) return Response.json({ error: 'Семья не найдена' }, { status: 404 });

    if (family.owner_id !== user.id) {
      return Response.json({ error: 'Только владелец семьи может удалить её' }, { status: 403 });
    }

    // Clear family_id for every member that points to this family
    const memberIds = new Set((family.members || []).map((m) => m.user_id));
    memberIds.add(family.owner_id);

    for (const memberId of memberIds) {
      try {
        const memberUser = await base44.asServiceRole.entities.User.get(memberId);
        if (memberUser?.family_id === familyId) {
          await base44.asServiceRole.entities.User.update(memberId, { family_id: null });
        }
      } catch (e) {
        // Continue even if one member lookup fails
      }
    }

    await base44.asServiceRole.entities.Family.delete(familyId);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});