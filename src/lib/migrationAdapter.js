// ============================================================
// migrationAdapter.js — АДАПТЕР ДЛЯ БУДУЩЕЙ МИГРАЦИИ С BASE44 SDK
// ============================================================
// ЦЕЛЬ ФАЙЛА:
//   Сейчас всё приложение работает через @base44/sdk (base44Client.js).
//   Чтобы в будущем можно было перейти на собственный backend/API
//   без переписывания каждой страницы — весь код приложения должен
//   обращаться к данным ТОЛЬКО через функции этого файла, а не
//   напрямую через `base44.entities.X` / `base44.auth` / `base44.integrations`.
//
//   Сейчас все функции ниже — это просто "прокси" к base44 SDK
//   (никакой функциональности не меняется). Когда будет готов
//   свой backend — нужно будет поменять ТОЛЬКО РЕАЛИЗАЦИЮ внутри
//   этих функций (например, на fetch к своему API), а все места,
//   где эти функции вызываются в коде приложения, менять не придётся.
//
// ⚠️ ВАЖНО: этот файл НЕ убирает зависимость от @base44/sdk сейчас —
//    это лишь единая точка входа (facade), которая упрощает переход
//    в будущем. Реальная миграция потребует:
//      1) Backend, который умеет отдавать те же данные (entities),
//         авторизацию (auth) и интеграции (LLM, файлы и т.д.)
//      2) Замены тела каждой функции ниже на fetch(...)
//      3) Полного тестирования всех страниц приложения
// ============================================================

import { base44 } from '@/api/base44Client';

// ------------------------------------------------------------
// 1. ENTITIES — работа с сущностями (список, создание, обновление, удаление)
// ------------------------------------------------------------
// Пример использования в коде страниц:
//   import { entityList, entityCreate } from '@/lib/migrationAdapter';
//   const tasks = await entityList('Task', '-created_date', 20);
//
// TODO (миграция): заменить тело каждой функции на:
//   const res = await fetch(`${API_BASE_URL}/entities/${entityName}/list`, {...});
//   return res.json();

export async function entityList(entityName, sort, limit) {
  return base44.entities[entityName].list(sort, limit);
}

export async function entityFilter(entityName, query, sort, limit) {
  return base44.entities[entityName].filter(query, sort, limit);
}

export async function entityGet(entityName, id) {
  return base44.entities[entityName].get(id);
}

export async function entityCreate(entityName, data) {
  return base44.entities[entityName].create(data);
}

export async function entityUpdate(entityName, id, data) {
  return base44.entities[entityName].update(id, data);
}

export async function entityDelete(entityName, id) {
  return base44.entities[entityName].delete(id);
}

// ------------------------------------------------------------
// 2. AUTH — авторизация текущего пользователя
// ------------------------------------------------------------
// TODO (миграция): заменить на собственный JWT/сессионный механизм,
// например чтение токена из localStorage и запрос на /auth/me.

export async function authMe() {
  return base44.auth.me();
}

export async function authUpdateMe(data) {
  return base44.auth.updateMe(data);
}

export async function authIsAuthenticated() {
  return base44.auth.isAuthenticated();
}

export async function authLogout(redirectUrl) {
  return base44.auth.logout(redirectUrl);
}

// ------------------------------------------------------------
// 3. INTEGRATIONS — LLM, загрузка файлов, email и т.д.
// ------------------------------------------------------------
// TODO (миграция): каждую интеграцию нужно будет заменить на вызов
// соответствующего внешнего API напрямую (например, OpenAI API вместо
// InvokeLLM, свой SMTP/email-провайдер вместо SendEmail и т.д.)

export async function invokeLLM(params) {
  return base44.integrations.Core.InvokeLLM(params);
}

export async function uploadFile(file) {
  return base44.integrations.Core.UploadFile({ file });
}

export async function sendEmail(params) {
  return base44.integrations.Core.SendEmail(params);
}

// ============================================================
// КАК ПОЛЬЗОВАТЬСЯ ЭТИМ ФАЙЛОМ ПРИ РЕФАКТОРИНГЕ СУЩЕСТВУЮЩЕГО КОДА:
//   Было:  const tasks = await base44.entities.Task.list();
//   Стало: const tasks = await entityList('Task');
//
// Постепенно заменяйте прямые вызовы `base44.*` в страницах и
// компонентах на функции из этого файла — это не меняет поведение
// сейчас, но когда потребуется миграция, менять нужно будет только
// этот один файл, а не весь проект.
// ============================================================