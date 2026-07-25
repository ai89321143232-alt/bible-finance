import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Считает непрочитанные сообщения семейного чата для бейджа в меню.
export default function useUnreadFamilyChat() {
  return useQuery({
    queryKey: ['family-chat-unread'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const families = await base44.entities.Family.list();
      const family = families.find(f => f.owner_id === user.id || f.members?.some(m => m.user_id === user.id));
      if (!family) return 0;
      const messages = await base44.entities.FamilyMessage.filter({ family_id: family.id }, '-created_date', 200);
      return messages.filter(m => m.created_by_id !== user.id && !(m.read_by || []).includes(user.id)).length;
    },
    refetchInterval: 20000,
    staleTime: 10000,
    retry: false,
  });
}