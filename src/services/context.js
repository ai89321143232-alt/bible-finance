// ============================================================
// services/context.js — WORKSPACE / USER КОНТЕКСТ ДЛЯ СЕРВИСОВ
// ============================================================
// Определяет активное пространство и права на СЕРВЕРЕ (resolveWorkspace),
// чтобы клиент не мог подделать workspace_id. Результат кэшируется по
// активному пространству; кэш сбрасывается по событию workspace-changed.
//
// Это перенос логики из FamilyDataWrapper.addFamilyId в сервисный слой.
// FamilyDataWrapper оставлен как тонкая обёртка ради обратной совместимости.
// ============================================================

import { base44 } from '@/api/base44Client';
import { eventBus, EVENTS } from '@/lib/eventBus';

const _wsCache = {}; // { [key]: { workspace_id, visibility, type, family_id } }

// Сброс кэша пространства при переключении
eventBus.on(EVENTS.WORKSPACE_CHANGED, () => {
  Object.keys(_wsCache).forEach((k) => delete _wsCache[k]);
});

export const getActiveWorkspaceId = (userId) => {
  try {
    return localStorage.getItem(`active_ws_${userId}`) || null;
  } catch {
    return null;
  }
};

/** Текущий пользователь (через Base44 auth). */
export const getCurrentUser = () => base44.auth.me();

/**
 * Определяет активное пространство пользователя (id + type).
 * Приоритет: сохранённое активное → личное по умолчанию.
 * Важно: scope НЕ должен зависеть только от наличия family_id —
 * иначе запись из личного пространства ошибочно уходит в семейное.
 */
const resolveActiveWorkspace = async (user) => {
  const savedId = getActiveWorkspaceId(user?.id);
  try {
    const memberships = await base44.entities.WorkspaceMember.filter({ user_id: user.id });
    const wsIds = memberships.map((m) => m.workspace_id);
    if (wsIds.length === 0) return { id: savedId || null, type: 'personal' };

    const allWs = await base44.entities.Workspace.list();
    const myWs = allWs.filter((w) => wsIds.includes(w.id));

    const active =
      myWs.find((w) => w.id === savedId) ||
      myWs.find((w) => w.type === 'personal') ||
      myWs[0];

    return active ? { id: active.id, type: active.type } : { id: savedId || null, type: 'personal' };
  } catch {
    return { id: savedId || null, type: 'personal' };
  }
};

/**
 * Резолвит рабочее пространство на сервере для текущего пользователя,
 * с учётом активного выбора. Возвращает { workspace_id, visibility, type, family_id } | null.
 */
export const resolveWorkspaceContext = async (user) => {
  const active = await resolveActiveWorkspace(user);
  // scope определяется по АКТИВНОМУ пространству, а не по наличию семьи
  const scope = active.type === 'family' ? 'family' : 'personal';
  const key = active.id || scope;
  if (_wsCache[key]) return _wsCache[key];

  try {
    const res = await base44.functions.invoke('resolveWorkspace', {
      scope,
      workspace_id: active.id || undefined,
    });
    const data = res?.data || {};
    if (data.workspace_id) {
      _wsCache[key] = {
        workspace_id: data.workspace_id,
        visibility: data.visibility,
        type: data.type,
        family_id: data.family_id || null,
      };
      return _wsCache[key];
    }
  } catch (error) {
    console.error('resolveWorkspaceContext failed:', error);
  }
  return null;
};

/**
 * Обогащает данные полями принадлежности перед сохранением:
 * user_id, family_id (только в family-пространстве), workspace_id, visibility.
 * Гарантирует, что запись попадёт именно в активное пространство.
 */
export const enrichWithOwnership = async (data, user) => {
  const ws = await resolveWorkspaceContext(user);
  if (!ws) {
    // Фолбэк, если сервер недоступен: family_id проставляем только
    // когда активно именно семейное пространство, а не по факту наличия семьи.
    const active = await resolveActiveWorkspace(user);
    return active.type === 'family' && user?.family_id
      ? { ...data, family_id: user.family_id, user_id: user.id }
      : { ...data, family_id: undefined, user_id: user?.id };
  }
  const familyFields =
    ws.type === 'family'
      ? { family_id: ws.family_id || user.family_id }
      : { family_id: undefined };
  return {
    ...data,
    ...familyFields,
    user_id: user.id,
    workspace_id: ws.workspace_id,
    visibility: ws.visibility,
  };
};

export default { getActiveWorkspaceId, getCurrentUser, resolveWorkspaceContext, enrichWithOwnership };