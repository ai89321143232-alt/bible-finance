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
    dark: {
      Dashboard:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/90c8c0d36_generated_image.png', Transactions:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/b04246b4f_generated_image.png', Accounts:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/2885f248e_generated_image.png', Categories:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d0b59b68e_generated_image.png', Budgets:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/5df5a83cd_generated_image.png', Subscriptions:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d18360401_generated_image.png', FinancialPlanning:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/7118a906a_generated_image.png', Goals:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/e6e56ef18_generated_image.png', Debts:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/87d29aff3_generated_image.png', Investments:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/34e96b619_generated_image.png', Analytics:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/bf6ddfb23_generated_image.png', FamilyFinances:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/51bc7d456_generated_image.png', ChildExpenses:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/689077c01_generated_image.png', FamilyChat:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/1f741feb9_generated_image.png', AIAssistant:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/13ce94b19_generated_image.png', AIAdvisors:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/0b486c18e_generated_image.png', AIPlanning:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/64e3665f9_generated_image.png', Tasks:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/1d01f3243_generated_image.png', Notes:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/5fa807eb2_generated_image.png', Education:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/faf223ccf_generated_image.png', HelpCenter:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/3eda7dc29_generated_image.png', Backup:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/ae2595840_generated_image.png', Settings:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/e0227a559_generated_image.png'
    },
    light: {
      Dashboard:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/1acff66e7_generated_image.png', Transactions:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/73a1c9ec6_generated_image.png', Accounts:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/ac3702205_generated_image.png', Categories:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/39e046a80_generated_image.png', Budgets:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/57ba152f1_generated_image.png', Subscriptions:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c50eac59e_generated_image.png', FinancialPlanning:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/703e4a14d_generated_image.png', Goals:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/def6ad68f_generated_image.png', Debts:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/8e0a768f0_generated_image.png', Investments:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/39e1c06b6_generated_image.png', Analytics:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d8d0b240f_generated_image.png', FamilyFinances:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/768edc4d0_generated_image.png', ChildExpenses:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d583d3078_generated_image.png', FamilyChat:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/e840a9116_generated_image.png', AIAssistant:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/74c243523_generated_image.png', AIAdvisors:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/f114de976_generated_image.png', AIPlanning:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/61c779ed2_generated_image.png', Tasks:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/8ca8377b5_generated_image.png', Notes:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/cbf9302e5_generated_image.png', Education:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c93b1c7c3_generated_image.png', HelpCenter:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/ba965c762_generated_image.png', Backup:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d58a18392_generated_image.png', Settings:'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/fac463607_generated_image.png'
    },
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

export const INDIVIDUAL_CARD_STYLES = ['fig_honey_amber'];
export const CARD_TILE_NAMES = Object.keys(MODERN_ICON_ASSETS[DEFAULT_CARD_STYLE].dark);
export const getModernIconStyle = (key) => CARD_STYLES.find((style) => style.key === key) || CARD_STYLES[0];
export const getModernIconAsset = (styleKey, theme, tileName) => MODERN_ICON_ASSETS[getModernIconStyle(styleKey).key]?.[theme]?.[tileName];
export const getCardTilePosition = (tileName) => {
  const index = CARD_TILE_NAMES.indexOf(tileName);
  return { x: index < 0 ? 0 : index % 6, y: index < 0 ? 0 : Math.floor(index / 6) };
};