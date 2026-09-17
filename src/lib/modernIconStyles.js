export const ICON_STYLES = [
  { key: 'fig_honey_amber', label: 'Fig and Honey Amber' },
];

export const DEFAULT_ICON_STYLE = 'fig_honey_amber';

export const MODERN_ICON_ASSETS = {
  fig_honey_amber: {
    Dashboard: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/89e4871dc_generated_image.png',
    Transactions: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/dd0ac0fff_generated_image.png',
    Accounts: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/832b78e59_generated_image.png',
    Categories: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/7e4a0d3e5_generated_image.png',
    Budgets: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c6edee98d_generated_image.png',
    Subscriptions: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/1f6c2041f_generated_image.png',
    FinancialPlanning: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/14949c27e_generated_image.png',
    Goals: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/4d1da1f1c_generated_image.png',
    Debts: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d554fcda3_generated_image.png',
    Investments: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/9415c6c4c_generated_image.png',
    Analytics: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/8d77515a1_generated_image.png',
    FamilyFinances: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/08a5f73b2_generated_image.png',
    ChildExpenses: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/df8ff5b28_generated_image.png',
    FamilyChat: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/5c89c8ce5_generated_image.png',
    AIAssistant: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/359da2bf9_generated_image.png',
    AIAdvisors: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/fa2a96466_generated_image.png',
    AIPlanning: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/fb2a25ccb_generated_image.png',
    Tasks: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/529bd341c_generated_image.png',
    Notes: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/dc14580a5_generated_image.png',
    Education: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/0529fef95_generated_image.png',
    HelpCenter: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/f143cb934_generated_image.png',
    Backup: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/6691db132_generated_image.png',
    Settings: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/47f49d259_generated_image.png',
  },
};

export const getModernIconStyle = (key) =>
  ICON_STYLES.find((style) => style.key === key) || ICON_STYLES[0];

export const getModernIconAsset = (styleKey, tileName) =>
  MODERN_ICON_ASSETS[getModernIconStyle(styleKey).key]?.[tileName];