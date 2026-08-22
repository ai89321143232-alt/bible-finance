import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GlassCard — карточка с эффектом Liquid Glass (iOS 26).
 * Полупрозрачный фростированный фон, тонкая светлая граница-блик,
 * мягкое внутреннее свечение. Адаптивно к светлой и тёмной теме.
 *
 * Применять ТОЛЬКО к верхнеуровневым карточным поверхностям —
 * не вкладывать стекло в стекло (перф-риск).
 */
export default function GlassCard({ className, children, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('glass-card', className)} {...props}>
      {children}
    </Tag>
  );
}