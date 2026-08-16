// ============================================================
// lib/categoryIcon.js — УТИЛИТА ДЛЯ ОТОБРАЖЕНИЯ ИКОНОК КАТЕГОРИЙ
// ============================================================
// Category.icon может хранить либо эмодзи (созданные пользователем),
// либо название lucide-иконки (системные категории).
// Эта функция возвращает эмодзи для отображения.
// ============================================================

const LUCIDE_TO_EMOJI = {
  Utensils: '🍔',
  Car: '🚗',
  Home: '🏠',
  Gamepad2: '🎮',
  Heart: '💊',
  Shirt: '👕',
  CreditCard: '💳',
  BookOpen: '📚',
  Wallet: '💰',
  Laptop: '💻',
  TrendingUp: '📈',
  Gift: '🎁',
  Plane: '✈️',
  Train: '🚆',
  Bus: '🚌',
  Dumbbell: '🏋️',
  Briefcase: '💼',
  Baby: '👶',
  Dog: '🐶',
  Cat: '🐱',
  GraduationCap: '🎓',
  Stethoscope: '🩺',
  Pill: '💊',
  ShoppingCart: '🛒',
  ShoppingBag: '🛍️',
  Coffee: '☕',
  Beer: '🍺',
  Wine: '🍷',
  Pizza: '🍕',
  Carrot: '🥕',
  Apple: '🍎',
  Banknote: '💵',
  PiggyBank: '🐖',
  Receipt: '🧾',
  Building: '🏢',
  House: '🏡',
  Zap: '⚡',
  Flame: '🔥',
  Wrench: '🔧',
  Hammer: '🔨',
  Phone: '📞',
  Tv: '📺',
  Music: '🎵',
  Camera: '📷',
  Film: '🎬',
  Ticket: '🎫',
  Trophy: '🏆',
  Target: '🎯',
  Star: '⭐',
  Crown: '👑',
  Gem: '💎',
  Palette: '🎨',
  Brush: '🖌️',
  Sprout: '🌱',
  Tree: '🌳',
  Sun: '🌞',
  Moon: '🌙',
  Cloud: '☁️',
  Umbrella: '☂️',
  Bike: '🚲',
  Fuel: '⛽',
  Gauge: '🛎️',
};

export function getCategoryEmoji(icon) {
  if (!icon) return '📦';
  // Если уже эмодзи (содержит не-ASCII символы) — возвращаем как есть
  if (/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u.test(icon)) return icon;
  // Иначе пытаемся смаппить lucide-имя на эмодзи
  return LUCIDE_TO_EMOJI[icon] || '📦';
}