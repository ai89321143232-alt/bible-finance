// ============================================================
// data/repositories/SupabaseRepository.js — адаптер для Supabase/PostgreSQL
// ============================================================
// Реализует IRepository через бэкенд-функцию supabaseData, которая
// использует service_role ключ Supabase (обходит RLS). Прямой доступ
// с anon-ключом с фронтенда не используется, т.к. RLS блокирует запись.
// Имя таблицы = имя сущности в lower_snake_case
// (Base44 entity "Transaction" -> таблица "transactions").
// ============================================================

import { base44 } from '@/api/base44Client';
import { IRepository } from './IRepository';

const toTableName = (entityName) => {
  // "TransactionTemplate" -> "transaction_templates"
  const snake = entityName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return snake.endsWith('s') ? snake : `${snake}s`;
};

export class SupabaseRepository extends IRepository {
  constructor(entityName) {
    super();
    this.entityName = entityName;
    this.table = toTableName(entityName);
  }

  async _invoke(operation, params = {}) {
    const response = await base44.functions.invoke('supabaseData', {
      table: this.table,
      operation,
      ...params,
    });
    return response.data.result;
  }

  async list(sort, limit) {
    return this._invoke('list', { sort, limit });
  }

  async filter(filterQuery = {}, sort, limit) {
    return this._invoke('filter', { filterQuery, sort, limit });
  }

  async get(id) {
    return this._invoke('get', { id });
  }

  async create(data) {
    return this._invoke('create', { data });
  }

  async bulkCreate(dataArray) {
    return this._invoke('bulkCreate', { dataArray });
  }

  async update(id, data) {
    return this._invoke('update', { id, data });
  }

  async delete(id) {
    return this._invoke('delete', { id });
  }
}

export default SupabaseRepository;