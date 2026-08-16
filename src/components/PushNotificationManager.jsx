import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// VAPID public key (безопасно публиковать — используется только для подписки)
const VAPID_PUBLIC_KEY = 'BPwqEPUUL7czTnpEy_kKQ0NnVQ7GD1NBsbPHaFkeqAFk1V7LggPXD-d0ZGjU8gt3ghOXonlimbbo9bcYWnwTdy0';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux/.test(ua)) return 'desktop';
  return 'other';
}

/**
 * PushNotificationManager — невидимый компонент, который:
 * 1. Регистрирует Service Worker
 * 2. Запрашивает разрешение на уведомления
 * 3. Создаёт push-подписку и сохраняет её в PushSubscription
 * 4. Отправляет нативный push через SendPushNotification (для APK)
 *
 * Работает в PWA (Safari iOS 16.4+, Android Chrome) и нативных сборках.
 */
export default function PushNotificationManager() {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // Проверка поддержки
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      // Регистрация Service Worker
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
      } catch (e) {
        return;
      }

      // Проверка — уже есть подписка?
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      let subscription = await reg.pushManager.getSubscription();

      // Если подписки нет — запрашиваем разрешение и создаём
      if (!subscription) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      if (cancelled || !subscription) return;

      // Сохраняем подписку в БД
      const platform = detectPlatform();
      const sub = subscription.toJSON();
      const payload = {
        user_id: undefined, // будет заполнен ниже
        endpoint: sub.endpoint,
        keys_p256dh: sub.keys?.p256dh,
        keys_auth: sub.keys?.auth,
        platform,
        user_agent: navigator.userAgent,
        is_active: true,
      };

      try {
        const user = await base44.auth.me();
        if (user?.id) {
          payload.user_id = user.id;

          // Проверяем — нет ли уже активной подписки с этим endpoint
          const existing = await base44.entities.PushSubscription.filter({
            endpoint: sub.endpoint,
            is_active: true,
          });

          if (existing.length === 0) {
            await base44.entities.PushSubscription.create(payload);
          }
        }
      } catch (e) {
        // Пользователь не авторизован — пропускаем
      }

      setStatus('subscribed');
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, []);

  // Компонент невидимый — только логика
  return null;
}