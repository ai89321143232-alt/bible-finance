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
        // Создаем начальные категории для нового пользователя
        const defaultCategories = [
          { name: 'Еда', type: 'expense', icon: 'Utensils', color: '#F59E0B', is_system: true },
          { name: 'Транспорт', type: 'expense', icon: 'Car', color: '#3B82F6', is_system: true },
          { name: 'Жильё', type: 'expense', icon: 'Home', color: '#8B5CF6', is_system: true },
          { name: 'Развлечения', type: 'expense', icon: 'Gamepad2', color: '#EC4899', is_system: true },
          { name: 'Здоровье', type: 'expense', icon: 'Heart', color: '#10B981', is_system: true },
          { name: 'Одежда', type: 'expense', icon: 'Shirt', color: '#6366F1', is_system: true },
          { name: 'Зарплата', type: 'income', icon: 'Wallet', color: '#10B981', is_system: true },
          { name: 'Фриланс', type: 'income', icon: 'Laptop', color: '#3B82F6', is_system: true },
        ];

        // Создаем категории
        await Promise.all(
          defaultCategories.map(cat => 
            base44.entities.Category.create(cat).catch(() => {})
          )
        );

        // Создаем стартовый счет с нулевым балансом
        await base44.entities.Account.create({
          name: 'Основной счёт',
          type: 'cash',
          balance: 0,
          currency: 'RUB',
          color: '#8B5CF6',
          icon: 'Wallet',
          is_active: true
        }).catch(() => {});

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