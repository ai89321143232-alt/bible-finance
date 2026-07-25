import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Хук для автоматической активации демо-периода при первой регистрации
export const useTrialActivation = () => {
  useEffect(() => {
    const activateTrial = async () => {
      try {
        const user = await base44.auth.me();

        // Администраторы приложения не участвуют в демо/подписке для обычных
        // пользователей — иначе им автоматически включаются premium-функции
        // (например, Telegram-бот) в настройках.
        if (user.role === 'admin') return;

        // Проверяем, нужно ли активировать пробный период
        if (!user.trial_end_date && !user.subscription_plan) {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);
          
          await base44.auth.updateMe({
            subscription_plan: 'premium',
            trial_end_date: trialEndDate.toISOString(),
            is_trial_active: true
          });
          
          console.log('Активирован 14-дневный пробный период');
        }
      } catch (error) {
        console.error('Ошибка при активации пробного периода:', error);
      }
    };
    
    activateTrial();
  }, []);
};

// Функция для проверки активной подписки
export const getSubscriptionStatus = (user) => {
  if (!user) return { plan: 'free', isActive: false, daysLeft: 0 };
  
  // Проверяем активен ли пробный период
  if (user.is_trial_active && user.trial_end_date) {
    const trialEnd = new Date(user.trial_end_date);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
      return {
        plan: 'premium',
        isActive: true,
        isTrial: true,
        daysLeft,
        displayName: 'Premium (Демо)'
      };
    } else {
      // Пробный период истек
      return {
        plan: user.subscription_plan || 'free',
        isActive: user.subscription_plan && user.subscription_plan !== 'free',
        isTrial: false,
        daysLeft: 0,
        displayName: getPlanName(user.subscription_plan || 'free')
      };
    }
  }
  
  // Проверяем платную подписку
  const plan = user.subscription_plan || 'free';
  return {
    plan,
    isActive: plan !== 'free',
    isTrial: false,
    daysLeft: 0,
    displayName: getPlanName(plan)
  };
};

const getPlanName = (plan) => {
  const names = {
    free: 'Бесплатный',
    premium: 'Premium',
    family: 'Family'
  };
  return names[plan] || 'Бесплатный';
};

// Проверка доступа к функциям
export const hasFeatureAccess = (user, feature) => {
  const status = getSubscriptionStatus(user);
  
  // Во время пробного периода доступны все функции Premium
  if (status.isTrial && status.isActive) {
    return true;
  }
  
  const planFeatures = {
    free: ['basic_analytics', 'limited_transactions', 'limited_budgets'],
    premium: ['basic_analytics', 'unlimited_transactions', 'unlimited_budgets', 'ai_assistant', 'export_reports', 'advanced_analytics'],
    family: ['basic_analytics', 'unlimited_transactions', 'unlimited_budgets', 'ai_assistant', 'export_reports', 'advanced_analytics', 'family_sharing']
  };
  
  const userFeatures = planFeatures[status.plan] || planFeatures.free;
  return userFeatures.includes(feature);
};

export default {
  useTrialActivation,
  getSubscriptionStatus,
  hasFeatureAccess
};