# 🤖 Промт для Google AI Studio — воссоздание приложения «Библия Финансов» 1-в-1

> Как использовать: откройте Google AI Studio (Gemini), создайте новый чат/промт,
> вставьте весь текст ниже целиком, а также приложите файл `AI_MIGRATION_GUIDE.md`
> (лежит в корне этого проекта) — в нём подробные схемы данных, бизнес-логика и
> маршруты. Этот файл и есть полный технический промт.

---

## ТЕКСТ ПРОМТА (скопируйте всё, что ниже, в Google AI Studio)

```
Ты — senior full-stack разработчик. Твоя задача: воссоздать веб-приложение
"Библия Финансов" (личный/семейный финансовый трекер) 1-в-1 — с тем же
визуальным стилем, той же навигацией и той же бизнес-логикой, но на новом
стеке (без Base44 SDK, только твой backend + React frontend).

### СТЕК, КОТОРЫЙ НУЖНО ИСПОЛЬЗОВАТЬ
- Frontend: React 18 + Vite + react-router-dom v6
- Стили: Tailwind CSS + shadcn/ui компоненты
- Иконки: lucide-react
- Анимации: framer-motion
- Кэш данных: @tanstack/react-query v5
- Графики: recharts
- Даты: date-fns / moment
- Backend: Node.js (Express/Fastify) + PostgreSQL или MongoDB
- Авторизация: JWT (access + refresh токены в httpOnly cookie)

### ДИЗАЙН-СИСТЕМА (токены — воссоздать точно)
Цвета заданы через HSL CSS-переменные в `:root` и `.dark`, подключены в Tailwind
через `tailwind.config.js` (colors.background = hsl(var(--background)) и т.д.):

Светлая тема:
- --background: 0 0% 100%   (белый)
- --foreground: 0 0% 3.9%   (почти чёрный текст)
- --primary: 0 0% 9%        (чёрный, используется для акцентных кнопок/иконки лого)
- --primary-foreground: 0 0% 98%
- --secondary / --muted / --accent: 0 0% 96.1% (светло-серый фон карточек)
- --muted-foreground: 0 0% 45.1%
- --destructive: 0 84.2% 60.2% (красный для ошибок/расходов)
- --border / --input: 0 0% 89.8%
- --radius: 0.5rem (скругления карточек/кнопок)

Тёмная тема (.dark):
- --background: 0 0% 3.9%
- --foreground: 0 0% 98%
- --primary: 0 0% 98% (белый), --primary-foreground: 0 0% 9%
- --muted / --secondary / --accent: 0 0% 14.9%
- --border / --input: 0 0% 14.9%

Общий стиль: минималистичный, монохромный (чёрно-белый + акценты по типу
данных: зелёный для доходов, красный для расходов), rounded-lg карточки,
тонкие border, много воздуха (padding), мобильный bottom-tab-bar на
телефонах и левый sidebar (w-64, fixed) на десктопе.

### СТРУКТУРА ПРИЛОЖЕНИЯ
Полная карта страниц, компонентов, схем сущностей (entities), бизнес-логики
расчётов (баланс счетов, бюджеты, цели, net worth) и списка backend-функций
находится в приложенном файле AI_MIGRATION_GUIDE.md — используй его как
основной источник истины для функционала. Реализуй КАЖДЫЙ раздел оттуда:
- Все сущности (Transaction, Account, Budget, Goal, Investment, Family,
  Category, TransactionTemplate, Task, Note, ChildExpense, ChildGameProfile)
  как таблицы БД с точно такими же полями.
- Всю бизнес-логику из раздела "КЛЮЧЕВАЯ БИЗНЕС-ЛОГИКА" — расчёты баланса,
  бюджетов, целей, net worth должны совпадать формула в формулу.
- Все страницы и маршруты из раздела "Маршруты".
- RLS-логику (кто что видит) реализуй как middleware на backend:
  created_by_id === user.id ИЛИ family_id === user.family_id ИЛИ
  share_with содержит user.id ИЛИ role === 'admin'.

### ЧТО ЗАМЕНИТЬ (вместо Base44 SDK)
- `base44.entities.X.list/filter/create/update/delete` → свои REST-эндпоинты
  `/api/entities/X` с теми же сигнатурами.
- `base44.auth.me()` → `GET /api/auth/me` (JWT из cookie).
- `base44.integrations.Core.InvokeLLM` → прямой вызов OpenAI/Anthropic API.
- `base44.integrations.Core.SendEmail` → SMTP-провайдер (Resend/SendGrid).
- `base44.integrations.Core.UploadFile` → свой файловый storage (S3/local).
- `base44.integrations.Core.TranscribeAudio` → OpenAI Whisper API напрямую.
- Backend-функции (`base44/functions/*/entry.ts`) — перепиши на Express-роуты
  или Node.js Lambda с той же логикой (список функций и их назначение — в
  AI_MIGRATION_GUIDE.md, раздел "BACKEND-ФУНКЦИИ").

### ПОРЯДОК РАБОТЫ
1. Сначала создай схему БД (все сущности + связи).
2. Реализуй auth (регистрация/логин/JWT).
3. Реализуй CRUD REST API для всех сущностей + RLS-проверки.
4. Собери frontend: Layout (sidebar/topbar/mobile tabs) → страницы → компоненты.
5. Подключи дизайн-токены и убедись что визуал совпадает (проверь по
   компонентам BalanceCard, GoalCard, BudgetCard, NavigationMenu).
6. Реализуй бизнес-логику расчётов строго по формулам из гайда.
7. В конце — пройдись по разделу "ИЗВЕСТНЫЕ ОСОБЕННОСТИ И ОГРАНИЧЕНИЯ" в
   AI_MIGRATION_GUIDE.md и убедись, что все нюансы учтены.

Начни с вопроса: какие файлы/данные тебе нужны от меня в первую очередь,
чтобы начать с шага 1 (схема БД)?
```

---

## Что приложить вместе с этим промтом
1. Этот файл (`GOOGLE_AI_STUDIO_PROMPT.md`).
2. `AI_MIGRATION_GUIDE.md` — полные схемы сущностей, бизнес-логика, маршруты, backend-функции.
3. (Опционально, для точности верстки) содержимое `src/index.css`, `tailwind.config.js`, `src/Layout.jsx` — если ИИ поддерживает вложения кода.

## Важно понимать
Google AI Studio не имеет доступа к вашему приватному репозиторию — все нужные файлы нужно вставлять в чат вручную. Часть функционала (Base44-специфичные интеграции, RLS-движок, хостинг) физически привязана к платформе Base44 и при переносе будет работать только после того, как вы реализуете эквивалентный backend самостоятельно.