// ============================================================
// lib/offlineQueue.js — ОЧЕРЕДЬ ОФЛАЙН-ТРАНЗАКЦИЙ
// ============================================================
// Когда нет интернета, транзакции сохраняются в localStorage
// и отправляются на сервер при восстановлении связи.
//
// Структура записи в очереди:
//   { id, type, amount, category, description, date, account_id,
//     user_id, family_id, workspace_id, created_at }
//
// API:
//   enqueue(data)     — добавить в очередь
//   dequeue()         — извлечь первую запись
//   peekAll()         — получить все записи (без удаления)
//   count()           — количество ожидающих
//   clear()           — очистить очередь
//   processQueue(fn)  — обработать очередь: вызывает fn для каждой
//                       записи, удаляет успешно обработанные
// ============================================================

const STORAGE_KEY = 'bible_finance_offline_queue';

const safeRead = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const safeWrite = (queue) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('offlineQueue: не удалось записать в localStorage', e);
  }
};

export const offlineQueue = {
  enqueue(data) {
    const queue = safeRead();
    const entry = {
      ...data,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    queue.push(entry);
    safeWrite(queue);
    return entry;
  },

  peekAll() {
    return safeRead();
  },

  count() {
    return safeRead().length;
  },

  remove(id) {
    const queue = safeRead().filter((item) => item.id !== id);
    safeWrite(queue);
  },

  clear() {
    safeWrite([]);
  },

  /**
   * Обрабатывает очередь: для каждой записи вызывает fn(entry).
   * Если fn вернул true — запись удаляется из очереди.
   * Если fn выбросил ошибку — запись остаётся для повторной попытки.
   * @param {(entry: object) => Promise<boolean>} fn
   * @returns {Promise<{processed: number, failed: number}>}
   */
  async processQueue(fn) {
    const queue = safeRead();
    let processed = 0;
    let failed = 0;
    for (const entry of queue) {
      try {
        const ok = await fn(entry);
        if (ok !== false) {
          this.remove(entry.id);
          processed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
        // Прерываем при первой ошибке — сеть может быть нестабильной
        break;
      }
    }
    return { processed, failed };
  },
};

export default offlineQueue;