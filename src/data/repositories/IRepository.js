// ============================================================
// data/repositories/IRepository.js — КОНТРАКТ РЕПОЗИТОРИЯ
// ============================================================
// Единый интерфейс доступа к данным. Компоненты и сервисы НЕ знают,
// откуда берутся данные — Base44, PostgreSQL или mock.
//
// Любой репозиторий (Base44Repository, PostgresRepository, ...) обязан
// реализовать эти методы с одинаковой сигнатурой. Это делает миграцию
// с Base44 на PostgreSQL возможной без изменения React-компонентов.
//
// Сигнатуры:
//   list(sort?, limit?)      → Promise<Array>
//   filter(query, sort?, limit?) → Promise<Array>
//   get(id)                  → Promise<Object|null>
//   create(data)             → Promise<Object>
//   bulkCreate(dataArray)    → Promise<Array>
//   update(id, data)         → Promise<Object>
//   delete(id)               → Promise<void>
// ============================================================

export class IRepository {
  // eslint-disable-next-line no-unused-vars
  async list(_sort, _limit) { throw new Error('Not implemented: list'); }
  // eslint-disable-next-line no-unused-vars
  async filter(_query, _sort, _limit) { throw new Error('Not implemented: filter'); }
  // eslint-disable-next-line no-unused-vars
  async get(_id) { throw new Error('Not implemented: get'); }
  // eslint-disable-next-line no-unused-vars
  async create(_data) { throw new Error('Not implemented: create'); }
  // eslint-disable-next-line no-unused-vars
  async bulkCreate(_dataArray) { throw new Error('Not implemented: bulkCreate'); }
  // eslint-disable-next-line no-unused-vars
  async update(_id, _data) { throw new Error('Not implemented: update'); }
  // eslint-disable-next-line no-unused-vars
  async delete(_id) { throw new Error('Not implemented: delete'); }
}

export default IRepository;