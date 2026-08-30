import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This maintenance job operates on every ChildGameProfile with service role,
    // so the HTTP endpoint must be restricted to admins. (The scheduled automation
    // caller will need an admin context to keep working — see release notes.)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const profiles = await base44.asServiceRole.entities.ChildGameProfile.list();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updatedCount = 0;

    for (const profile of profiles) {
      if (!profile.last_daily_login) continue;

      const lastLogin = new Date(profile.last_daily_login);
      lastLogin.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastLogin.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // If missed 1+ days, penalize for each missed day
      if (diffDays > 1) {
        const missedDays = diffDays - 1; // subtract 1 because today is not missed yet
        const penalty = missedDays * 10;
        const newCoins = (profile.total_coins || 0) - penalty;
        const newLevel = Math.max(1, Math.floor(Math.max(0, newCoins) / 100) + 1);

        await base44.asServiceRole.entities.ChildGameProfile.update(profile.id, {
          total_coins: newCoins,
          level: newLevel,
          streak_days: 0 // reset streak
        });

        updatedCount++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Processed ${profiles.length} profiles, penalized ${updatedCount}` 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});