import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Video, ClipboardList, Users, Construction, ChevronRight } from 'lucide-react';
import { EDUCATION_TOPICS } from '@/data/educationTopics';

// ============================================================
// Education.jsx — страница обучения "Верный Распорядитель"
// ============================================================
export default function Education() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      {/* Hero */}
      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Путь к финансовой свободе по Божьим принципам
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Добро пожаловать в ваш обучающий курс! Здесь вы узнаете, как стать мудрым
          распорядителем ресурсов, которые доверил вам Господь.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <Video className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-foreground">Видео-уроки</div>
              <div className="text-muted-foreground text-xs">Глубокое погружение в каждую тему</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <ClipboardList className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-foreground">Домашние задания</div>
              <div className="text-muted-foreground text-xs">Практика принципов в жизни</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            <Users className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-foreground">Онлайн-встречи</div>
              <div className="text-muted-foreground text-xs">Разбор вопросов раз в неделю</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <Construction className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Раздел находится на стадии активного наполнения контентом. Мы постоянно добавляем новые материалы!
          </p>
        </div>
      </div>

      {/* Темы */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Темы курса</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EDUCATION_TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <Link key={topic.id} to={`/Education/${topic.id}`}>
              <Card className="p-5 h-full hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${topic.color}1A` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: topic.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{topic.title}</div>
                    <div className="text-xs text-muted-foreground mb-1.5">{topic.subtitle}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform mt-1" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}