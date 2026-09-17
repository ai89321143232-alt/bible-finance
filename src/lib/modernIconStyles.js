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
  {
    key: 'chrome_liquid',
    label: 'Жидкий хром',
    promptSuffix: 'polished liquid chrome sculpture, mirror-like reflections, flowing rounded shape, silver and subtle violet highlights, premium 3D render',
  },
  {
    key: 'iridescent_pearl',
    label: 'Перламутр',
    promptSuffix: 'iridescent mother-of-pearl figurine, pearly white surface, pastel rainbow shimmer, soft studio lighting, elegant 3D object',
  },
  {
    key: 'paper_craft',
    label: 'Бумажная скульптура',
    promptSuffix: 'layered paper craft sculpture, crisp folded paper planes, clean pastel colors, delicate paper texture, soft ambient shadows',
  },
  {
    key: 'plush_toy',
    label: 'Мягкая игрушка',
    promptSuffix: 'cute plush toy object, velvety fabric texture, rounded stitching details, warm pastel palette, cozy soft 3D render',
  },
  {
    key: 'crystal_gem',
    label: 'Кристалл',
    promptSuffix: 'faceted translucent crystal gem object, precise geometric cuts, luminous cyan and violet refractions, premium 3D render',
  },
  {
    key: 'ceramic_glaze',
    label: 'Глянцевая керамика',
    promptSuffix: 'handmade glazed ceramic figurine, glossy enamel surface, subtle organic imperfections, calm pastel tones, studio product lighting',
  },
  {
    key: 'wooden_toy',
    label: 'Деревянная игрушка',
    promptSuffix: 'smooth carved wooden toy, natural wood grain, rounded simple silhouette, colorful painted accents, warm soft lighting',
  },
  {
    key: 'holographic',
    label: 'Голограмма',
    promptSuffix: 'floating holographic object, transparent luminous layers, cyan magenta and violet glow, futuristic clean 3D render on dark neutral space',
  },
  {
    key: 'miniature_diorama',
    label: 'Мини-диорама',
    promptSuffix: 'tiny detailed miniature diorama, charming handcrafted scene, rich but balanced colors, shallow depth of field, polished 3D render',
  },
  {
    key: 'soft_rubber',
    label: 'Мягкий силикон',
    promptSuffix: 'soft-touch silicone object, smooth matte rubber finish, gently rounded forms, saturated pastel colors, clean modern product render',
  },
];

export const DEFAULT_ICON_STYLE = 'clay_glass';

export const getModernIconStyle = (key) =>
  ICON_STYLES.find((style) => style.key === key) || ICON_STYLES[0];