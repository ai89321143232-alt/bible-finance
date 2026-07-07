// ============================================================
// components/workspace/WorkspaceContext.jsx — WORKSPACE-КОНТЕКСТ (Этап 1)
// ============================================================
// Фундамент Workspace-архитектуры на клиенте.
//
//   useWorkspaceProvision() → единожды на пользователя запускает backend-функцию
//                             provisionWorkspaces (создаёт Personal/Family Workspace
//                             и проставляет workspace_id существующим записям).
//                             Идемпотентно и безопасно. Не блокирует UI.
//
//   useWorkspaces()         → возвращает { workspaces, activeWorkspace, loading }
//                             список пространств текущего пользователя.
//
// На Этапе 1 контекст НЕ влияет на выборку данных — старая логика (family_id)
// продолжает работать. Это подготовка к Этапу 2.
// ============================================================

import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Ключ localStorage, чтобы не дёргать провижн на каждый рендер
const PROVISION_KEY = 'ws_provisioned_v1';

export const useWorkspaceProvision = () => {
  useEffect(() => {
    const run = async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.id) return;

        const flagKey = `${PROVISION_KEY}_${user.id}`;
        if (localStorage.getItem(flagKey) === 'done') return;

        await base44.functions.invoke('provisionWorkspaces', {});
        localStorage.setItem(flagKey, 'done');
      } catch (error) {
        // Не блокируем приложение при ошибке — попробуем в следующий раз
        console.error('Workspace provision failed:', error);
      }
    };
    run();
  }, []);
};

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.id) return;

        const memberships = await base44.entities.WorkspaceMember.filter({ user_id: user.id });
        const wsIds = memberships.map((m) => m.workspace_id);
        if (wsIds.length === 0) {
          setLoading(false);
          return;
        }

        const allWs = await base44.entities.Workspace.list();
        const myWs = allWs.filter((w) => wsIds.includes(w.id));
        setWorkspaces(myWs);

        // Активное: сохранённое в localStorage или personal по умолчанию
        const savedId = localStorage.getItem(`active_ws_${user.id}`);
        const active = myWs.find((w) => w.id === savedId)
          || myWs.find((w) => w.type === 'personal')
          || myWs[0]
          || null;
        setActiveWorkspace(active);
      } catch (error) {
        console.error('Load workspaces failed:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const switchWorkspace = async (workspaceId) => {
    const user = await base44.auth.me();
    localStorage.setItem(`active_ws_${user.id}`, workspaceId);
    const next = workspaces.find((w) => w.id === workspaceId);
    if (next) setActiveWorkspace(next);
  };

  return { workspaces, activeWorkspace, loading, switchWorkspace };
};