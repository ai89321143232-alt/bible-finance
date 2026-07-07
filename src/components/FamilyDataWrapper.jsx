// ============================================================
// components/FamilyDataWrapper.jsx — ПОМОЩНИК ДЛЯ СЕМЕЙНЫХ ДАННЫХ
// ============================================================
// Предоставляет утилиты для работы с family_id / user_id:
//
//   useFamilyId()          → хук, возвращает { familyId, loading }
//                            используется в компонентах, которым нужен family_id
//
//   addFamilyId(data)      → async функция, добавляет family_id и user_id к объекту данных
//                            перед отправкой в БД. Используется ПЕРЕД каждым create/update
//                            для Transaction, Account, Budget, Goal, Investment, ChildExpense
//                            Пример: const dataWithFamily = await addFamilyId({ amount: 100 })
//
//   createFamilyAwareSDK() → возвращает обёртки над base44.entities с автоматическим
//                            добавлением family_id. Используется редко (см. прямые вызовы)
//
// ЛОГИКА:
//   Если у пользователя есть user.family_id → добавляет { family_id, user_id }
//   Если нет → добавляет только { user_id }
//   RLS (Row Level Security) в entities автоматически фильтрует данные по family_id
// ============================================================

import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// ------------------------------------------------------------
// Workspace-резолвер (Этап 3). workspace_id определяется на СЕРВЕРЕ
// через backend-функцию resolveWorkspace — клиент не может его подделать.
// Результат кэшируется по scope, чтобы не бить бэкенд на каждую запись.
//   scope='family' → family workspace + shared
//   scope='personal' → personal workspace + private
// ------------------------------------------------------------
const _wsCache = {}; // { [scope]: { workspace_id, visibility } }

const resolveWorkspaceFromServer = async (scope) => {
  if (_wsCache[scope]) return _wsCache[scope];
  try {
    const res = await base44.functions.invoke('resolveWorkspace', { scope });
    const data = res?.data || {};
    if (data.workspace_id) {
      _wsCache[scope] = { workspace_id: data.workspace_id, visibility: data.visibility };
      return _wsCache[scope];
    }
  } catch (error) {
    console.error('resolveWorkspace failed:', error);
  }
  return null;
};

// Хук для получения family_id текущего пользователя
export const useFamilyId = () => {
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFamily = async () => {
      try {
        const user = await base44.auth.me();
        setFamilyId(user.family_id || null);
      } catch (error) {
        console.error('Error loading family:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFamily();
  }, []);

  return { familyId, loading };
};

// Функция-помощник для автоматического добавления family_id и user_id к данным
export const addFamilyId = async (data) => {
  try {
    const user = await base44.auth.me();
    const scope = user?.family_id ? 'family' : 'personal';
    const ws = await resolveWorkspaceFromServer(scope);
    const base = user?.family_id
      ? { ...data, family_id: user.family_id, user_id: user.id }
      : { ...data, user_id: user?.id };
    return ws
      ? { ...base, workspace_id: ws.workspace_id, visibility: ws.visibility }
      : base;
  } catch (error) {
    console.error('Error adding family_id:', error);
    return data;
  }
};

// Обёртка для SDK методов с автоматическим добавлением family_id
export const createFamilyAwareSDK = () => {
  const wrapCreate = (entityName) => async (data) => {
    const dataWithFamily = await addFamilyId(data);
    return base44.entities[entityName].create(dataWithFamily);
  };

  const wrapBulkCreate = (entityName) => async (dataArray) => {
    const user = await base44.auth.me();
    const scope = user?.family_id ? 'family' : 'personal';
    const ws = await resolveWorkspaceFromServer(scope);
    const wsFields = ws ? { workspace_id: ws.workspace_id, visibility: ws.visibility } : {};
    const dataWithFamily = user?.family_id
      ? dataArray.map(item => ({ ...item, family_id: user.family_id, user_id: user.id, ...wsFields }))
      : dataArray.map(item => ({ ...item, user_id: user?.id, ...wsFields }));
    return base44.entities[entityName].bulkCreate(dataWithFamily);
  };

  return {
    Transaction: {
      create: wrapCreate('Transaction'),
      bulkCreate: wrapBulkCreate('Transaction'),
      update: base44.entities.Transaction.update,
      delete: base44.entities.Transaction.delete,
      list: base44.entities.Transaction.list,
      filter: base44.entities.Transaction.filter,
    },
    Account: {
      create: wrapCreate('Account'),
      bulkCreate: wrapBulkCreate('Account'),
      update: base44.entities.Account.update,
      delete: base44.entities.Account.delete,
      list: base44.entities.Account.list,
      filter: base44.entities.Account.filter,
    },
    Investment: {
      create: wrapCreate('Investment'),
      bulkCreate: wrapBulkCreate('Investment'),
      update: base44.entities.Investment.update,
      delete: base44.entities.Investment.delete,
      list: base44.entities.Investment.list,
      filter: base44.entities.Investment.filter,
    },
    ChildExpense: {
      create: wrapCreate('ChildExpense'),
      bulkCreate: wrapBulkCreate('ChildExpense'),
      update: base44.entities.ChildExpense.update,
      delete: base44.entities.ChildExpense.delete,
      list: base44.entities.ChildExpense.list,
      filter: base44.entities.ChildExpense.filter,
    },
    Goal: {
      create: wrapCreate('Goal'),
      bulkCreate: wrapBulkCreate('Goal'),
      update: base44.entities.Goal.update,
      delete: base44.entities.Goal.delete,
      list: base44.entities.Goal.list,
      filter: base44.entities.Goal.filter,
    },
    Budget: {
      create: wrapCreate('Budget'),
      bulkCreate: wrapBulkCreate('Budget'),
      update: base44.entities.Budget.update,
      delete: base44.entities.Budget.delete,
      list: base44.entities.Budget.list,
      filter: base44.entities.Budget.filter,
    },
    Task: {
      create: wrapCreate('Task'),
      bulkCreate: wrapBulkCreate('Task'),
      update: base44.entities.Task.update,
      delete: base44.entities.Task.delete,
      list: base44.entities.Task.list,
      filter: base44.entities.Task.filter,
    }
  };
};

export default { useFamilyId, addFamilyId, createFamilyAwareSDK };