export const CARD_STYLES = [{ key: 'neutral_3d', label: 'Объёмные иконки', description: '3D-объекты на нейтральном основании' }];
export const DEFAULT_CARD_STYLE = 'neutral_3d';
export const ICON_STYLES = CARD_STYLES;
export const DEFAULT_ICON_STYLE = DEFAULT_CARD_STYLE;

const TILE_NAMES = ['Dashboard', 'Transactions', 'Accounts', 'Categories', 'Budgets', 'Subscriptions', 'FinancialPlanning', 'Goals', 'Debts', 'Investments', 'Analytics', 'FamilyFinances', 'ChildExpenses', 'FamilyChat', 'AIAssistant', 'AIAdvisors', 'AIPlanning', 'Tasks', 'Notes', 'Education', 'HelpCenter', 'Backup', 'Settings'];

const lightUrls = [
  '73c9a08ff', '79d6f4bb1', 'a497177dd', '280dbe04b', '72f050f57', '05b213fab', '297d7ad28', '1a0f6e939', '32362cd5e', 'fcdfec8bd', 'ae577e5b2', '1c7a298bf', '5246d332c', '2059aba52', '6db0d2845', 'ee79baff0', '7eafca67f', '54342874e', 'dba5cca9a', 'e1fcb455c', 'd0379ceb7', 'c10dcf32d', '1c614f167'
];
const darkUrls = [
  '7eb3f1866', '81a213476', 'de53e188a', '5b1d22dbe', '33cb3b217', 'f0b05588d', '025c62078', '2d8b4318c', 'fc40de233', '53bdb0022', '4e7d03a31', '44c4dcfde', '96272898f', '358418f76', 'd83c66da4', 'f2d2d3cd5', '73535e88b', 'c39f33edc', '13919fdee', 'b86371a2e', '687dc23e9', '3f3347887', 'fc39f34a1'
];
const toAssets = (urls) => Object.fromEntries(TILE_NAMES.map((name, index) => [name, `https://media.base44.com/images/public/69a29cb75268c38305d0cae9/${urls[index]}_generated_image.png`]));

export const MODERN_ICON_ASSETS = { neutral_3d: { light: toAssets(lightUrls), dark: toAssets(darkUrls) } };
export const INDIVIDUAL_CARD_STYLES = ['neutral_3d'];
export const CARD_TILE_NAMES = TILE_NAMES;
export const getModernIconStyle = () => CARD_STYLES[0];
export const getModernIconAsset = (_styleKey, theme, tileName) => MODERN_ICON_ASSETS.neutral_3d[theme === 'dark' ? 'dark' : 'light'][tileName];