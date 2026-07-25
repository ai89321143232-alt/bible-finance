// Определяет отображаемое имя автора записи (created_by_id) по данным семьи.
export function getCreatorName(creatorId, family, currentUser) {
  if (!creatorId) return null;
  if (creatorId === currentUser?.id) return 'Вы';
  const member = family?.members?.find(m => m.user_id === creatorId);
  return member?.display_name || member?.name || null;
}