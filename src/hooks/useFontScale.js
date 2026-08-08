import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const FONT_SCALE_KEY = 'app_font_scale';
const DEFAULT_SCALE = 100;
const MIN_SCALE = 85;
const MAX_SCALE = 150;
const STEP = 5;

export const FONT_SCALES = [
  { value: 85, label: 'S', description: 'Мелкий' },
  { value: 100, label: 'M', description: 'Стандартный' },
  { value: 115, label: 'L', description: 'Крупный' },
  { value: 130, label: 'XL', description: 'Большой' },
  { value: 150, label: 'XXL', description: 'Очень большой' },
];

function applyScale(scale) {
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  document.documentElement.style.fontSize = `${clamped / 100 * 16}px`;
}

export function useFontScale() {
  const [scale, setScale] = useState(() => {
    const stored = localStorage.getItem(FONT_SCALE_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_SCALE;
  });

  useEffect(() => {
    applyScale(scale);
  }, [scale]);

  useEffect(() => {
    base44.auth.me().then((user) => {
      const stored = user?.data?.font_scale || localStorage.getItem(FONT_SCALE_KEY);
      if (stored) {
        const s = parseInt(stored, 10);
        if (!isNaN(s)) setScale(s);
      }
    }).catch(() => {});
  }, []);

  const updateScale = useCallback(async (newScale) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    setScale(clamped);
    localStorage.setItem(FONT_SCALE_KEY, String(clamped));
    try {
      await base44.auth.updateMe({ font_scale: clamped });
    } catch {}
  }, []);

  const increase = useCallback(() => updateScale(scale + STEP), [scale, updateScale]);
  const decrease = useCallback(() => updateScale(scale - STEP), [scale, updateScale]);
  const reset = useCallback(() => updateScale(DEFAULT_SCALE), [updateScale]);

  return { scale, updateScale, increase, decrease, reset };
}