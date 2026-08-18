import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ============================================================
// gamificationDailyCheckin — серверная логика духовного роста.
// Обрабатывает: ежедневный вход, транзакции, достижения, титулы,
// молитву благодарности.
// Payload: { action: "daily_login" | "transaction" | "goal_completed" | "budget_kept" | "pray" }
// ============================================================

const DAILY_LOGIN_POINTS = 5;
const TRANSACTION_POINTS = 10;
const MAX_DAILY_TX_REWARDS = 5;
const GOAL_COMPLETED_POINTS = 50;
const BUDGET_KEPT_POINTS = 30;
const PRAYER_POINTS = 3;

const TITLES = [
  { min: 0, title: "Младенец", icon: "🍼" },
  { min: 50, title: "Верный в малом", icon: "🌱" },
  { min: 150, title: "Усердный управитель", icon: "⚖️" },
  { min: 400, title: "Мудрый распорядитель", icon: "📖" },
  { min: 900, title: "Доверенный хранитель", icon: "🏛️" },
  { min: 1800, title: "Верный во многом", icon: "👑" },
];

const ALL_ACHIEVEMENTS = {
  first_transaction: { title: "Первый шаг", description: "Записать первую транзакцию", icon: "👣" },
  streak_7: { title: "Неделя верности", description: "7 дней подряд", icon: "🔥" },
  streak_30: { title: "Месяц постоянства", description: "30 дней подряд", icon: "⭐" },
  first_budget: { title: "Распорядитель", description: "Создать первый бюджет", icon: "📋" },
  budget_kept: { title: "Бережливый", description: "Не превысить бюджет за месяц", icon: "🛡️" },
  first_goal: { title: "Целеустремлённый", description: "Создать первую цель", icon: "🎯" },
  goal_completed: { title: "Достигший", description: "Завершить цель", icon: "🏆" },
  first_investment: { title: "Инвестор", description: "Создать первую инвестицию", icon: "📈" },
  tithe_fulfilled: { title: "Верный десятине", description: "Записать десятину", icon: "⛪" },
  steward_level: { title: "Верный управитель", description: "Достичь 2-го титула", icon: "✨" },
  first_prayer: { title: "Благодарное сердце", description: "Прочитать первую молитву благодарности", icon: "🙏" },
  prayer_week: { title: "Постоянство духа", description: "7 дней молитвы подряд", icon: "🕊️" },
};

function getTitleForPoints(points) {
  let result = TITLES[0];
  for (const t of TITLES) {
    if (points >= t.min) result = t;
  }
  return result;
}

