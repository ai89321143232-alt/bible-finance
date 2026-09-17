export const DASHBOARD_VARIANTS = [
  { id: 'dark_scene', label: 'Тёмная сцена', preview: '🌌', className: 'dv-dark-scene' },
  { id: 'light_gallery', label: 'Светлая галерея', preview: '☀️', className: 'dv-light-gallery' },
  { id: 'warm_pastel', label: 'Тёплая пастель', preview: '🌸', className: 'dv-warm-pastel' },
  { id: 'color_blocks', label: 'Цветные блоки', preview: '🎨', className: 'dv-color-blocks' },
  { id: 'classic', label: 'Классический', preview: '◻️', className: 'dv-classic' },
];

export const DEFAULT_DASHBOARD_VARIANT = 'dark_scene';

export const getDashboardVariant = (id) =>
  DASHBOARD_VARIANTS.find((variant) => variant.id === id) || DASHBOARD_VARIANTS[0];