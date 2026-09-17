export function isOwnRecord(record, user) {
  return Boolean(record && user && (record.created_by_id === user.id || record.user_id === user.id));
}

export function isFamilyVisibleRecord(record, user, family) {
  return Boolean(record && user && family && record.family_id === family.id);
}

export function hasActiveFamilySubscription(family) {
  if (family?.subscription_tier !== 'family') return false;
  return !family.subscription_end_date || new Date(family.subscription_end_date) >= new Date(new Date().toDateString());
}