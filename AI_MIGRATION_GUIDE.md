# 📖 AI Migration Guide — Библия Финансов

> Полный технический документ для переноса приложения 1-в-1 на любой сервер.
> Составлен на основе анализа исходного кода. Версия: 2026-07-04.

---

## 🏗️ СТЕК ТЕХНОЛОГИЙ

| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend | React | 18.2 |
| Роутинг | react-router-dom | 6.x |
| Стили | Tailwind CSS + shadcn/ui | — |
| Анимации | framer-motion | 11.x |
| Кэш / запросы | @tanstack/react-query | 5.x |
| Backend-as-a-Service | Base44 (base44.com) | SDK 0.8.35 |
| Сборщик | Vite | — |
| Backend-функции | Deno Deploy (внутри Base44) | — |

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
src/
├── App.jsx                          # Корневой роутер + провайдеры
├── Layout.jsx                       # Основной макет (sidebar + topbar + mobile tabs)
├── index.css                        # CSS-переменные (design tokens)
├── main.jsx                         # Точка входа React
├── pages.config.js                  # Конфиг страниц (реестр компонентов)
├── pages/
│   ├── Dashboard.jsx                # Главная (/, баланс, транзакции, графики)
│   ├── Transactions.jsx             # Список операций с фильтрами
│   ├── Accounts.jsx                 # Управление счетами
│   ├── Budgets.jsx                  # Бюджеты (личные + семейные)
│   ├── Goals.jsx                    # Финансовые цели
│   ├── Investments.jsx              # Инвестиции
│   ├── Analytics.jsx                # Аналитика
│   ├── AIAssistant.jsx              # AI-ассистент
│   ├── Family.jsx                   # Управление семьёй
│   ├── FamilyFinances.jsx           # Семейные финансы
│   ├── Settings.jsx                 # Настройки пользователя
│   ├── Categories.jsx               # Управление категориями
│   ├── Notes.jsx                    # Заметки/цитаты
│   ├── Tasks.jsx                    # Задачи
│   ├── ChildExpenses.jsx            # Детские расходы
│   ├── FinancialPlanning.jsx        # Финансовое планирование
│   ├── DebtAnalytics.jsx            # Анализ долгов
│   ├── Backup.jsx                   # Резервные копии
│   ├── BackupReports.jsx            # Отчёты резервных копий
│   ├── CleanupDuplicates.jsx        # Удаление дублей
│   ├── Referral.jsx                 # Реферальная программа
│   ├── Subscription.jsx             # Управление подпиской
│   ├── Admin.jsx                    # Панель администратора
│   ├── HelpCenter.jsx               # База знаний
│   ├── Onboarding.jsx               # Онбординг новых пользователей
│   ├── PrivacyPolicy.jsx            # Политика конфиденциальности
│   ├── Login.jsx                    # Вход
│   ├── Register.jsx                 # Регистрация
│   ├── ForgotPassword.jsx           # Восстановление пароля
│   └── ResetPassword.jsx            # Сброс пароля
├── components/
│   ├── Navigation/
│   │   └── NavigationMenu.jsx       # Боковое меню
│   ├── dashboard/
│   │   ├── BalanceCard.jsx          # Карточка баланса
│   │   ├── SpendingChart.jsx        # График расходов
│   │   ├── RecentTransactions.jsx   # Последние операции
│   │   ├── BudgetOverview.jsx       # Обзор бюджетов
│   │   ├── AllGoalsProgress.jsx     # Прогресс целей
│   │   ├── NetWorthCard.jsx         # Чистый капитал
│   │   ├── AIInsights.jsx           # AI-инсайты
│   │   ├── PremiumAIAnalytics.jsx   # Premium AI-аналитика
│   │   ├── SafeDailyLimit.jsx       # Безопасный дневной лимит
│   │   ├── EmergencyFund.jsx        # Резервный фонд
│   │   ├── MonthForecast.jsx        # Прогноз на месяц
│   │   ├── QuickFilters.jsx         # Быстрые фильтры
│   │   ├── QuickTemplates.jsx       # Шаблоны операций
│   │   ├── BibleVerse.jsx           # Цитата из Библии
│   │   └── GoalProgress.jsx         # Прогресс цели
│   ├── transactions/
│   │   ├── QuickAddTransaction.jsx  # Модал добавления операции
│   │   ├── SwipeableTransaction.jsx # Транзакция со свайп-действиями
│   │   ├── TemplatesManager.jsx     # Менеджер шаблонов
│   │   ├── ReceiptScanner.jsx       # Сканер чека
│   │   └── ReceiptReviewModal.jsx   # Просмотр отсканированного чека
│   ├── budgets/
│   │   ├── BudgetCard.jsx           # Карточка бюджета
│   │   └── BudgetSummaryExport.jsx  # Экспорт сводки бюджетов
│   ├── goals/
│   │   ├── GoalCard.jsx             # Карточка цели
│   │   ├── GoalContributions.jsx    # Взносы в цель
│   │   ├── AutoDistributeModal.jsx  # Автораспределение по целям
│   │   └── SubgoalsManager.jsx      # Управление подцелями
│   ├── child/
│   │   ├── ChildDashboard.jsx       # Детский режим
│   │   ├── DailyQuests.jsx          # Ежедневные квесты
│   │   ├── CoinCounter.jsx          # Счётчик монет
│   │   └── CoinAnimation.jsx        # Анимация монет
│   ├── mobile/
│   │   ├── MobileSelect.jsx         # Адаптивный select
│   │   └── MobilePopover.jsx        # Мобильный popover
│   ├── settings/
│   │   ├── PersonalizationSettings.jsx
│   │   └── AIModelSettings.jsx
│   ├── onboarding/
│   │   └── ThemeSelector.jsx        # Выбор темы при онбординге
│   ├── ui/                          # shadcn/ui компоненты (стандартные)
│   ├── VoiceTransactionButton.jsx   # Голосовой ввод транзакции
│   ├── MobileTabShell.jsx           # Мобильный таб-шелл
│   ├── NotificationBell.jsx         # Колокольчик уведомлений
│   ├── FamilyDataWrapper.jsx        # Утилиты семейных данных
│   ├── CalendarExport.jsx           # Экспорт в .ics
│   ├── GoogleDriveBackup.jsx        # Бэкап в Google Drive
│   ├── SubscriptionManager.jsx      # Управление подпиской
│   ├── SplashScreen.jsx             # Экран загрузки
│   ├── OfflineBanner.jsx            # Баннер офлайн-режима
│   ├── PullToRefresh.jsx            # Pull-to-refresh
│   ├── ProtectedRoute.jsx           # Защита маршрутов
│   ├── UserNotRegisteredError.jsx   # Ошибка регистрации
│   ├── AuthLayout.jsx               # Макет авторизации
│   ├── ThemeToggle.jsx              # Переключатель темы
│   ├── GoogleIcon.jsx               # Иконка Google
│   └── GoogleDriveBackup.jsx        # Бэкап GDrive
├── hooks/
│   └── use-mobile.jsx               # Хук определения мобильного
├── lib/
│   ├── AuthContext.jsx              # Контекст авторизации
│   ├── query-client.js              # Настройка React Query
│   ├── NavigationTracker.jsx        # Отслеживание навигации
│   ├── PageNotFound.jsx             # 404 страница
│   ├── app-params.js                # Параметры приложения (appId, token)
│   └── utils.js                     # cn() и другие утилиты
├── api/
│   └── base44Client.js              # Инициализация Base44 SDK
└── utils/
    └── index.ts                     # createPageUrl и др. утилиты

