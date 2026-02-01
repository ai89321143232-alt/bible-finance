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

// Функция-помощник для автоматического добавления family_id к данным
export const addFamilyId = async (data) => {
  try {
    const user = await base44.auth.me();
    if (user.family_id) {
      return { ...data, family_id: user.family_id };
    }
    return data;
  } catch (error) {
    console.error('Error adding family_id:', error);
    return data;
  }
};

export default { useFamilyId, addFamilyId };