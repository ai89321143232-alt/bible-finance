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