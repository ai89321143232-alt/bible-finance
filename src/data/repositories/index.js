// ============================================================
// data/repositories/index.js — ФАБРИКА РЕПОЗИТОРИЕВ
// ============================================================
// Единая точка получения репозитория для сущности.
// Сервисы получают репозитории ТОЛЬКО отсюда — не создают напрямую.
//
// МИГРАЦИЯ НА POSTGRESQL:
//   Заменить создание Base44Repository на PostgresRepository здесь —
//   и всё приложение переключится на новый бэкенд.
//   Например:
//     const impl = USE_POSTGRES
//       ? new PostgresRepository(name)
//       : new Base44Repository(name);
// ============================================================

import { Base44Repository } from './Base44Repository';
import { SupabaseRepository } from './SupabaseRepository';

// Переключатель бэкенда: true — работать через Supabase/PostgreSQL, false — через Base44.
const USE_SUPABASE = true;

const _cache = {};

/**
 * Возвращает (кэшированный) репозиторий для сущности.
 * @param {string} entityName
 * @returns {Base44Repository|SupabaseRepository}
 */
export const getRepository = (entityName) => {
  if (!_cache[entityName]) {
    _cache[entityName] = USE_SUPABASE
      ? new SupabaseRepository(entityName)
      : new Base44Repository(entityName);
  }
  return _cache[entityName];
};

export { Base44Repository, SupabaseRepository };
export default getRepository;