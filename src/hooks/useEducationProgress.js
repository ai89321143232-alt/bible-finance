import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// ============================================================
// useEducationProgress — отслеживание прогресса обучения
// ============================================================
// Хранит массив completed_lessons в данных пользователя.
// Урок считается доступным, если он первый или предыдущий завершён.
// ============================================================

const STORAGE_KEY = 'education_progress_cache';

export function useEducationProgress(lessonOrder) {
  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Загрузка прогресса
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        const progress = user?.education_progress || {};
        if (mounted) {
          setCompletedLessons(progress.completed_lessons || []);
        }
      } catch {
        // fallback на localStorage
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached && mounted) {
            setCompletedLessons(JSON.parse(cached));
          }
        } catch {}
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isLessonUnlocked = useCallback((index) => {
    if (index === 0) return true;
    return completedLessons.includes(lessonOrder[index - 1]);
  }, [completedLessons, lessonOrder]);

  const isLessonCompleted = useCallback((lessonId) => {
    return completedLessons.includes(lessonId);
  }, [completedLessons]);

  const completeLesson = useCallback(async (lessonId) => {
    if (completedLessons.includes(lessonId)) return;
    const updated = [...completedLessons, lessonId];
    setCompletedLessons(updated);
    // Кэш в localStorage для мгновенного отображения
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Сохранение на сервере
    try {
      await base44.auth.updateMe({
        education_progress: { completed_lessons: updated },
      });
    } catch {}
  }, [completedLessons]);

  const resetProgress = useCallback(async () => {
    setCompletedLessons([]);
    localStorage.removeItem(STORAGE_KEY);
    try {
      await base44.auth.updateMe({
        education_progress: { completed_lessons: [] },
      });
    } catch {}
  }, []);

  const progressPercent = lessonOrder.length > 0
    ? Math.round((completedLessons.filter(id => lessonOrder.includes(id)).length / lessonOrder.length) * 100)
    : 0;

  return {
    completedLessons,
    loading,
    isLessonUnlocked,
    isLessonCompleted,
    completeLesson,
    resetProgress,
    progressPercent,
  };
}