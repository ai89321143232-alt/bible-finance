import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ============================================================
// gamificationDailyCheckin — серверная логика духовного роста.
// Обрабатывает: ежедневный вход, транзакции, достижения, титулы,
// молитву благодарности. Поддерживает параллельный семейный трек
// через параметр context: "family".
// Payload: { action, context? }
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

const FAMILY_TITLES = [
  { min: 0, title: "Семейный младенец", icon: "🍼" },
  { min: 50, title: "Домостроитель", icon: "🏠" },
  { min: 150, title: "Семейный управитель", icon: "👨‍👩‍👧‍👦" },
  { min: 400, title: "Верный семье", icon: "💍" },
  { min: 900, title: "Крепость семьи", icon: "🏛️" },
  { min: 1800, title: "Семья верных", icon: "👑" },
];

function getTitleForPoints(points) {
  let result = TITLES[0];
  for (const t of TITLES) {
    if (points >= t.min) result = t;
  }
  return result;
}

function getFamilyTitleForPoints(points) {
  let result = FAMILY_TITLES[0];
  for (const t of FAMILY_TITLES) {
    if (points >= t.min) result = t;
  }
  return result;
}

function checkNewAchievements(profile, action, context = {}) {
  const newAchievements = [];
  const achievements = profile.achievements || [];

  if (action === "transaction" && !context.isFamily && (profile.total_transactions || 0) + 1 >= 1 && !achievements.includes("first_transaction")) {
    newAchievements.push("first_transaction");
  }
  if (action === "transaction" && context.isFamily && !achievements.includes("first_family_tx")) {
    newAchievements.push("first_family_tx");
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
  if (action === "pray" && !context.isFamily && !achievements.includes("first_prayer")) {
    newAchievements.push("first_prayer");
  }
  if (action === "pray" && context.isFamily && !achievements.includes("family_prayer")) {
    newAchievements.push("family_prayer");
  }
  if ((profile.prayer_streak || 0) >= 7 && !achievements.includes("prayer_week")) {
    newAchievements.push("prayer_week");
  }

  const newTitle = getTitleForPoints(profile.total_points || 0);
  if ((profile.total_points || 0) >= 50 && !achievements.includes("steward_level")) {
    newAchievements.push("steward_level");
  }

  const newFamilyTitle = getFamilyTitleForPoints(profile.family_points || 0);
  if ((profile.family_points || 0) >= 50 && !achievements.includes("family_steward")) {
    newAchievements.push("family_steward");
  }

  return newAchievements;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({ action: null }));
    const { action, context } = body;
    const isFamily = context === 'family';
    const hasFamily = !!(user.family_id || (user.data && user.data.family_id));

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
        family_points: 0,
        family_title: FAMILY_TITLES[0].title,
        last_family_prayer_date: null,
        family_prayer_streak: 0,
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
    let familyTitleChanged = false;

    if (action === 'daily_login') {
      if (profile.last_daily_login === today) {
        return Response.json({ profile, awarded: false, hasFamily });
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
      newAchievements = checkNewAchievements(tempProfile, action, { isFamily });

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
          hasFamily,
        });
      }

      return Response.json({ profile: updated, awarded: true, points: pointsAwarded, newAchievements: [], titleChanged, newTitle: titleChanged ? newTitle : null, hasFamily });
    }

    if (action === 'pray') {
      const prayerDateField = isFamily ? 'last_family_prayer_date' : 'last_prayer_date';
      const prayerStreakField = isFamily ? 'family_prayer_streak' : 'prayer_streak';

      if (profile[prayerDateField] === today) {
        return Response.json({ profile, awarded: false, hasFamily });
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      let newPrayerStreak = 1;
      if (profile[prayerDateField] === yesterdayStr) {
        newPrayerStreak = (profile[prayerStreakField] || 0) + 1;
      }

      pointsAwarded = PRAYER_POINTS;
      const updateData = {};
      updateData[prayerStreakField] = newPrayerStreak;
      updateData[prayerDateField] = today;

      if (isFamily) {
        const newFamilyPoints = (profile.family_points || 0) + pointsAwarded;
        const newFamilyTitle = getFamilyTitleForPoints(newFamilyPoints);
        familyTitleChanged = newFamilyTitle.title !== profile.family_title;
        updateData.family_points = newFamilyPoints;
        updateData.family_title = newFamilyTitle.title;
      } else {
        const newPoints = (profile.total_points || 0) + pointsAwarded;
        const newTitle = getTitleForPoints(newPoints);
        titleChanged = newTitle.title !== profile.current_title;
        updateData.total_points = newPoints;
        updateData.current_title = newTitle.title;
      }

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, updateData);

      const tempProfile = { ...updated };
      newAchievements = checkNewAchievements(tempProfile, action, { isFamily });

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
          newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
          familyTitleChanged,
          newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
          hasFamily,
        });
      }

      return Response.json({
        profile: updated,
        awarded: true,
        points: pointsAwarded,
        newAchievements: [],
        titleChanged,
        newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
        familyTitleChanged,
        newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
        hasFamily,
      });
    }

    if (action === 'transaction') {
      const isNewDay = profile.last_transaction_date !== today;
      const currentCount = isNewDay ? 0 : (profile.daily_transactions_count || 0);
      if (currentCount >= MAX_DAILY_TX_REWARDS) {
        return Response.json({ profile, awarded: false, hasFamily });
      }

      pointsAwarded = TRANSACTION_POINTS;
      const newTotalTx = (profile.total_transactions || 0) + 1;
      const updateData = {
        daily_transactions_count: currentCount + 1,
        last_transaction_date: today,
        total_transactions: newTotalTx,
      };

      if (isFamily) {
        const newFamilyPoints = (profile.family_points || 0) + pointsAwarded;
        const newFamilyTitle = getFamilyTitleForPoints(newFamilyPoints);
        familyTitleChanged = newFamilyTitle.title !== profile.family_title;
        updateData.family_points = newFamilyPoints;
        updateData.family_title = newFamilyTitle.title;
      } else {
        const newPoints = (profile.total_points || 0) + pointsAwarded;
        const newTitle = getTitleForPoints(newPoints);
        titleChanged = newTitle.title !== profile.current_title;
        updateData.total_points = newPoints;
        updateData.current_title = newTitle.title;
      }

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, updateData);

      const tempProfile = { ...updated, streak_days: profile.streak_days || 0 };
      newAchievements = checkNewAchievements(tempProfile, action, { isFamily });

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
          newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
          familyTitleChanged,
          newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
          hasFamily,
        });
      }

      return Response.json({
        profile: updated,
        awarded: true,
        points: pointsAwarded,
        newAchievements: [],
        titleChanged,
        newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
        familyTitleChanged,
        newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
        hasFamily,
      });
    }

    if (action === 'goal_completed') {
      pointsAwarded = GOAL_COMPLETED_POINTS;
      const newGoalsCompleted = (profile.goals_completed_count || 0) + 1;
      const updateData = {
        goals_completed_count: newGoalsCompleted,
      };

      if (isFamily) {
        const newFamilyPoints = (profile.family_points || 0) + pointsAwarded;
        const newFamilyTitle = getFamilyTitleForPoints(newFamilyPoints);
        familyTitleChanged = newFamilyTitle.title !== profile.family_title;
        updateData.family_points = newFamilyPoints;
        updateData.family_title = newFamilyTitle.title;
      } else {
        const newPoints = (profile.total_points || 0) + pointsAwarded;
        const newTitle = getTitleForPoints(newPoints);
        titleChanged = newTitle.title !== profile.current_title;
        updateData.total_points = newPoints;
        updateData.current_title = newTitle.title;
      }

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, updateData);

      const tempProfile = { ...updated };
      newAchievements = checkNewAchievements(tempProfile, action, { isFamily });

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
          newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
          familyTitleChanged,
          newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
          hasFamily,
        });
      }

      return Response.json({
        profile: updated,
        awarded: true,
        points: pointsAwarded,
        newAchievements: [],
        titleChanged,
        newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
        familyTitleChanged,
        newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
        hasFamily,
      });
    }

    if (action === 'budget_kept') {
      pointsAwarded = BUDGET_KEPT_POINTS;
      const newBudgetsKept = (profile.budgets_kept_count || 0) + 1;
      const updateData = {
        budgets_kept_count: newBudgetsKept,
      };

      if (isFamily) {
        const newFamilyPoints = (profile.family_points || 0) + pointsAwarded;
        const newFamilyTitle = getFamilyTitleForPoints(newFamilyPoints);
        familyTitleChanged = newFamilyTitle.title !== profile.family_title;
        updateData.family_points = newFamilyPoints;
        updateData.family_title = newFamilyTitle.title;
      } else {
        const newPoints = (profile.total_points || 0) + pointsAwarded;
        const newTitle = getTitleForPoints(newPoints);
        titleChanged = newTitle.title !== profile.current_title;
        updateData.total_points = newPoints;
        updateData.current_title = newTitle.title;
      }

      const updated = await base44.asServiceRole.entities.UserGamification.update(profile.id, updateData);

      const tempProfile = { ...updated };
      newAchievements = checkNewAchievements(tempProfile, action, { isFamily });

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
          newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
          familyTitleChanged,
          newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
          hasFamily,
        });
      }

      return Response.json({
        profile: updated,
        awarded: true,
        points: pointsAwarded,
        newAchievements: [],
        titleChanged,
        newTitle: titleChanged ? getTitleForPoints(updated.total_points || 0) : null,
        familyTitleChanged,
        newFamilyTitle: familyTitleChanged ? getFamilyTitleForPoints(updated.family_points || 0) : null,
        hasFamily,
      });
    }

    return Response.json({ profile, awarded: false, hasFamily });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}