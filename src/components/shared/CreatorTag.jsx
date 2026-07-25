import React from 'react';
import { UserRound } from 'lucide-react';
import { getCreatorName } from '@/lib/creatorName';

// Маленькая метка "кто создал запись" — используется в списках транзакций,
// счетов, инвестиций, бюджетов и целей.
export default function CreatorTag({ creatorId, family, currentUser, className = '' }) {
  const name = getCreatorName(creatorId, family, currentUser);
  if (!name) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 ${className}`}>
      <UserRound className="w-3 h-3" />
      {name}
    </span>
  );
}