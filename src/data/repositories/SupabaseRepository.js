// ============================================================
// data/repositories/SupabaseRepository.js — адаптер для Supabase/PostgreSQL
// ============================================================
// Реализует IRepository поверх supabase-js. Имя таблицы = имя сущности
// в lower_snake_case (Base44 entity "Transaction" -> таблица "transactions").
// ============================================================

import { supabase } from '@/lib/supabaseClient';
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

  async list(sort, limit) {
    let query = supabase.from(this.table).select('*');
    query = this._applySort(query, sort);
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async filter(filterQuery = {}, sort, limit) {
    let query = supabase.from(this.table).select('*');
    Object.entries(filterQuery).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    query = this._applySort(query, sort);
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async get(id) {
    const { data, error } = await supabase.from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async create(data) {
    const { data: result, error } = await supabase.from(this.table).insert([data]).select().single();
    if (error) throw error;
    return result;
  }

  async bulkCreate(dataArray) {
    const { data: result, error } = await supabase.from(this.table).insert(dataArray).select();
    if (error) throw error;
    return result;
  }

  async update(id, data) {
    const { data: result, error } = await supabase.from(this.table).update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
  }

  async delete(id) {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  _applySort(query, sort) {
    if (!sort) return query;
    const isDesc = sort.startsWith('-');
    const column = isDesc ? sort.slice(1) : sort;
    return query.order(column, { ascending: !isDesc });
  }
}

export default SupabaseRepository;