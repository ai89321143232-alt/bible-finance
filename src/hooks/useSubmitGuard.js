import { useState, useCallback, useRef } from 'react';

/**
 * useSubmitGuard — защита от повторных срабатываний при двойном нажатии
 * «Сохранить» и при сбоях (тайм-аут БД).
 *
 * Синхронный ref-замок блокирует повторный вход в handleSubmit в одном тике
 * (до того, как React успеет обновить isPending), а isSubmitting отключает
 * кнопку на следующем рендере.
 *
 * Возвращает:
 *   isSubmitting — true, пока идёт сохранение (для disabled кнопки)
 *   lock()       — синхронно захватывает замок; возвращает false, если уже занято
 *   release()    — освобождает замок и сбрасывает isSubmitting
 */
export function useSubmitGuard() {
  const lockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lock = useCallback(() => {
    if (lockRef.current) return false;
    lockRef.current = true;
    setIsSubmitting(true);
    return true;
  }, []);

  const release = useCallback(() => {
    lockRef.current = false;
    setIsSubmitting(false);
  }, []);

  return { isSubmitting, lock, release };
}

export default useSubmitGuard;