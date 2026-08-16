// ============================================================
// lib/budgetCategories.js — КАТЕГОРИИ БЮДЖЕТОВ С ИКОНКАМИ
// ============================================================
// Используется в Budgets.jsx и BudgetCard.jsx.
// Расширенный список с эмодзи-иконками и цветами.
// ============================================================

export const BUDGET_CATEGORIES = [
  { value: 'Еда', icon: '🍔', color: '#F59E0B' },
  { value: 'Продукты', icon: '🛒', color: '#F59E0B' },
  { value: 'Кафе и рестораны', icon: '☕', color: '#D97706' },
  { value: 'Транспорт', icon: '🚗', color: '#3B82F6' },
  { value: 'Такси', icon: '🚕', color: '#2563EB' },
  { value: 'Топливо', icon: '⛽', color: '#1D4ED8' },
  { value: 'Жильё', icon: '🏠', color: '#8B5CF6' },
  { value: 'Коммунальные услуги', icon: '🧾', color: '#7C3AED' },
  { value: 'Интернет и связь', icon: '📱', color: '#6366F1' },
  { value: 'Развлечения', icon: '🎮', color: '#EC4899' },
  { value: 'Кино и театры', icon: '🎬', color: '#DB2777' },
  { value: 'Путешествия', icon: '✈️', color: '#0EA5E9' },
  { value: 'Здоровье', icon: '💊', color: '#10B981' },
  { value: 'Спорт и фитнес', icon: '🏋️', color: '#059669' },
  { value: 'Аптеки', icon: '🏥', color: '#047857' },
  { value: 'Одежда', icon: '👕', color: '#6366F1' },
  { value: 'Обувь', icon: '👟', color: '#4F46E5' },
  { value: 'Красота и уход', icon: '💄', color: '#BE185D' },
  { value: 'Подписки', icon: '📺', color: '#EF4444' },
  { value: 'Образование', icon: '📚', color: '#14B8A6' },
  { value: 'Книги', icon: '📖', color: '#0D9488' },
  { value: 'Питомцы', icon: '🐶', color: '#F97316' },
  { value: 'Дети', icon: '👶', color: '#F59E0B' },
  { value: 'Подарки', icon: '🎁', color: '#E11D48' },
  { value: 'Налоги', icon: '💼', color: '#475569' },
  { value: 'Страхование', icon: '🛡️', color: '#334155' },
  { value: 'Ремонт', icon: '🔧', color: '#64748B' },
  { value: 'Электроника', icon: '💻', color: '#3B82F6' },
  { value: 'Хобби', icon: '🎨', color: '#A855F7' },
  { value: 'Кофе', icon: '☕', color: '#92400E' },
  { value: 'Доставки еды', icon: '🛵', color: '#0891B2' },
  { value: 'Другое', icon: '📦', color: '#64748B' },
];

// Быстрый поиск по имени категории
export function findBudgetCategory(name) {
  return BUDGET_CATEGORIES.find(c => c.value === name) || BUDGET_CATEGORIES[BUDGET_CATEGORIES.length - 1];
}