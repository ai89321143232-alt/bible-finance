// ============================================================
// data/repositories/Base44Repository.js — АДАПТЕР ПОВЕРХ Base44
// ============================================================
// Реализация IRepository для текущего бэкенда Base44.
// Единственное место в приложении, где напрямую вызывается
// base44.entities.<Entity>.*  — вся остальная кодовая база
// работает через сервисы, а сервисы — через репозитории.
//
// Чтобы мигрировать на PostgreSQL, достаточно написать
// PostgresRepository с той же сигнатурой и переключить фабрику
// в data/repositories/index.js. React-компоненты не меняются.
// ============================================================

import { base44 } from '@/api/base44Client';
import { IRepository } from './IRepository';

export class Base44Repository extends IRepository {
  /**
   * @param {string} entityName — имя сущности Base44 (напр. 'Transaction')
   */
  constructor(entityName) {
    super();
    this.entityName = entityName;
    this.entity = base44.entities[entityName];
    if (!this.entity) {
      throw new Error(`Base44Repository: неизвестная сущность "${entityName}"`);
    }
  }

  list(sort, limit) {
    return this.entity.list(sort, limit);
  }

  filter(query, sort, limit) {
    return this.entity.filter(query, sort, limit);
  }

  async get(id) {
    try {
      return await this.entity.get(id);
    } catch {
      // Совместимость: если get недоступен/не найдено — пробуем через list
      const all = await this.entity.list();
      return all.find((r) => r.id === id) || null;
    }
  }

  create(data) {
    return this.entity.create(data);
  }

  bulkCreate(dataArray) {
    return this.entity.bulkCreate(dataArray);
  }

  update(id, data) {
    return this.entity.update(id, data);
  }

  delete(id) {
    return this.entity.delete(id);
  }

  /** Подписка на realtime-изменения (специфично для Base44). */
  subscribe(callback) {
    return this.entity.subscribe(callback);
  }
}

export default Base44Repository;