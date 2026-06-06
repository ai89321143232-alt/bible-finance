import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronRight, BookOpen, CreditCard, PieChart, Target, Users, TrendingUp, Bell, Settings, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ARTICLES = [
  {
    category: 'Начало работы',
    icon: '🚀',
    color: 'text-blue-400',
    items: [
      {
        title: 'Как добавить счёт или кошелёк',
        content: `Перейдите в раздел "Счета" через боковое меню. Нажмите кнопку "+" или "Добавить счёт". Укажите название, тип счёта (наличные, карта, банковский счёт, кредитная), начальный баланс и валюту. Счёт появится на главной странице и в форме добавления транзакций.`,
      },
      {
        title: 'Первая транзакция: расход или доход',
        content: `На любой странице нажмите кнопку "+" (плавающая кнопка) или перейдите в раздел "Транзакции". В открывшемся окне выберите тип: Расход, Доход или Перенос. Введите сумму, выберите категорию, укажите счёт и дату. Нажмите "Сохранить" — баланс счёта обновится автоматически.`,
      },
      {
        title: 'Сканирование чека',
        content: `При добавлении транзакции переключитесь на вкладку со значком камеры. Сфотографируйте чек или загрузите фото из галереи. ИИ автоматически распознает сумму, категорию и дату. Проверьте данные и нажмите "Сохранить".`,
      },
    ],
  },
  {
    category: 'Транзакции',
    icon: '💳',
    color: 'text-purple-400',
    items: [
      {
        title: 'Перенос между счетами',
        content: `В форме добавления транзакции выберите тип "Перенос". Укажите счёт-источник, счёт-получатель и сумму. Система спишет деньги с одного счёта и зачислит на другой. Можно также переводить деньги в накопительные цели.`,
      },
      {
        title: 'Фильтрация и поиск транзакций',
        content: `На странице "Транзакции" используйте поиск по описанию вверху списка. Переключайте месяцы стрелками для навигации по периодам. Каждая транзакция показывает категорию, счёт, сумму и дату.`,
      },
      {
        title: 'Редактирование и удаление',
        content: `Нажмите на любую транзакцию в списке, чтобы открыть её для редактирования. Измените нужные поля и сохраните. Для удаления проведите транзакцию влево (свайп) — появится кнопка удаления, или нажмите на иконку корзины в форме редактирования.`,
      },
    ],
  },
  {
    category: 'Бюджеты',
    icon: '📊',
    color: 'text-green-400',
    items: [
      {
        title: 'Создание бюджета',
        content: `Перейдите в раздел "Бюджеты". Нажмите "+" и заполните форму: название, лимит суммы, период (неделя/месяц/квартал/год), категории расходов для отслеживания. Укажите, при каком % от лимита хотите получить уведомление (по умолчанию 80%).`,
      },
      {
        title: 'Как работает отслеживание',
        content: `При каждой новой транзакции-расходе система автоматически обновляет потраченную сумму в соответствующем бюджете. На главной странице и в разделе "Бюджеты" отображается прогресс-бар с текущим расходом относительно лимита.`,
      },
      {
        title: 'Семейный бюджет',
        content: `Если вы состоите в семейной группе, при создании бюджета можно отметить его как "семейный" — тогда он будет виден всем членам семьи. Транзакции любого члена семьи будут учитываться в этом бюджете.`,
      },
    ],
  },
  {
    category: 'Цели накопления',
    icon: '🎯',
    color: 'text-yellow-400',
    items: [
      {
        title: 'Создание цели',
        content: `Перейдите в раздел "Цели". Нажмите "Создать цель". Укажите название, тип (накопления, погашение долга, покупка и т.д.), целевую сумму и срок. Можно задать ежемесячный взнос и включить автоматическое пополнение при переводах.`,
      },
      {
        title: 'Пополнение цели',
        content: `В разделе "Цели" нажмите на нужную цель и кнопку "Пополнить". Или при создании транзакции типа "Перенос" выберите цель в качестве получателя — сумма зачислится на цель.`,
      },
      {
        title: 'Подцели',
        content: `Большую цель можно разбить на подцели. Откройте цель, перейдите на вкладку "Подцели" и добавьте этапы с отдельными суммами. Это помогает отслеживать промежуточный прогресс.`,
      },
    ],
  },
  {
    category: 'Семья',
    icon: '👨‍👩‍👧',
    color: 'text-pink-400',
    items: [
      {
        title: 'Создание семейной группы',
        content: `Перейдите в раздел "Семья". Нажмите "Создать группу", укажите название. После создания вы получите инвайт-код для приглашения членов семьи. Поделитесь кодом с родственниками — они смогут вступить в группу.`,
      },
      {
        title: 'Вступление в семью',
        content: `Перейдите в раздел "Семья". Введите инвайт-код, который вам дал создатель группы. После подтверждения вы получите доступ к общим данным: транзакциям, бюджетам и целям с пометкой "семейные".`,
      },
      {
        title: 'Детский режим',
        content: `В настройках профиля можно включить "Детский режим". Дети видят упрощённый интерфейс с игровыми элементами: монетки за транзакции, уровни, достижения. Это делает финансовое обучение интересным.`,
      },
    ],
  },
  {
    category: 'Аналитика',
    icon: '📈',
    color: 'text-cyan-400',
    items: [
      {
        title: 'Главная страница — обзор',
        content: `На главной странице отображается: общий баланс всех счетов, расходы и доходы за текущий месяц, прогресс бюджетов, прогресс целей, диаграмма расходов по категориям и последние транзакции.`,
      },
      {
        title: 'Детальная аналитика',
        content: `Перейдите в раздел "Аналитика" для подробных отчётов. Здесь доступны: тренды расходов по месяцам, разбивка по категориям, сравнение периодов, динамика баланса и прогнозы.`,
      },
      {
        title: 'ИИ-анализ бюджета',
        content: `В разделе "ИИ-ассистент" или на главной (Premium) доступен ИИ-анализ ваших финансов. Система даёт персональные рекомендации по оптимизации расходов, предупреждает о превышении бюджета и предлагает способы увеличить накопления.`,
      },
    ],
  },
  {
    category: 'Настройки',
    icon: '⚙️',
    color: 'text-slate-400',
    items: [
      {
        title: 'Резервное копирование',
        content: `В разделе "Резервные копии" можно создать экспорт всех данных. Поддерживается сохранение в Google Drive. Для настройки перейдите в Настройки → Резервные копии и подключите аккаунт Google.`,
      },
      {
        title: 'Управление категориями',
        content: `В разделе "Категории" можно создавать свои категории доходов и расходов, выбирать иконку и цвет. Системные категории нельзя удалить, но можно добавить свои подкатегории.`,
      },
      {
        title: 'Смена валюты',
        content: `Перейдите в Настройки → Персонализация. Там можно изменить основную валюту отображения. Обратите внимание: смена валюты меняет только отображение, пересчёт курсов не производится автоматически.`,
      },
    ],
  },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [openCategories, setOpenCategories] = useState({ 0: true });

  const toggleItem = (catIdx, itemIdx) => {
    const key = `${catIdx}-${itemIdx}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (catIdx) => {
    setOpenCategories(prev => ({ ...prev, [catIdx]: !prev[catIdx] }));
  };

  const filteredArticles = searchQuery.trim()
    ? ARTICLES.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : ARTICLES;

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">База знаний</h1>
          </div>
          <p className="text-white/40 text-sm ml-13">Ответы на частые вопросы по работе с приложением</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по статьям..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 text-sm outline-none focus:border-white/25 transition-colors"
          />
        </div>

        {/* Articles */}
        <div className="space-y-3">
          {filteredArticles.map((cat, catIdx) => (
            <div key={catIdx} className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(catIdx)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <span className={`font-semibold text-sm ${cat.color}`}>{cat.category}</span>
                  <span className="text-white/20 text-xs">{cat.items.length} статей</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${openCategories[catIdx] ? 'rotate-180' : ''}`} />
              </button>

              {/* Items */}
              <AnimatePresence>
                {openCategories[catIdx] && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5">
                      {cat.items.map((item, itemIdx) => {
                        const key = `${catIdx}-${itemIdx}`;
                        const isOpen = openItems[key];
                        return (
                          <div key={itemIdx} className="border-b border-white/5 last:border-0">
                            <button
                              onClick={() => toggleItem(catIdx, itemIdx)}
                              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors text-left"
                            >
                              <span className="text-white/80 text-sm font-medium">{item.title}</span>
                              <ChevronRight className={`w-4 h-4 text-white/25 flex-shrink-0 transition-transform ml-3 ${isOpen ? 'rotate-90' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-4">
                                    <p className="text-white/50 text-sm leading-relaxed">{item.content}</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/30 text-sm">По запросу «{searchQuery}» ничего не найдено</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}