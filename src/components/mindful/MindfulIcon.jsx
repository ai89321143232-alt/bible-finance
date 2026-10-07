// 3D-иконки для разделов «Осознанные финансы» — единый стиль приложения:
// 3D-объект на нейтральном диске, сплошной фон без прозрачности.
const MINDFUL_ICON_ASSETS = {
  values: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/370c3969e_generated_image.png',
  generosity: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/c6e1d42f2_generated_image.png',
  decisions: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/e10f87040_generated_image.png',
  practices: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/d487b85b2_generated_image.png',
  scenarios: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/cce9fa7be_generated_image.png',
  recovery: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/2803cb51f_generated_image.png',
  reflection: 'https://media.base44.com/images/public/69a29cb75268c38305d0cae9/ff2683e31_generated_image.png',
};

export default function MindfulIcon({ name, className = '' }) {
  const src = MINDFUL_ICON_ASSETS[name];
  if (!src) return null;
  return <img src={src} alt="" className={`object-contain ${className}`} />;
}

export { MINDFUL_ICON_ASSETS };