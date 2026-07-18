import { CreditCard, MessageCircleQuestion, ShieldCheck, HandHeart, Hammer, PiggyBank, Infinity, Compass } from 'lucide-react';

// Темы обучения — соответствуют секторам "колеса Верного распорядителя"
export const EDUCATION_TOPICS = [
  {
    id: 'debts',
    title: 'Долги',
    subtitle: 'Избегает долгов',
    description: 'Библейские принципы управления кредитами и как выйти из долговой зависимости.',
    icon: CreditCard,
    color: '#DC2626',
  },
  {
    id: 'advice',
    title: 'Советы',
    subtitle: 'Ищет совета',
    description: 'Важность мудрых финансовых решений и поиска наставников на пути к финансовой свободе.',
    icon: MessageCircleQuestion,
    color: '#2563EB',
  },
  {
    id: 'honesty',
    title: 'Честность',
    subtitle: 'Абсолютно честный',
    description: 'Библейский взгляд на прозрачность и порядочность во всех финансовых делах.',
    icon: ShieldCheck,
    color: '#7C3AED',
  },
  {
    id: 'giving',
    title: 'Даяние',
    subtitle: 'Дает щедро',
    description: 'Радость щедрой отдачи и практика десятины как проявление доверия Богу.',
    icon: HandHeart,
    color: '#DB2777',
  },
  {
    id: 'work',
    title: 'Работа',
    subtitle: 'Работает усердно',
    description: 'Отношение к труду как к служению и источнику Божьего благословения.',
    icon: Hammer,
    color: '#D97706',
  },
  {
    id: 'savings',
    title: 'Сбережения',
    subtitle: 'Откладывает регулярно',
    description: 'Важность создания резервов и регулярного накопления для будущего.',
    icon: PiggyBank,
    color: '#059669',
  },
  {
    id: 'eternity',
    title: 'Вечность',
    subtitle: 'Живет для вечности',
    description: 'Философия накопления «сокровищ на небесах» вместо земных богатств.',
    icon: Infinity,
    color: '#0891B2',
  },
  {
    id: 'perspective',
    title: 'Перспектива',
    subtitle: 'Расходует мудро',
    description: 'Как видеть Божью перспективу в ежедневных тратах и решениях.',
    icon: Compass,
    color: '#4F46E5',
  },
];

export function getEducationTopic(id) {
  return EDUCATION_TOPICS.find((t) => t.id === id);
}