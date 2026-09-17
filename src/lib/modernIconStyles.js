export const CARD_STYLES = [
  { key: 'fig_honey_amber', label: 'Fig & Honey Amber', description: 'Тёплый янтарный claymorphism' },
  { key: 'midnight_glass', label: 'Midnight Glass', description: 'Стекло и прохладное сияние' },
  { key: 'cloud', label: 'Cloud', description: 'Мягкая облачная поверхность' },
  { key: 'neon', label: 'Neon', description: 'Неоновый акцент и подсветка' },
];

export const DEFAULT_CARD_STYLE = 'fig_honey_amber';
export const ICON_STYLES = CARD_STYLES;
export const DEFAULT_ICON_STYLE = DEFAULT_CARD_STYLE;

const atlas = (url) => Object.fromEntries([
  'Dashboard', 'Transactions', 'Accounts', 'Categories', 'Budgets', 'Subscriptions',
  'FinancialPlanning', 'Goals', 'Debts', 'Investments', 'Analytics', 'FamilyFinances',
  'ChildExpenses', 'FamilyChat', 'AIAssistant', 'AIAdvisors', 'AIPlanning', 'Tasks',
  'Notes', 'Education', 'HelpCenter', 'Backup', 'Settings',
].map((name) => [name, url]));

export const MODERN_ICON_ASSETS = {
  fig_honey_amber: {
    dark: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/555890a7e_generated_image.png'),
    light: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/cbcc1de18_generated_image.png'),
  },
  midnight_glass: {
    dark: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/1ecdf247f_generated_image.png'),
    light: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/f96340c9b_generated_image.png'),
  },
  cloud: {
    dark: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/5772d59ac_generated_image.png'),
    light: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c2ea96648_generated_image.png'),
  },
  neon: {
    dark: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/ac3380a68_generated_image.png'),
    light: atlas('https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d9485e592_generated_image.png'),
  },
};

export const CARD_TILE_NAMES = Object.keys(MODERN_ICON_ASSETS[DEFAULT_CARD_STYLE].dark);
export const getModernIconStyle = (key) => CARD_STYLES.find((style) => style.key === key) || CARD_STYLES[0];
export const getModernIconAsset = (styleKey, theme, tileName) => MODERN_ICON_ASSETS[getModernIconStyle(styleKey).key]?.[theme]?.[tileName];
export const getCardTilePosition = (tileName) => {
  const index = CARD_TILE_NAMES.indexOf(tileName);
  return { x: index < 0 ? 0 : index % 6, y: index < 0 ? 0 : Math.floor(index / 6) };
};