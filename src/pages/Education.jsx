import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2, ChevronRight, RotateCcw, BookOpen, PlayCircle, ClipboardList } from 'lucide-react';
import { EDUCATION_MODULES } from '@/data/educationTopics';
import { useEducationProgress } from '@/hooks/useEducationProgress';

// ============================================================
// Education.jsx — страница обучения "Библейские Принципы Управления Финансами"
// 7 модулей с последовательным открытием
// ============================================================
export default function Education() {
  const navigate = useNavigate();
  const {
    loading,
    isModuleUnlocked,
    isModuleCompleted,
    progressPercent,
    resetProgress,
  } = useEducationProgress();

  const completedCount = EDUCATION_MODULES.filter(m => isModuleCompleted(m.id)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      {/* Hero с прогрессом */}
      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Библейские принципы управления финансами
            </h1>
            <p className="text-sm text-muted-foreground">Практический онлайн-курс · 7 модулей</p>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          В Библии более 2350 стихов о деньгах и имуществе. Этот курс проведёт вас через 7 модулей —
          от духовного фундамента до преодоления кризисов. Каждый модуль открывается после прохождения предыдущего.
        </p>

        {/* Прогресс-бар */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Ваш прогресс</span>
            <span className="text-sm font-semibold text-primary">{completedCount} / {EDUCATION_MODULES.length}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{progressPercent}% завершено</div>
        </div>

        {completedCount > 0 && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Сбросить весь прогресс обучения?')) resetProgress();
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Сбросить прогресс
            </Button>
          </div>
        )}
      </div>

      {/* Список модулей */}
      <div className="space-y-3">
        {EDUCATION_MODULES.map((module, index) => {
          const Icon = module.icon;
          const unlocked = loading ? false : isModuleUnlocked(index);
          const completed = isModuleCompleted(module.id);
          const isCurrent = unlocked && !completed;
          const lessonsCount = module.lessons.length;

          return (
            <Card
              key={module.id}
              className={`p-0 overflow-hidden transition-all duration-200 ${
                unlocked ? 'hover:shadow-md cursor-pointer' : 'opacity-60'
              }`}
              onClick={() => unlocked && navigate(`/Education/${module.id}`)}
            >
              <div className="flex items-stretch">
                {/* Левая полоса-индикатор статуса */}
                <div
                  className="w-1.5 flex-shrink-0"
                  style={{ backgroundColor: completed ? '#10B981' : unlocked ? module.color : 'transparent' }}
                />

                <div className="flex items-center gap-4 p-4 sm:p-5 flex-1 min-w-0">
                  {/* Номер модуля / иконка статуса */}
                  <div className="flex-shrink-0">
                    {completed ? (
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    ) : unlocked ? (
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center ring-2 ring-offset-2 ring-offset-background"
                        style={{ backgroundColor: `${module.color}1A`, '--tw-ring-color': module.color }}
                      >
                        <Icon className="w-5 h-5" style={{ color: module.color }} />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Контент */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">
                        Модуль {module.number}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Текущий
                        </span>
                      )}
                      {completed && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Пройден
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {lessonsCount} уроков
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <PlayCircle className="w-3 h-3" />
                        {module.video.duration}
                      </span>
                    </div>
                    <div className="font-semibold text-foreground mt-0.5">{module.title}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                      {module.description}
                    </p>
                  </div>

                  {/* Стрелка / замок */}
                  <div className="flex-shrink-0 self-center">
                    {unlocked ? (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/50" />
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {loading && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Загрузка прогресса…
        </div>
      )}
    </div>
  );
}