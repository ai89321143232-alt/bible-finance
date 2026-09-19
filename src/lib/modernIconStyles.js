export const CARD_STYLES = [{ key: 'neutral_3d', label: 'Объёмные иконки', description: '3D-объекты на нейтральном основании' }];
export const DEFAULT_CARD_STYLE = 'neutral_3d';
export const ICON_STYLES = CARD_STYLES;
export const DEFAULT_ICON_STYLE = DEFAULT_CARD_STYLE;

const UNIVERSAL_ICON_ASSETS = {
  Dashboard: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/441fc4b4c_generated_image.png',
  Transactions: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/75aad86d2_generated_image.png',
  Accounts: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/9374dc493_generated_image.png',
  Categories: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/8bf59f252_generated_image.png',
  Budgets: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d1fbe8890_generated_9cf16d28.png',
  Subscriptions: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/4cf4e37c6_generated_image.png',
  FinancialPlanning: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/938178742_generated_image.png',
  Goals: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/fa6201b3e_generated_image.png',
  Debts: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/55ea4e3df_generated_image.png',
  Investments: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/cf7c96975_generated_image.png',
  Analytics: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/a837249ca_generated_image.png',
  FamilyFinances: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/8ff2a252d_generated_image.png',
  ChildExpenses: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/b9f50142e_generated_image.png',
  FamilyChat: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c778c8467_generated_image.png',
  AIAssistant: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/fa9a008d3_generated_image.png',
  AIAdvisors: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/faa5a7001_generated_image.png',
  AIPlanning: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c6bec2402_generated_image.png',
  Tasks: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/5fd906770_generated_image.png',
  Notes: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c18477953_generated_image.png',
  Education: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/e423397c1_generated_image.png',
  HelpCenter: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/a2deb5c0a_generated_image.png',
  Backup: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/affc346b5_generated_image.png',
  Settings: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/9a5804eae_generated_image.png'
};

export const MODERN_ICON_ASSETS = { neutral_3d: { light: UNIVERSAL_ICON_ASSETS, dark: UNIVERSAL_ICON_ASSETS } };

export const INDIVIDUAL_CARD_STYLES = ['neutral_3d'];
export const CARD_TILE_NAMES = Object.keys(MODERN_ICON_ASSETS.neutral_3d.light);
export const getModernIconStyle = () => CARD_STYLES[0];
export const getModernIconAsset = (_styleKey, _theme, tileName) => UNIVERSAL_ICON_ASSETS[tileName];