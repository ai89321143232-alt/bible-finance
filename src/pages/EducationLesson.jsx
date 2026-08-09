import React, { useState } from 'react';
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, CheckCircle2, PlayCircle, ClipboardList, ChevronRight, ChevronLeft, Video, Image as ImageIcon } from 'lucide-react';
import { EDUCATION_TOPICS, getEducationTopic } from '@/data/educationTopics';
import { useEducationProgress } from '@/hooks/useEducationProgress';

// ============================================================
// EducationLesson.jsx — страница отдельного урока
// URL: /Education/:lessonId
// Механика: урок доступен только если предыдущие пройдены
// ============================================================
export default function EducationLesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const topic = getEducationTopic(lessonId);
  const [marking, setMarking] = useState(false);

  const lessonOrder = EDUCATION_TOPICS.map(t => t.id);
  const lessonIndex = lessonOrder.indexOf(lessonId);
  const prevTopic = lessonIndex > 0 ? EDUCATION_TOPICS[lessonIndex - 1] : null;
  const nextTopic = lessonIndex < EDUCATION_TOPICS.length - 1 ? EDUCATION_TOPICS[lessonIndex + 1] : null;

  const {
    loading,
    isLessonUnlocked,
    isLessonCompleted,
    completeLesson,
  } = useEducationProgress(lessonOrder);

  if (!topic) {
    return <Navigate to="/Education" replace />;
  }

  const unlocked = loading ? false : isLessonUnlocked(lessonIndex);
  const completed = isLessonCompleted(topic.id);
  const Icon = topic.icon;

  // Заблокированный урок
  if (!loading && !unlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
        <Link
          to="/Education"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Все темы обучения
        </Link>

        <Card className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Урок заблокирован</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Чтобы открыть урок «{topic.title}», сначала пройдите предыдущий урок
            {prevTopic ? ` «${prevTopic.title}»` : ''}.
          </p>
          {prevTopic && (
            <Button onClick={() => navigate(`/Education/${prevTopic.id}`)} className="mt-2">
              Перейти к уроку «{prevTopic.title}»
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const handleComplete = async () => {
    setMarking(true);
    await completeLesson(topic.id);
    setMarking(false);
    if (nextTopic) {
      navigate(`/Education/${nextTopic.id}`);
    } else {
      navigate('/Education');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <Link
        to="/Education"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Все темы обучения
      </Link>

      {/* Заголовок урока */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${topic.color}1A` }}
          >
            <Icon className="w-6 h-6" style={{ color: topic.color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Урок {lessonIndex + 1} из {EDUCATION_TOPICS.length}</span>
              {completed && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Пройден
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{topic.title}</h1>
            <div className="text-sm text-muted-foreground">{topic.subtitle}</div>
          </div>
        </div>

        <p className="mt-4 text-muted-foreground leading-relaxed text-sm">{topic.description}</p>

        {/* Хлебные крошки навигации */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          {prevTopic && (
            <Link to={`/Education/${prevTopic.id}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              {prevTopic.title}
            </Link>
          )}
          {prevTopic && nextTopic && <span className="text-muted-foreground/40">·</span>}
          {nextTopic && (
            <Link to={isLessonCompleted(topic.id) || !nextTopic ? '#' : '#'} className="flex items-center gap-1 text-muted-foreground ml-auto">
              {nextTopic.title}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Видео-урок */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Video className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Видео-урок</h2>
        </div>
        {topic.video_url ? (
          <div className="relative rounded-2xl overflow-hidden border border-border bg-black aspect-video">
            <video
              src={topic.video_url}
              controls
              className="w-full h-full"
              poster={topic.cover_image_url || undefined}
            />
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            {/* Обложка или плейсхолдер */}
            {topic.cover_image_url ? (
              <div className="relative aspect-video">
                <img src={topic.cover_image_url} alt={topic.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    <PlayCircle className="w-9 h-9 text-foreground" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-muted/50">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <PlayCircle className="w-7 h-7 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Видео скоро будет добавлено</span>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Домашнее задание */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Домашнее задание</h2>
        </div>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Задание для этого урока появится здесь совсем скоро. Вы сможете выполнить практическое
            упражнение, чтобы закрепить принцип «{topic.subtitle}» в своей жизни.
          </p>
        </Card>
      </div>

      {/* Кнопка завершения */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {completed ? (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/Education')}
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              Урок пройден
            </Button>
            {nextTopic && (
              <Button
                className="flex-1"
                onClick={() => navigate(`/Education/${nextTopic.id}`)}
              >
                Следующий урок
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </>
        ) : (
          <Button
            className="flex-1 h-11"
            disabled={marking || !topic.video_url}
            onClick={handleComplete}
          >
            {marking ? 'Сохранение…' : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Завершить урок
              </>
            )}
          </Button>
        )}
      </div>

      {!topic.video_url && !completed && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Кнопка завершения станет активной после добавления видео
        </p>
      )}

      {/* Финальное сообщение */}
      {completed && !nextTopic && (
        <Card className="mt-6 p-6 text-center bg-emerald-500/5 border-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <div className="font-semibold text-foreground">Поздравляем! Вы прошли весь курс!</div>
          <p className="text-sm text-muted-foreground mt-1">
            Вы изучили все восемь принципов верного распорядителя. Продолжайте применять их в жизни!
          </p>
        </Card>
      )}
    </div>
  );
}