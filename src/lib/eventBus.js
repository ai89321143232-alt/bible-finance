// ============================================================
// lib/eventBus.js — ЦЕНТРАЛЬНАЯ ШИНА СОБЫТИЙ
// ============================================================
// Замена прямых window.dispatchEvent / прямых вызовов между
// компонентами. Слои (сервисы, cache manager, UI) общаются
// через именованные события, не зная друг о друге.
//
// Использование:
//   import { eventBus, EVENTS } from '@/lib/eventBus';
//   const off = eventBus.on(EVENTS.TRANSACTION_CHANGED, (p) => {...});
//   eventBus.emit(EVENTS.TRANSACTION_CHANGED, { id });
//   off(); // отписка
//
// Совместимость: события также ретранслируются в window
// (CustomEvent) — поэтому существующие слушатели
// window.addEventListener('workspace-changed', ...) продолжают работать.
// ============================================================

export const EVENTS = {
  WORKSPACE_CHANGED: 'workspace-changed',
  TRANSACTION_CHANGED: 'transaction-changed',
  ACCOUNT_CHANGED: 'account-changed',
  BUDGET_CHANGED: 'budget-changed',
  GOAL_CHANGED: 'goal-changed',
  PERSONALIZATION_SAVED: 'personalization-saved',
  BACKGROUND_CHANGED: 'background-changed',
  GAMIFICATION_UPDATED: 'gamification-updated',
};

class EventBus {
  constructor() {
    this._handlers = new Map(); // event -> Set<fn>
  }

  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this._handlers.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`eventBus handler error for "${event}":`, err);
      }
    });
    // Ретрансляция в window для обратной совместимости со старыми слушателями
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: payload }));
    }
  }
}

export const eventBus = new EventBus();
export default eventBus;