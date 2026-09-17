export const ICON_STYLES = [
  { key: 'glass_3d', label: 'Стекло 3D' },
  { key: 'soft_clay', label: 'Мягкая глина' },
  { key: 'liquid_chrome', label: 'Жидкий хром' },
  { key: 'iridescent_pearl', label: 'Перламутр' },
  { key: 'paper_craft', label: 'Бумажная скульптура' },
  { key: 'plush_toy', label: 'Мягкая игрушка' },
  { key: 'crystal_gem', label: 'Кристалл' },
  { key: 'ceramic_glaze', label: 'Глянцевая керамика' },
  { key: 'wooden_toy', label: 'Деревянная игрушка' },
  { key: 'holographic', label: 'Голограмма' },
];

export const DEFAULT_ICON_STYLE = 'glass_3d';

export const getModernIconStyle = (key) =>
  ICON_STYLES.find((style) => style.key === key) || ICON_STYLES[0];