function checkNewAchievements(profile, action, context = {}) {
  const newAchievements = [];
  const achievements = profile.achievements || [];

  if (action === "transaction" && (profile.total_transactions || 0) + 1 >= 1 && !achievements.includes("first_transaction")) {
    newAchievements.push("first_transaction");
  }
  if ((profile.streak_days || 0) >= 7 && !achievements.includes("streak_7")) {
    newAchievements.push("streak_7");
  }
  if ((profile.streak_days || 0) >= 30 && !achievements.includes("streak_30")) {
    newAchievements.push("streak_30");
  }
  if (action === "goal_completed" && !achievements.includes("goal_completed")) {
    newAchievements.push("goal_completed");
  }
  if (action === "budget_kept" && !achievements.includes("budget_kept")) {
    newAchievements.push("budget_kept");
  }
  if (action === "pray" && !achievements.includes("first_prayer")) {
    newAchievements.push("first_prayer");
  }
  if ((profile.prayer_streak || 0) >= 7 && !achievements.includes("prayer_week")) {
    newAchievements.push("prayer_week");
  }

  const newTitle = getTitleForPoints(profile.total_points || 0);
  if ((profile.total_points || 0) >= 50 && !achievements.includes("steward_level")) {
    newAchievements.push("steward_level");
  }

  return newAchievements;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, category } = await req.json().catch(() => ({ action: null }));
    if (!['daily_login', 'transaction', 'goal_completed', 'budget_kept', 'pray'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const profiles = await base44.asServiceRole.entities.UserGamification.filter({ user_id: user.id });
    let profile = profiles[0];
    if (!profile) {
      profile = await base44.asServiceRole.entities.UserGamification.create({
        user_id: user.id,
        total_points: 0,
        streak_days: 0,
        max_streak: 0,
        current_title: TITLES[0].title,
        last_daily_login: null,
        last_prayer_date: null,
        prayer_streak: 0,
        daily_transactions_count: 0,
        last_transaction_date: null,
        achievements: [],
        total_transactions: 0,
        budgets_kept_count: 0,
        goals_completed_count: 0,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    let pointsAwarded = 0;
    let newAchievements = [];
    let titleChanged = false;

    if (action === 'daily_login') {
      if (profile.last_daily_login === today) {
        return Response.json({ profile, awarded: false });
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      let newStreak = 1;
      if (profile.last_daily_login === yesterdayStr) {
        newStreak = (profile.streak_days || 0) + 1;
      }

      pointsAwarded = DAILY_LOGIN_POINTS + (newStreak >= 7 ? 5 : 0);
      const newPoints = (profile.total_points || 0) + pointsAwarded;
      const newTitle = getTitleForPoints(newPoints);
      titleChanged = newTitle.title !== profile.current_title;

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, {
        total_points: newPoints,
        last_daily_login: today,
        streak_days: newStreak,
        max_streak: Math.max(profile.max_streak || 0, newStreak),
        current_title: newTitle.title,
      });

      const tempProfile = { ...updated, total_points: newPoints, streak_days: newStreak };
      newAchievements = checkNewAchievements(tempProfile, action);

      if (newAchievements.length > 0) {
        const allAchievements = [...(updated.achievements || []), ...newAchievements];
        const finalProfile = await base44.asServiceRole.entities.UserGamification.update(updated.id, {
          achievements: allAchievements,
        });
        return Response.json({
          profile: finalProfile,
          awarded: true,
          points: pointsAwarded,
          newAchievements,
          titleChanged,
          newTitle: titleChanged ? newTitle : null,
        });
      }

      return Response.json({ profile: updated, awarded: true, points: pointsAwarded, newAchievements: [], titleChanged, newTitle: titleChanged ? newTitle : null });
    }

    if (action === 'pray') {
      if (profile.last_prayer_date === today) {
        return Response.json({ profile, awarded: false });
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      let newPrayerStreak = 1;
      if (profile.last_prayer_date === yesterdayStr) {
        newPrayerStreak = (profile.prayer_streak || 0) + 1;
      }

      pointsAwarded = PRAYER_POINTS;
      const newPoints = (profile.total_points || 0) + pointsAwarded;
      const newTitle = getTitleForPoints(newPoints);
      titleChanged = newTitle.title !== profile.current_title;

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, {
        total_points: newPoints,
        last_prayer_date: today,
        prayer_streak: newPrayerStreak,
        current_title: newTitle.title,
      });

      const tempProfile = { ...updated, total_points: newPoints, prayer_streak: newPrayerStreak };
      newAchievements = checkNewAchievements(tempProfile, action);

      if (newAchievements.length > 0) {
        const allAchievements = [...(updated.achievements || []), ...newAchievements];
        const finalProfile = await base44.asServiceRole.entities.UserGamification.update(updated.id, {
          achievements: allAchievements,
        });
        return Response.json({
          profile: finalProfile,
          awarded: true,
          points: pointsAwarded,
          newAchievements,
          titleChanged,
          newTitle: titleChanged ? newTitle : null,
        });
      }

      return Response.json({ profile: updated, awarded: true, points: pointsAwarded, newAchievements: [], titleChanged, newTitle: titleChanged ? newTitle : null });
    }

    if (action === 'transaction') {
      const isNewDay = profile.last_transaction_date !== today;
      const currentCount = isNewDay ? 0 : (profile.daily_transactions_count || 0);
      if (currentCount >= MAX_DAILY_TX_REWARDS) {
        return Response.json({ profile, awarded: false });
      }

      pointsAwarded = TRANSACTION_POINTS;
      const newPoints = (profile.total_points || 0) + pointsAwarded;
      const newTitle = getTitleForPoints(newPoints);
      titleChanged = newTitle.title !== profile.current_title;
      const newTotalTx = (profile.total_transactions || 0) + 1;

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, {
        total_points: newPoints,
        daily_transactions_count: currentCount + 1,
        last_transaction_date: today,
        total_transactions: newTotalTx,
        current_title: newTitle.title,
      });

      const tempProfile = { ...updated, total_points: newPoints, streak_days: profile.streak_days || 0 };
      newAchievements = checkNewAchievements(tempProfile, action);

      if (newAchievements.length > 0) {
        const allAchievements = [...(updated.achievements || []), ...newAchievements];
        const finalProfile = await base44.asServiceRole.entities.UserGamification.update(updated.id, {
          achievements: allAchievements,
        });
        return Response.json({
          profile: finalProfile,
          awarded: true,
          points: pointsAwarded,
          newAchievements,
          titleChanged,
          newTitle: titleChanged ? newTitle : null,
        });
      }

      return Response.json({ profile: updated, awarded: true, points: pointsAwarded, newAchievements: [], titleChanged, newTitle: titleChanged ? newTitle : null });
    }

    if (action === 'goal_completed') {
      pointsAwarded = GOAL_COMPLETED_POINTS;
      const newPoints = (profile.total_points || 0) + pointsAwarded;
      const newTitle = getTitleForPoints(newPoints);
      titleChanged = newTitle.title !== profile.current_title;
      const newGoalsCompleted = (profile.goals_completed_count || 0) + 1;

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, {
        total_points: newPoints,
        goals_completed_count: newGoalsCompleted,
        current_title: newTitle.title,
      });

      const tempProfile = { ...updated, total_points: newPoints };
      newAchievements = checkNewAchievements(tempProfile, action);

      if (newAchievements.length > 0) {
        const allAchievements = [...(updated.achievements || []), ...newAchievements];
        const finalProfile = await base44.asServiceRole.entities.UserGamification.update(updated.id, {
          achievements: allAchievements,
        });
        return Response.json({
          profile: finalProfile,
          awarded: true,
          points: pointsAwarded,
          newAchievements,
          titleChanged,
          newTitle: titleChanged ? newTitle : null,
        });
      }

      return Response.json({ profile: updated, awarded: true, points: pointsAwarded, newAchievements: [], titleChanged, newTitle: titleChanged ? newTitle : null });
    }

    if (action === 'budget_kept') {
      pointsAwarded = BUDGET_KEPT_POINTS;
      const newPoints = (profile.total_points || 0) + pointsAwarded;
      const newTitle = getTitleForPoints(newPoints);
      titleChanged = newTitle.title !== profile.current_title;
      const newBudgetsKept = (profile.budgets_kept_count || 0) + 1;

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, {
        total_points: newPoints,
        budgets_kept_count: newBudgetsKept,
        current_title: newTitle.title,
      });

      const tempProfile = { ...updated, total_points: newPoints };
      newAchievements = checkNewAchievements(tempProfile, action);

      if (newAchievements.length > 0) {
        const allAchievements = [...(updated.achievements || []), ...newAchievements];
        const finalProfile = await base44.asServiceRole.entities.UserGamification.update(updated.id, {
          achievements: allAchievements,
        });
        return Response.json({
          profile: finalProfile,
          awarded: true,
          points: pointsAwarded,
          newAchievements,
          titleChanged,
          newTitle: titleChanged ? newTitle : null,
        });
      }

      return Response.json({ profile: updated, awarded: true, points: pointsAwarded, newAchievements: [], titleChanged, newTitle: titleChanged ? newTitle : null });
    }

    return Response.json({ profile, awarded: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}