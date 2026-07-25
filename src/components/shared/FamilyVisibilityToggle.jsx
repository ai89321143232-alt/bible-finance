import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================
// FamilyVisibilityToggle — кнопка-глазок для скрытия общих семейных
// записей (счетов/операций), оставляя только свои личные.
// Показывается только у семей с тарифом "family" (see caller).
// ============================================================
export default function FamilyVisibilityToggle({ showOnlyMine, onToggle }) {
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="icon"
      className="rounded-xl"
      title={showOnlyMine ? 'Показать общие семейные записи' : 'Показать только свои записи'}
    >
      {showOnlyMine ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </Button>
  );
}