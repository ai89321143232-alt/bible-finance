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

const _cache = {};

/**
 * Возвращает (кэшированный) репозиторий для сущности.
 * @param {string} entityName
 * @returns {Base44Repository}
 */
export const getRepository = (entityName) => {
  if (!_cache[entityName]) {
    _cache[entityName] = new Base44Repository(entityName);
  }
  return _cache[entityName];
};

export { Base44Repository };
export default getRepository;