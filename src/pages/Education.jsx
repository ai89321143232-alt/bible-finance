import React from 'react';
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, CheckCircle2, PlayCircle, ClipboardList, ChevronRight, Video, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { EDUCATION_TOPICS, getEducationTopic } from '@/data/educationTopics';
import { useEducationProgress } from '@/hooks/useEducationProgress';

// ============================================================
// Education.jsx — страница обучения "Верный Распорядитель"
// Механика: уроки открываются последовательно после прохождения
// ============================================================
export default function Education() {
  const navigate = useNavigate();
  const lessonOrder = EDUCATION_TOPICS.map(t => t.id);
  const {
    loading,
    isLessonUnlocked,
    isLessonCompleted,
    progressPercent,
    resetProgress,
  } = useEducationProgress(lessonOrder);

  const completedCount = EDUCATION_TOPICS.filter(t => isLessonCompleted(t.id)).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      {/* Hero с прогрессом */}
      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Путь к финансовой свободе
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed text-sm sm:text-base">
              Восемь библейских принципов мудрого распорядителя. Проходите уроки по порядку — каждый следующий открывается после завершения предыдущего.
            </p>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Ваш прогресс</span>
            <span className="text-sm font-semibold text-primary">{completedCount} / {EDUCATION_TOPICS.length}</span>
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

      {/* Темы курса — вертикальный список как roadmap */}
      <div className="space-y-3">
        {EDUCATION_TOPICS.map((topic, index) => {
          const Icon = topic.icon;
          const unlocked = loading ? false : isLessonUnlocked(index);
          const completed = isLessonCompleted(topic.id);
          const isCurrent = unlocked && !completed;

          return (
            <div key={topic.id}>
              <Card
                className={`p-0 overflow-hidden transition-all duration-200 ${
                  unlocked ? 'hover:shadow-md cursor-pointer' : 'opacity-60'
                }`}
                onClick={() => unlocked && navigate(`/Education/${topic.id}`)}
              >
                <div className="flex items-stretch">
                  {/* Левая полоса-индикатор статуса */}
                  <div
                    className="w-1.5 flex-shrink-0"
                    style={{ backgroundColor: completed ? '#10B981' : unlocked ? topic.color : 'transparent' }}
                  />

                  <div className="flex items-center gap-4 p-4 sm:p-5 flex-1 min-w-0">
                    {/* Номер урока / иконка статуса */}
                    <div className="flex-shrink-0 relative">
                      {completed ? (
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      ) : unlocked ? (
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center ring-2 ring-offset-2 ring-offset-background"
                          style={{ backgroundColor: `${topic.color}1A`, '--tw-ring-color': topic.color }}
                        >
                          <Icon className="w-5 h-5" style={{ color: topic.color }} />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Урок {index + 1}
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
                        {topic.duration_min && (
                          <span className="text-[10px] text-muted-foreground">
                            ~{topic.duration_min} мин
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-foreground mt-0.5">{topic.title}</div>
                      <div className="text-xs text-muted-foreground">{topic.subtitle}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                        {topic.description}
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
            </div>
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