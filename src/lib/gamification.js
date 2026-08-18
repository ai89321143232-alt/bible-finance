export const TITLES = [
  { min: 0, title: "Верный в малом", icon: "🌱", verse: "Верный в малом и во многом верен" },
  { min: 100, title: "Усердный управитель", icon: "⚖️", verse: "От всякого, кому дано много, много и потребуется" },
  { min: 300, title: "Мудрый распорядитель", icon: "📖", verse: "Кто верен в очень малом, тот верен и в большом" },
  { min: 700, title: "Доверенный хранитель", icon: "🏛️", verse: "Хорошо, добрый и верный раб!" },
  { min: 1500, title: "Верный во многом", icon: "👑", verse: "В малом ты был верен, над многим тебя поставлю" },
];

export const ACHIEVEMENTS = {
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
};

export function getTitleForPoints(points) {
  let result = TITLES[0];
  for (const t of TITLES) {
    if (points >= t.min) result = t;
  }
  return result;
}

export function getNextTitle(points) {
  for (const t of TITLES) {
    if (points < t.min) return t;
  }
  return null;
}