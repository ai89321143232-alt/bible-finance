import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ============================================================
// ModalQueue — координатор всплывающих окон дашборда
// ------------------------------------------------------------
// Гарантирует, что одновременно показывается только одна модалка.
// Приоритеты (меньше = раньше):
//   1 — библейский стих
//   2 — попап награды геймификации
//   3 — напоминание о молитве
// Компоненты регистрируют запрос (requestShow) и снимают его (dismiss).
// Активна та модалка, что первой в очереди (отсортированной по приоритету).
// ============================================================

const ModalQueueContext = createContext(null);

export function ModalQueueProvider({ children }) {
  // items: Map<id, { id, priority }>
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  const requestShow = useCallback((id, priority) => {
    setItems((prev) => {
      if (prev.some((it) => it.id === id)) return prev;
      return [...prev, { id, priority }].sort((a, b) => a.priority - b.priority);
    });
  }, []);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  // Активна первая (с наивысшим приоритетом) модалка в очереди
  const activeId = items.length > 0 ? items[0].id : null;

  return (
    <ModalQueueContext.Provider value={{ activeId, requestShow, dismiss }}>
      {children}
    </ModalQueueContext.Provider>
  );
}

export function useModalQueue() {
  const ctx = useContext(ModalQueueContext);
  if (!ctx) {
    // Вне провайдера — разрешаем всё (фолбэк, чтобы не сломать рендер)
    return { activeId: null, requestShow: () => {}, dismiss: () => {} };
  }
  return ctx;
}