base44/
├── entities/                        # Схемы данных (JSON Schema + RLS)
│   ├── Transaction.jsonc
│   ├── Account.jsonc
│   ├── Budget.jsonc
│   ├── Goal.jsonc
│   ├── Investment.jsonc
│   ├── Family.jsonc
│   ├── Category.jsonc
│   ├── TransactionTemplate.jsonc
│   ├── Task.jsonc
│   ├── Note.jsonc
│   ├── ChildExpense.jsonc
│   └── ChildGameProfile.jsonc
└── functions/                       # Backend-функции (Deno)
    ├── voiceTransaction/entry.ts    # Голосовой ввод (Whisper + GPT)
    ├── categorizeTransaction/entry.ts
    ├── updateBudgetOnTransaction/entry.ts
    ├── analyzeBudgetAI/entry.ts
    ├── sendBudgetNudge/entry.ts
    ├── migrateFamilyData/entry.ts
    ├── monthlyFamilyReport/entry.ts
    ├── backupFinancialReports/entry.ts
    ├── backupToGoogleDrive/entry.ts
    ├── saveBudgetSummary/entry.ts
    ├── initializeDemoMode/entry.ts
    ├── processReferral/entry.ts
    └── applyInactivityPenalty/entry.ts
```

---

## 🗄️ СХЕМЫ СУЩНОСТЕЙ (Entities)

### Transaction
```json
{
  "type": "income|expense|transfer",
  "amount": number,
  "currency": "RUB",
  "category": string,
  "subcategory": string,
  "description": string,
  "date": "ISO datetime",
  "account_id": string,
  "family_member_id": string,
  "tags": [string],
  "is_recurring": boolean,
  "recurring_period": "daily|weekly|monthly|yearly",
  "attachment_url": string,
  "family_id": string,
  "user_id": string
}
```

### Account
```json
{
  "name": string,
  "type": "cash|card|bank_account|savings|credit",
  "balance": number,
  "currency": "RUB",
  "color": string,
  "icon": string,
  "is_active": boolean,
  "credit_limit": number,
  "family_id": string,
  "user_id": string
}
```

### Budget
```json
{
  "name": string,
  "category": string,
  "categories": [string],
  "limit_amount": number,
  "spent_amount": number,
  "period": "weekly|monthly|quarterly|yearly",
  "start_date": "date",
  "end_date": "date",
  "currency": "RUB",
  "color": string,
  "notify_at_percent": 80,
  "family_id": string,
  "user_id": string,
  "is_active": boolean,
  "is_family_budget": boolean,
  "share_with": [string],
  "notification_sent": boolean,
  "approval_status": "pending|approved|rejected",
  "pending_approval_from": string
}
```

### Goal
```json
{
  "title": string,
  "type": "savings|debt_payoff|investment|purchase|emergency_fund|other",
  "target_amount": number,
  "current_amount": number,
  "currency": "RUB",
  "deadline": "date",
  "priority": "low|medium|high",
  "color": string,
  "icon": string,
  "auto_contribute": boolean,
  "monthly_contribution": number,
  "family_id": string,
  "status": "active|completed|paused",
  "is_family_goal": boolean,
  "share_with": [string],
  "subgoals": [{id, title, target_amount, current_amount, status}],
  "contributions": [{user_id, user_name, amount, date}],
  "notification_sent": boolean
}
```

### Investment
```json
{
  "name": string,
  "type": "stocks|crypto|etf|bonds|deposit|real_estate|precious_metals|other",
  "ticker": string,
  "quantity": number,
  "purchase_price": number,
  "current_price": number,
  "purchase_date": "date",
  "currency": "RUB",
  "broker": string,
  "notes": string,
  "family_id": string,
  "user_id": string,
  "color": string
}
```

### Family
```json
{
  "name": string,
  "owner_id": string,
  "currency": "RUB",
  "members": [{user_id, name, display_name, role: "admin|editor|viewer", avatar_color}],
  "invite_code": string,
  "subscription_tier": "free|premium|family",
  "subscription_end_date": "date"
}
```

### Category
```json
{
  "name": string,
  "type": "income|expense",
  "icon": string,
  "color": string,
  "parent_id": string,
  "is_system": boolean,
  "budget_default": number
}
```

### TransactionTemplate
```json
{
  "name": string,
  "type": "income|expense",
  "amount": number,
  "category": string,
  "subcategory": string,
  "account_id": string,
  "description": string,
  "icon": string,
  "color": string,
  "sort_order": number
}
```

### Task
```json
{
  "title": string,
  "description": string,
  "type": "financial|personal|family",
  "due_date": "datetime",
  "reminder_date": "datetime",
  "priority": "low|medium|high",
  "status": "pending|in_progress|completed",
  "linked_goal_id": string,
  "linked_budget_id": string,
  "amount": number,
  "is_recurring": boolean,
  "recurring_period": "daily|weekly|monthly|yearly",
  "assigned_to": string,
  "family_id": string
}
```

### Note
```json
{
  "title": string,
  "content": string,
  "category": "verse|personal|financial|other",
  "source": string
}
```

### ChildExpense
```json
{
  "child_name": string,
  "category": "food|education|health|clothes|entertainment|other",
  "amount": number,
  "date": "date",
  "description": string,
  "family_id": string,
  "user_id": string
}
```

### ChildGameProfile
```json
{
  "user_id": string,
  "total_coins": number,
  "last_daily_login": "date",
  "daily_transactions_count": number,
  "last_transaction_date": "date",
  "level": number,
  "streak_days": number,
  "achievements": [string]
}
```

---

## 🔐 АВТОРИЗАЦИЯ И РОУТИНГ

### Поток авторизации
1. `App.jsx` → `AuthProvider` (AuthContext.jsx) при монтировании вызывает `checkAppState()`
2. `checkAppState()` → GET `/api/apps/public/prod/public-settings/by-id/{appId}` (проверка токена в сессии)
3. Если токен есть → `checkUserAuth()` → `base44.auth.me()`
4. Если 403 `auth_required` → редирект на `/login`
5. Если 403 `user_not_registered` → показывает `UserNotRegisteredError`
6. `SplashScreen` показывается 3 сек при старте, после чего устанавливает `splashDone=true` и фаза `done` удаляет его из DOM

### Маршруты
| Путь | Компонент | Доступ |
|------|----------|--------|
| `/login` | Login | Публичный |
| `/register` | Register | Публичный |
| `/forgot-password` | ForgotPassword | Публичный |
| `/reset-password` | ResetPassword | Публичный |
| `/` | Dashboard | Защищённый |
| `/Accounts` | Accounts | Защищённый |
| `/Budgets` | Budgets | Защищённый |
| `/Goals` | Goals | Защищённый |
| `/Transactions` | Transactions | Защищённый |
| `/Analytics` | Analytics | Защищённый |
| `/Investments` | Investments | Защищённый |
| `/AIAssistant` | AIAssistant | Защищённый |
| `/Family` | Family | Защищённый |
| `/FamilyFinances` | FamilyFinances | Защищённый |
| `/Settings` | Settings | Защищённый |
| `/Categories` | Categories | Защищённый |
| `/Notes` | Notes | Защищённый |
| `/Tasks` | Tasks | Защищённый |
| `/ChildExpenses` | ChildExpenses | Защищённый |
| `/FinancialPlanning` | FinancialPlanning | Защищённый |
| `/DebtAnalytics` | DebtAnalytics | Защищённый |
| `/Backup` | Backup | Защищённый |
| `/BackupReports` | BackupReports | Защищённый |
| `/CleanupDuplicates` | CleanupDuplicates | Защищённый |
| `/Referral` | Referral | Защищённый |
| `/Subscription` | Subscription | Защищённый |
| `/Admin` | Admin | Защищённый |
| `/HelpCenter` | HelpCenter | Защищённый |
| `/Onboarding` | Onboarding | Защищённый |
| `/PrivacyPolicy` | PrivacyPolicy | Защищённый |

---

## 💡 КЛЮЧЕВАЯ БИЗНЕС-ЛОГИКА

### 1. Транзакции — баланс счёта
**При создании расхода** (`expense`):
- Проверить: счёт не кредитный → баланс - сумма >= 0, иначе показать ошибку
- Кредитный счёт: разрешить уйти в минус
- `Account.balance -= amount`

**При создании дохода** (`income`):
- `Account.balance += amount`

**При удалении транзакции** (`Transactions.jsx → deleteMutation`):
- Если `expense` → `Account.balance += amount` (возврат)
- Если `income` → `Account.balance -= amount` (откат)
- Тип `transfer` — баланс не меняется при удалении (только запись удаляется)

**При редактировании** — изменение суммы НЕ пересчитывает баланс автоматически (только запись обновляется)

### 2. Переводы (transfer)
- Если `toAccountId` начинается с `goal_` → перевод в цель:
  - `Goal.current_amount += amount`
  - Если `current_amount >= target_amount` → `Goal.status = 'completed'`
- Иначе → перевод между счетами:
  - `sourceAccount.balance -= amount`
  - `destAccount.balance += amount`
- Создаётся запись Transaction с `category = 'Перенос на цель'` или `'Перенос между счетами'`

### 3. Бюджеты — подсчёт расходов
`getBudgetSpent(budget)` — считает сумму транзакций типа `expense` за период бюджета:
- `weekly` → с начала текущей недели (воскресенье = день 0)
- `monthly` → с 1-го числа текущего месяца
- `quarterly` → с начала квартала (янв/апр/июл/окт)
- `yearly` → с 1 января
- Фильтр по категориям: `budget.categories` (массив) ИЛИ `budget.category` (устаревшее поле)
- Если `categories` пустой → считает ВСЕ расходы

**SafeDailyLimit (безопасный лимит/день):**
```
daysLeft = дней до конца месяца включая сегодня (минимум 1)
remaining = max(0, totalLimit - totalSpent)
dailyLimit = remaining / daysLeft
```
Использует `budget.spent_amount` (из базы), а не живой подсчёт из транзакций.

### 4. Цели — пополнение
`handleAddFunds` (Goals.jsx):
- `Account.balance -= amount`
- `Goal.current_amount += amount`
- Если `current_amount >= target_amount` → `status = 'completed'`
- Создаётся Transaction `type='transfer'`, `category='Перенос на цель'`

`handleSpendFromGoal`:
- `Goal.current_amount -= amount` (но не меньше 0)
- Создаётся Transaction `type='expense'` с выбранной категорией
- **Баланс счёта НЕ меняется** при трате из цели

### 5. Net Worth (чистый капитал)
```
totalAssets = сумма max(balance, 0) по счетам
totalDebts = сумма abs(min(balance, 0)) по счетам
investmentValue = sum(quantity * (current_price || purchase_price))
netWorth = totalAssets + investmentValue - totalDebts
```

### 6. Общий баланс на Dashboard
```
totalBalance = сумма max(balance, 0) по displayAccounts
```
— только положительные балансы (активы), кредитные долги не вычитаются.
На странице Accounts `totalBalance = сумма всех балансов` (включая отрицательные).

### 7. Инвестиции
```
investmentValue = sum(quantity * (current_price || purchase_price))
investmentProfit = sum(quantity * ((current_price || purchase_price) - purchase_price))
```
Если `current_price` не задан — прибыль = 0.

### 8. Уведомления по бюджетам
- Проверяются при каждом рендере страницы Budgets + каждый час
- Email отправляется если `percent >= notify_at_percent` (по умолчанию 80%)
- После отправки: `budget.notification_sent = true`
- `notification_sent` сбрасывается вручную или при создании нового периода

### 9. Уведомления по целям
- Проверяются при монтировании Goals + каждые 24 часа
- Email при daysLeft == 7, 3 или 1 до deadline
- После отправки: `goal.notification_sent = true`

---

## 🔄 BACKEND-ФУНКЦИИ (Deno)

| Функция | Назначение |
|---------|-----------|
| `voiceTransaction` | Расшифровка аудио (Whisper) + извлечение данных транзакции (GPT) |
| `categorizeTransaction` | AI-категоризация по описанию |
| `updateBudgetOnTransaction` | Автообновление `budget.spent_amount` при создании транзакции (entity automation) |
| `analyzeBudgetAI` | AI-анализ бюджетов и рекомендации |
| `sendBudgetNudge` | Напоминания о превышении бюджета |
| `migrateFamilyData` | Перенос данных при вступлении в семью |
| `monthlyFamilyReport` | Ежемесячный семейный отчёт по email |
| `backupFinancialReports` | Создание отчётов для резервных копий |
| `backupToGoogleDrive` | Бэкап данных в Google Drive |
| `saveBudgetSummary` | Сохранение сводки бюджета |
| `initializeDemoMode` | Инициализация демо-данных |
| `processReferral` | Обработка реферальных ссылок |
| `applyInactivityPenalty` | Штраф монет за неактивность (детский режим) |

### Automation: updateBudgetOnTransaction
- Тип: entity automation (при создании Transaction)
- Действие: при `type === 'expense'` ищет активные бюджеты с соответствующей категорией, увеличивает `spent_amount`

---

## 🎨 ТЕМЫ И РЕЖИМЫ

### Режимы интерфейса (user.theme_preference)
| Значение | Поведение |
|---------|----------|
| `null` | При первом входе показывает ThemeSelector |
| `'standard'` | Обычный тёмный интерфейс |
| `'child'` | Детский режим: ChildDashboard, скрыты взрослые меню |
| `'dark'` | Тёмная тема |

### Роли пользователя (user.role)
- `'admin'` — полный доступ, может видеть Admin панель
- `'user'` — обычный пользователь

### Семья
- Пользователь может состоять в одной семье
- Роли в семье: `admin`, `editor`, `viewer`
- Семейные данные видны всем членам семьи через RLS

---

## 🔌 ВНЕШНИЕ ИНТЕГРАЦИИ

| Интеграция | Использование |
|-----------|--------------|
| Base44 Core LLM (InvokeLLM) | AI-инсайты, категоризация, анализ бюджетов |
| Base44 Whisper (TranscribeAudio) | Голосовой ввод транзакций |
| Base44 SendEmail | Уведомления о бюджетах/целях |
| Base44 UploadFile | Загрузка чеков и вложений |
| Base44 ExtractDataFromUploadedFile | Распознавание данных из чека |
| Google Drive (OAuth) | Резервные копии |

---

## ⚠️ ИЗВЕСТНЫЕ ОСОБЕННОСТИ И ОГРАНИЧЕНИЯ

### Критические нюансы для миграции:

1. **SplashScreen**: Фаза `'done'` должна устанавливаться одновременно с `onFinish()`, иначе компонент остаётся в DOM и блокирует клики.

2. **Фильтрация транзакций на Dashboard**: Используется `t.created_by === user.email` (строка email), а не `t.created_by_id === user.id`. При миграции убедитесь что поле `created_by` (email строка) заполняется.

3. **Период 'week' в updatePeriod**: Код с мутацией `now` переменной:
   ```js
   start = new Date(now.setDate(now.getDate() - now.getDay()));
   end = new Date(now.setDate(start.getDate() + 6));
   ```
   `now` мутируется, `start.getDate()` возвращает уже изменённое значение — на большинстве платформ работает корректно, но при тестировании проверьте воскресенье/понедельник.

4. **Редактирование транзакции не пересчитывает баланс**: При изменении суммы существующей транзакции баланс счёта остаётся прежним. Это намеренное поведение (упрощение).

5. **`spent_amount` в бюджетах**: Поле в базе обновляется через automation `updateBudgetOnTransaction`. На Dashboard используется `b.spent_amount` из базы (SafeDailyLimit). На странице Budgets `getBudgetSpent()` считает live из транзакций — возможны расхождения если automation не сработал.

6. **Детский режим**: `ChildDashboard` показывается если `user.theme_preference === 'child' && user.role !== 'admin'` — администратор всегда видит взрослый дашборд.

7. **Onboarding**: При входе проверяется `user.onboarding_complete !== true` — если false, редирект на `/Onboarding`.

8. **Семейные данные**: `addFamilyId()` автоматически добавляет `family_id` и `user_id` к данным при создании. Без этого данные не привязываются к семье.

9. **Мобильный режим**: `MobileTabShell` рендерится вместо children для страниц Dashboard/Transactions/Goals/Settings на мобильных устройствах.

10. **Google Drive бэкап**: Требует авторизации коннектора `googledrive` через OAuth.

---

## 🚀 ЧТО НУЖНО ДЛЯ ДЕПЛОЯ НА НОВЫЙ СЕРВЕР

### Вариант A: Остаётся на Base44 (рекомендуется)
Всё уже работает — просто опубликуйте приложение через панель Base44.

### Вариант B: Перенос на свой сервер (полный)

#### 1. База данных
- Создайте MongoDB или PostgreSQL
- Перенесите схемы сущностей (см. раздел "Схемы сущностей")
- Реализуйте RLS-логику (Row-Level Security) через middleware:
  - `created_by_id === user.id` — личные записи
  - `family_id === user.family_id` — семейные записи
  - `share_with contains user.id` — поделённые записи
  - `role === 'admin'` — полный доступ

#### 2. Backend API
Реализуйте REST API:
- `GET/POST/PUT/DELETE /api/entities/{EntityName}` — CRUD
- `POST /api/auth/login` — вход
- `POST /api/auth/register` — регистрация
- `GET /api/auth/me` — текущий пользователь
- `POST /api/auth/logout`
- `POST /api/auth/reset-password-request`
- `POST /api/auth/reset-password`
- `POST /api/functions/{functionName}` — вызов backend-функций

#### 3. Backend-функции
Перепишите `base44/functions/*/entry.ts` на Node.js/Express или сохраните как Deno-функции (они уже написаны для Deno).

#### 4. Frontend
```bash
npm install
npm run build
# Статика в dist/ — деплоить на Nginx/Vercel/Netlify
```

#### 5. Env переменные
```env
VITE_BASE44_APP_ID=your_app_id
OPENAI_API_KEY=sk-...          # Для AI-функций
GOOGLE_DRIVE_CLIENT_ID=...     # Для Google Drive
GOOGLE_DRIVE_CLIENT_SECRET=... # Для Google Drive
```

#### 6. Замена Base44 SDK
В `src/api/base44Client.js` заменить импорт на ваш HTTP-клиент (axios/fetch) с теми же методами:
- `base44.entities.EntityName.list()`
- `base44.entities.EntityName.filter(query)`
- `base44.entities.EntityName.create(data)`
- `base44.entities.EntityName.update(id, data)`
- `base44.entities.EntityName.delete(id)`
- `base44.auth.me()`
- `base44.auth.logout()`
- `base44.integrations.Core.InvokeLLM(params)`
- `base44.integrations.Core.SendEmail(params)`
- `base44.integrations.Core.UploadFile(params)`
- `base44.integrations.Core.TranscribeAudio(params)`
- `base44.integrations.Core.ExtractDataFromUploadedFile(params)`
- `base44.functions.invoke(name, payload)`

---

## 📊 ЛОГИКА ВЫЧИСЛЕНИЙ — ИТОГОВАЯ ПРОВЕРКА

| Расчёт | Формула | Статус |
|--------|---------|--------|
| Баланс счёта (расход) | `balance - amount` | ✅ Верно |
| Баланс счёта (доход) | `balance + amount` | ✅ Верно |
| Баланс счёта (откат расхода при удалении) | `balance + amount` | ✅ Верно |
| Баланс при переводе | `src.balance - amount`, `dst.balance + amount` | ✅ Верно |
| Перевод в цель | `goal.current_amount + amount`, `src.balance - amount` | ✅ Верно |
| Трата из цели | `goal.current_amount - amount` (≥ 0) | ✅ Верно, счёт не меняется |
| Net Worth | `assets + investments - debts` | ✅ Верно |
| Dashboard totalBalance | `sum(max(balance,0))` только активы | ✅ Намеренно |
| investmentValue | `sum(qty * (current_price || purchase_price))` | ✅ Верно |
| investmentProfit | `sum(qty * (current-purchase))` | ✅ Верно |
| getBudgetSpent | Транзакции expense за период по категориям | ✅ Верно |
| SafeDailyLimit | `(totalLimit - totalSpent) / daysLeft` | ✅ Верно |
| % прогресса цели | `current_amount / target_amount * 100` (cap 100%) | ✅ Верно |
| Доступный кредит | `credit_limit + balance` (balance отрицательный) | ✅ Верно |
| Период week | Мутация now (воскресенье = start) | ⚠️ Работает, но проверить на краях |

---

*Документ создан автоматически на основе анализа исходного кода. Обновлять при изменении бизнес-логики.*