import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OnboardingCheck() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeNewUser();
  }, []);

  const initializeNewUser = async () => {
    if (initialized) return;

    try {
      const user = await base44.auth.me();
      
      // Проверяем, инициализирован ли пользователь
      if (!user.data?.initialized) {
        // Проверяем существующие категории
        const existingCategories = await base44.entities.Category.list();
        
        // Создаем начальные категории только если их нет
        if (existingCategories.length === 0) {
          const defaultCategories = [
            { name: 'Еда', type: 'expense', icon: 'Utensils', color: '#F59E0B', is_system: false },
            { name: 'Транспорт', type: 'expense', icon: 'Car', color: '#3B82F6', is_system: false },
            { name: 'Жильё', type: 'expense', icon: 'Home', color: '#8B5CF6', is_system: false },
            { name: 'Развлечения', type: 'expense', icon: 'Gamepad2', color: '#EC4899', is_system: false },
            { name: 'Здоровье', type: 'expense', icon: 'Heart', color: '#10B981', is_system: false },
            { name: 'Одежда', type: 'expense', icon: 'Shirt', color: '#6366F1', is_system: false },
            { name: 'Зарплата', type: 'income', icon: 'Wallet', color: '#10B981', is_system: false },
            { name: 'Фриланс', type: 'income', icon: 'Laptop', color: '#3B82F6', is_system: false },
          ];

          // Создаем категории
          await Promise.all(
            defaultCategories.map(cat => 
              base44.entities.Category.create(cat).catch(() => {})
            )
          );
        }

        // Помечаем пользователя как инициализированного
        await base44.auth.updateMe({ initialized: true });
      }

      setInitialized(true);
    } catch (error) {
      console.error('Onboarding error:', error);
      setInitialized(true);
    }
  };

  return null;
}