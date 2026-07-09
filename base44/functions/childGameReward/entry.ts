import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// childGameReward — серверный расчёт монеток/уровня/стрика для детского
// игрового профиля. Все начисления считаются здесь (service role),
// чтобы клиент не мог напрямую задавать total_coins/level.
// Payload: { action: "daily_login" | "transaction" }
// ============================================================

const DAILY_LOGIN_COINS = 20;
const TRANSACTION_COINS = 10;
const MAX_DAILY_TX_REWARDS = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json();
    if (!['daily_login', 'transaction'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const profiles = await base44.asServiceRole.entities.ChildGameProfile.filter({ user_id: user.id });
    let profile = profiles[0];
    if (!profile) {
      profile = await base44.asServiceRole.entities.ChildGameProfile.create({
        user_id: user.id,
        total_coins: 0,
        level: 1,
        streak_days: 0,
        achievements: []
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (action === 'daily_login') {
      if (profile.last_daily_login === today) {
        return Response.json({ profile, awarded: false });
      }
      const newCoins = (profile.total_coins || 0) + DAILY_LOGIN_COINS;
      const newLevel = Math.floor(newCoins / 100) + 1;
      const updated = await base44.asServiceRole.entities.ChildGameProfile.update(profile.id, {
        total_coins: newCoins,
        last_daily_login: today,
        level: newLevel,
        streak_days: (profile.streak_days || 0) + 1
      });
      return Response.json({ profile: updated, awarded: true, coins: DAILY_LOGIN_COINS });
    }

    // action === 'transaction'
    const isNewDay = profile.last_transaction_date !== today;
    const currentCount = isNewDay ? 0 : (profile.daily_transactions_count || 0);
    if (currentCount >= MAX_DAILY_TX_REWARDS) {
      return Response.json({ profile, awarded: false });
    }
    const newCoins = (profile.total_coins || 0) + TRANSACTION_COINS;
    const newLevel = Math.floor(newCoins / 100) + 1;
    const updated = await base44.asServiceRole.entities.ChildGameProfile.update(profile.id, {
      total_coins: newCoins,
      level: newLevel,
      daily_transactions_count: currentCount + 1,
      last_transaction_date: today
    });
    return Response.json({ profile: updated, awarded: true, coins: TRANSACTION_COINS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});