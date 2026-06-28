import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-16">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Политика конфиденциальности</h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300"
        >
          <p className="text-sm text-slate-500">Последнее обновление: 28 июня 2025 г.</p>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">1. Какие данные мы собираем</h2>
            <p>Приложение «Библия Финансов» собирает следующие данные, которые вы вводите самостоятельно:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Адрес электронной почты (для авторизации)</li>
              <li>Финансовые записи: транзакции, счета, бюджеты, цели и инвестиции</li>
              <li>Данные профиля: имя, фамилия (опционально)</li>
              <li>Анонимные данные об использовании приложения (для улучшения сервиса)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">2. Как мы используем данные</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Предоставление функций приложения (учёт финансов, аналитика)</li>
              <li>Отправка уведомлений по email (только если вы их включили)</li>
              <li>Улучшение работы приложения на основе анонимной статистики</li>
              <li>AI-анализ ваших данных исключительно для формирования персональных рекомендаций внутри приложения</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">3. Хранение данных</h2>
            <p>Все ваши данные хранятся на защищённых серверах. Доступ к вашим финансовым данным имеете только вы (и члены вашей семьи, которых вы явно пригласили). Мы не продаём и не передаём ваши личные данные третьим лицам.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">4. Права пользователя</h2>
            <p>В соответствии с Федеральным законом № 152-ФЗ «О персональных данных» вы имеете право:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Получить доступ к своим данным</li>
              <li>Исправить или обновить свои данные в настройках профиля</li>
              <li>Полностью удалить свой аккаунт и все связанные данные (через Настройки → Удалить аккаунт)</li>
              <li>Экспортировать свои данные в виде отчётов</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">5. Удаление аккаунта</h2>
            <p>Вы можете в любой момент удалить свой аккаунт и все связанные данные в разделе <strong>Настройки → Удалить аккаунт</strong>. После удаления данные не подлежат восстановлению.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">6. Использование AI</h2>
            <p>Для формирования финансовых рекомендаций и анализа ваших данных приложение использует AI-модели. Данные передаются в обезличенном виде и не используются для обучения моделей.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">7. Cookies и аналитика</h2>
            <p>Приложение использует только технически необходимые данные сессии для поддержания авторизации. Мы не используем рекламные трекеры и не передаём данные рекламным сетям.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">8. Контакты</h2>
            <p>По вопросам конфиденциальности и обработки персональных данных свяжитесь с нами через Telegram: <a href="https://t.me/RussianExpert" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">@RussianExpert</a></p>
          </section>

          <div className="mt-8 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl text-sm text-violet-700 dark:text-violet-300">
            Используя приложение «Библия Финансов», вы соглашаетесь с условиями данной политики конфиденциальности.
          </div>
        </motion.div>
      </div>
    </div>
  );
}