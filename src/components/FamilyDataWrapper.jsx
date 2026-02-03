import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

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
    if (user?.family_id) {
      return {
        ...data,
        family_id: user.family_id,
        user_id: user.id
      };
    }
    return {
      ...data,
      user_id: user?.id
    };
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
    const dataWithFamily = user?.family_id 
      ? dataArray.map(item => ({ ...item, family_id: user.family_id, user_id: user.id }))
      : dataArray.map(item => ({ ...item, user_id: user?.id }));
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