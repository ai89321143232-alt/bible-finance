import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { eventBus, EVENTS } from '@/lib/eventBus';

// ============================================================
// BackgroundLayer — фиксированный фоновый слой изображения
// ============================================================
// Рендерится ВНЕ трансформированных контейнеров (motion.div в App.jsx),
// чтобы position: fixed работал корректно и фон не двигался при скролле.
// ============================================================
export default function BackgroundLayer() {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);

  useEffect(() => {
    const load = () => {
      base44.auth.me().then((user) => {
        setBackgroundImageUrl(user?.background_image_url || null);
      }).catch(() => {});
    };
    load();

    const off = eventBus.on(EVENTS.BACKGROUND_CHANGED, ({ url }) => {
      setBackgroundImageUrl(url || null);
    });
    return off;
  }, []);

  if (!backgroundImageUrl) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${backgroundImageUrl})` }}
      />
      <div className="fixed inset-0 z-0 bg-background/30 dark:bg-background/40 pointer-events-none" />
    </>
  );
}