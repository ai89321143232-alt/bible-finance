import React, { useState } from 'react';
import { Check, Loader2, Unlink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TelegramFamilyAccess({ config, family, saving, onApprove, onReject, onUnlink }) {
  const [selectedMembers, setSelectedMembers] = useState({});
  const members = family?.members || [];
  const linked = config?.linked_members || [];
  const pending = config?.pending_links || [];
  if (!config?.is_active || !family) return null;
  const memberName = (member) => member.display_name || member.name || 'Участник';
  return <section className="space-y-3 border-t border-border pt-4">
    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-semibold">Члены семьи с доступом</h3></div>
    {pending.map((request) => <div key={request.telegram_user_id} className="space-y-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
      <p className="text-sm font-medium">Запрос от {request.telegram_display_name || `Telegram ID ${request.telegram_user_id}`}</p>
      <Select value={selectedMembers[request.telegram_user_id] || ''} onValueChange={(userId) => setSelectedMembers({ ...selectedMembers, [request.telegram_user_id]: userId })}>
        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Сопоставьте с участником семьи" /></SelectTrigger>
        <SelectContent>{members.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{memberName(member)}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex gap-2"><Button size="sm" className="rounded-lg" disabled={!selectedMembers[request.telegram_user_id] || saving} onClick={() => onApprove(request, selectedMembers[request.telegram_user_id])}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Подтвердить</Button><Button size="sm" variant="outline" className="rounded-lg" disabled={saving} onClick={() => onReject(request.telegram_user_id)}>Отклонить</Button></div>
    </div>)}
    {!pending.length && <p className="text-sm text-muted-foreground">Попросите члена семьи открыть бота и отправить /start — запрос появится здесь.</p>}
    {linked.map((link) => <div key={link.telegram_user_id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div><p className="text-sm font-medium">{link.display_name || 'Участник'}</p><p className="text-sm text-muted-foreground">Telegram ID: {link.telegram_user_id}</p></div><Button size="icon" variant="ghost" className="h-9 w-9 text-rose-600" disabled={saving} onClick={() => onUnlink(link.telegram_user_id)}><Unlink className="h-4 w-4" /></Button></div>)}
  </section>;
}