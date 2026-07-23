import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ error: 'Укажите код приглашения' }, { status: 400 });

    const normalizedCode = String(code).trim().toUpperCase();
    const matches = await base44.asServiceRole.entities.Family.filter({ invite_code: normalizedCode });
    const family = matches[0];

    if (!family) {
      return Response.json({ error: 'Семья с таким кодом не найдена. Проверьте код и попробуйте снова.' }, { status: 404 });
    }

    const isAlreadyMember = family.members?.some((m) => m.user_id === user.id);
    if (isAlreadyMember) {
      return Response.json({ error: 'Вы уже являетесь участником этой семьи' }, { status: 400 });
    }

    const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const updatedMembers = [
      ...(family.members || []),
      {
        user_id: user.id,
        name: user.full_name || user.email,
        display_name: user.full_name || user.email,
        role: 'editor',
        avatar_color: randomColor
      }
    ];

    await base44.asServiceRole.entities.Family.update(family.id, { members: updatedMembers });
    await base44.auth.updateMe({ family_id: family.id });

    return Response.json({ success: true, family: { ...family, members: updatedMembers } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});