import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { EDUCATION_MODULES } from '@/data/educationTopics';

// ============================================================
// useEducationProgress — отслеживание прогресса обучения
// ============================================================
// Хранит массив completed_modules в данных пользователя.
// Модуль N доступен, если N==0 или модуль N-1 завершён.
// Модуль считается завершённым после прохождения теста.
// ============================================================

const STORAGE_KEY = 'education_progress_cache_v2';

const MODULE_ORDER = EDUCATION_MODULES.map(m => m.id);

export function useEducationProgress() {
  const [completedModules, setCompletedModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        const progress = user?.education_progress || {};
        if (mounted) {
          setCompletedModules(progress.completed_modules || []);
        }
      } catch {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached && mounted) {
            setCompletedModules(JSON.parse(cached));
          }
        } catch {}
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isModuleUnlocked = useCallback((index) => {
    if (index === 0) return true;
    return completedModules.includes(MODULE_ORDER[index - 1]);
  }, [completedModules]);

  const isModuleCompleted = useCallback((moduleId) => {
    return completedModules.includes(moduleId);
  }, [completedModules]);

  const completeModule = useCallback(async (moduleId) => {
    if (completedModules.includes(moduleId)) return;
    const updated = [...completedModules, moduleId];
    setCompletedModules(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    try {
      await base44.auth.updateMe({
        education_progress: { completed_modules: updated },
      });
    } catch {}
  }, [completedModules]);

  const resetProgress = useCallback(async () => {
    setCompletedModules([]);
    localStorage.removeItem(STORAGE_KEY);
    try {
      await base44.auth.updateMe({
        education_progress: { completed_modules: [] },
      });
    } catch {}
  }, []);

  const progressPercent = MODULE_ORDER.length > 0
    ? Math.round((completedModules.filter(id => MODULE_ORDER.includes(id)).length / MODULE_ORDER.length) * 100)
    : 0;

  return {
    completedModules,
    loading,
    isModuleUnlocked,
    isModuleCompleted,
    completeModule,
    resetProgress,
    progressPercent,
    moduleOrder: MODULE_ORDER,
  };
}