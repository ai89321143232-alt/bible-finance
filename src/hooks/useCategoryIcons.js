import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCategoryEmoji } from '@/lib/categoryIcon';

// Кэширует список категорий пользователя и возвращает функцию
// name → emoji. Транзакции хранят только название категории,
// а иконка лежит в сущности Category — этот хук связывает их.
export function useCategoryIconMap() {
  const { data: categories = [] } = useQuery({
    queryKey: ['category-icons'],
    queryFn: () => base44.entities.Category.list(),
    staleTime: 5 * 60 * 1000,
  });

  const map = {};
  for (const cat of categories) {
    if (cat.name) map[cat.name] = getCategoryEmoji(cat.icon);
  }

  return (categoryName) => map[categoryName] || '📦';
}