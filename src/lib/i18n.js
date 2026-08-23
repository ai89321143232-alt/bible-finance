// ============================================================
// i18n.js — словарь переводов (ru / en) + хелперы
// ============================================================

export const LANGUAGES = {
  ru: { label: 'Русский', flag: '🇷🇺' },
  en: { label: 'English', flag: '🇬🇧' },
};

export const DEFAULT_LANGUAGE = 'ru';

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const lang = (navigator.language || '').toLowerCase();
  return lang.startsWith('ru') ? 'ru' : 'en';
}

export const translations = {
  ru: {
    // Common
    'common.add': 'Добавить',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Изменить',
    'common.close': 'Закрыть',
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.search': 'Поиск',
    'common.refresh': 'Обновить',
    'common.back': 'Назад',
    'common.today': 'Сегодня',
    'common.all': 'Все',

    // Navigation
    'nav.dashboard': 'Главная',
    'nav.transactions': 'Операции',
    'nav.budgets': 'Бюджеты',
    'nav.goals': 'Цели',
    'nav.accounts': 'Счета',
    'nav.investments': 'Инвестиции',
    'nav.analytics': 'Аналитика',
    'nav.settings': 'Настройки',
    'nav.family': 'Семья',
    'nav.tasks': 'Задачи',
    'nav.notes': 'Заметки',
    'nav.ai_chat': 'ИИ Чат',
    'nav.ai_advisors': 'ИИ Ассистенты',
    'nav.ai_planning': 'ИИ Планировщик',
    'nav.subscriptions': 'Подписки',
    'nav.help': 'База знаний',
    'nav.categories': 'Категории',

    // AI Planning
    'ai_planning.title': 'ИИ Планировщик финансов',
    'ai_planning.subtitle': '9 умных инструментов для аналитики и планирования',
    'ai_planning.cashflow': 'Кассовый разрыв',
    'ai_planning.cashflow_desc': 'Прогноз движения средств по дням',
    'ai_planning.daily_limit': 'Дневной лимит',
    'ai_planning.daily_limit_desc': 'Сколько можно потратить сегодня',
    'ai_planning.subscriptions': 'Подписки и переплаты',
    'ai_planning.subscriptions_desc': 'Дубликаты и забытые подписки',
    'ai_planning.debt_strategy': 'Стратегия долгов',
    'ai_planning.debt_strategy_desc': 'Снежный ком vs лавина',
    'ai_planning.goal_acceleration': 'Ускорение целей',
    'ai_planning.goal_acceleration_desc': 'Прогноз достижения целей',
    'ai_planning.pre_purchase': 'Проверка траты',
    'ai_planning.pre_purchase_desc': 'Оценка крупной покупки',
    'ai_planning.monthly_report': 'Месячный отчёт',
    'ai_planning.monthly_report_desc': 'Расширенный ИИ-отчёт',
    'ai_planning.balance_allocation': 'Баланс долг/накоп',
    'ai_planning.balance_allocation_desc': 'Распределение свободных средств',
    'ai_planning.spending_clusters': 'Карта трат',
    'ai_planning.spending_clusters_desc': 'Сегментация расходов',
    'ai_planning.analyzing': 'Анализирую ваши данные...',
    'ai_planning.check_purchase': 'Проверить трату',
    'ai_planning.amount': 'Сумма ₽',
    'ai_planning.category': 'Категория',
    'ai_planning.description': 'Описание покупки',
    'ai_planning.save_note': 'В заметки',
    'ai_planning.saved': 'Анализ сохранён в заметках',
    'ai_planning.saved_title': 'Сохранено',

    // Settings
    'settings.title': 'Настройки',
    'settings.language': 'Язык интерфейса',
    'settings.appearance': 'Внешний вид',
    'settings.profile': 'Профиль',

    // Dashboard
    'dashboard.title': 'Финансовая Библия',
    'dashboard.total_balance': 'Общий баланс',
    'dashboard.month_income': 'Доход за месяц',
    'dashboard.month_expense': 'Расход за месяц',
  },

  en: {
    // Common
    'common.add': 'Add',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.search': 'Search',
    'common.refresh': 'Refresh',
    'common.back': 'Back',
    'common.today': 'Today',
    'common.all': 'All',

    // Navigation
    'nav.dashboard': 'Home',
    'nav.transactions': 'Transactions',
    'nav.budgets': 'Budgets',
    'nav.goals': 'Goals',
    'nav.accounts': 'Accounts',
    'nav.investments': 'Investments',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.family': 'Family',
    'nav.tasks': 'Tasks',
    'nav.notes': 'Notes',
    'nav.ai_chat': 'AI Chat',
    'nav.ai_advisors': 'AI Advisors',
    'nav.ai_planning': 'AI Planner',
    'nav.subscriptions': 'Subscriptions',
    'nav.help': 'Help Center',
    'nav.categories': 'Categories',

    // AI Planning
    'ai_planning.title': 'AI Financial Planner',
    'ai_planning.subtitle': '9 smart tools for analytics and planning',
    'ai_planning.cashflow': 'Cash Flow Gap',
    'ai_planning.cashflow_desc': 'Daily cash flow forecast',
    'ai_planning.daily_limit': 'Daily Limit',
    'ai_planning.daily_limit_desc': 'How much you can spend today',
    'ai_planning.subscriptions': 'Subscriptions & Overpay',
    'ai_planning.subscriptions_desc': 'Duplicates and forgotten subscriptions',
    'ai_planning.debt_strategy': 'Debt Strategy',
    'ai_planning.debt_strategy_desc': 'Snowball vs avalanche',
    'ai_planning.goal_acceleration': 'Goal Acceleration',
    'ai_planning.goal_acceleration_desc': 'Goal achievement forecast',
    'ai_planning.pre_purchase': 'Purchase Check',
    'ai_planning.pre_purchase_desc': 'Evaluate a large purchase',
    'ai_planning.monthly_report': 'Monthly Report',
    'ai_planning.monthly_report_desc': 'Extended AI report',
    'ai_planning.balance_allocation': 'Debt/Savings Balance',
    'ai_planning.balance_allocation_desc': 'Distribute free funds',
    'ai_planning.spending_clusters': 'Spending Map',
    'ai_planning.spending_clusters_desc': 'Expense segmentation',
    'ai_planning.analyzing': 'Analyzing your data...',
    'ai_planning.check_purchase': 'Check purchase',
    'ai_planning.amount': 'Amount ₽',
    'ai_planning.category': 'Category',
    'ai_planning.description': 'Purchase description',
    'ai_planning.save_note': 'Save to notes',
    'ai_planning.saved': 'Analysis saved to notes',
    'ai_planning.saved_title': 'Saved',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Interface language',
    'settings.appearance': 'Appearance',
    'settings.profile': 'Profile',

    // Dashboard
    'dashboard.title': 'Bible Finance',
    'dashboard.total_balance': 'Total balance',
    'dashboard.month_income': 'Monthly income',
    'dashboard.month_expense': 'Monthly expense',
  },
};