export const ICON_STYLES = [
  {
    key: 'clay_glass',
    label: 'Стеклянные 3D-эмодзи',
    promptSuffix: 'thick-walled translucent glass figurine, light refraction, glossy highlights, soft pastel palette',
  },
  {
    key: 'polymer_clay',
    label: 'Мягкая глина',
    promptSuffix: 'matte polymer clay with light gloss, hand-sculpted, pastel tones, visible fingerprints, warm tactile',
  },
  {
    key: 'neumorphism',
    label: 'Неоморфизм',
    promptSuffix: 'soft embossed relief, matte surface, subtle raised shadows, monochrome light, iOS-widget feel',
  },
];

export const DEFAULT_ICON_STYLE = 'clay_glass';

export const getModernIconStyle = (key) =>
  ICON_STYLES.find((style) => style.key === key) || ICON_STYLES[0];