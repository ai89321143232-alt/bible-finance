import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Позволяет участнику семьи отредактировать СВОЙ профиль (display_name/avatar_url)
// внутри массива members семьи, либо владельцу семьи — профиль любого участника.
// Нужен сервис-роль, т.к. RLS на Family.update не может матчить элемент массива members.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { familyId, memberId, display_name, avatar_url } = await req.json();
    if (!familyId || !memberId) {
      return Response.json({ error: 'familyId and memberId are required' }, { status: 400 });
    }

    const family = await base44.asServiceRole.entities.Family.get(familyId);
    if (!family) return Response.json({ error: 'Family not found' }, { status: 404 });

    const isOwner = family.owner_id === user.id;
    const isSelf = memberId === user.id;
    if (!isOwner && !isSelf) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = family.members || [];
    const memberIndex = members.findIndex((m) => m.user_id === memberId);
    if (memberIndex === -1) return Response.json({ error: 'Member not found' }, { status: 404 });

    const updatedMembers = [...members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      ...(display_name !== undefined ? { display_name } : {}),
      ...(avatar_url !== undefined ? { avatar_url } : {}),
    };

    await base44.asServiceRole.entities.Family.update(familyId, { members: updatedMembers });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});