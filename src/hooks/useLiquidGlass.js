import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'app_liquid_glass';

// Применяет атрибут data-liquid-glass на <html> и кэширует выбор в localStorage
export function applyLiquidGlass(enabled) {
  if (enabled) {
    document.documentElement.setAttribute('data-liquid-glass', 'true');
  } else {
    document.documentElement.removeAttribute('data-liquid-glass');
  }
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

// Хук для App.jsx — применяет настройку при загрузке приложения
export function useLiquidGlass() {
  useEffect(() => {
    const local = localStorage.getItem(STORAGE_KEY) === 'true';
    applyLiquidGlass(local);
    base44.auth.me().then((user) => {
      const server = user?.data?.liquid_glass;
      const enabled = server === true || (server === undefined && local);
      applyLiquidGlass(enabled);
    }).catch(() => {});
  }, []);
}

// Обновление настройки из UI
export async function setLiquidGlass(enabled) {
  applyLiquidGlass(enabled);
  try {
    await base44.auth.updateMe({ liquid_glass: enabled });
  } catch {}
}