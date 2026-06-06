// ============================================================
// api/base44Client.js — ЕДИНЫЙ SDK-КЛИЕНТ
// ============================================================
// Экспортирует объект `base44` — главная точка входа для:
//
//   base44.auth.me()                          → текущий пользователь
//   base44.auth.logout()                      → выход
//   base44.auth.redirectToLogin()             → редирект на логин
//   base44.auth.updateMe(data)                → обновление профиля пользователя
//
//   base44.entities.<EntityName>.list()       → список записей
//   base44.entities.<EntityName>.filter({})   → фильтрация
//   base44.entities.<EntityName>.create({})   → создание
//   base44.entities.<EntityName>.update(id,{})→ обновление
//   base44.entities.<EntityName>.delete(id)   → удаление
//   base44.entities.<EntityName>.subscribe()  → real-time подписка
//
//   base44.integrations.Core.InvokeLLM({})    → вызов AI
//   base44.integrations.Core.SendEmail({})    → отправка email
//   base44.integrations.Core.UploadFile({})   → загрузка файла
//
// Используется ВЕЗДЕ в приложении через: import { base44 } from '@/api/base44Client'
// ============================================================

import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// requiresAuth: false — приложение публичное (не требует обязательного логина)
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});