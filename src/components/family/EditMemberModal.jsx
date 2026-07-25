import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MemberAvatar from './MemberAvatar';
import { Camera, Check } from 'lucide-react';

// Модалка редактирования профиля участника семьи: отображаемое имя + фото.
export default function EditMemberModal({ member, open, onClose, onSave, saving }) {
  const [displayName, setDisplayName] = useState(member?.display_name || member?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(member?.avatar_url || '');
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (member) {
      setDisplayName(member.display_name || member.name || '');
      setAvatarUrl(member.avatar_url || '');
    }
  }, [member]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
    } finally {
      setUploading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <MemberAvatar member={{ ...member, display_name: displayName, avatar_url: avatarUrl }} size="lg" />
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center cursor-pointer shadow-md">
                <Camera className="w-3.5 h-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
            </div>
            {uploading && <p className="text-xs text-slate-500">Загрузка фото...</p>}
          </div>
          <div>
            <Label>Отображаемое имя</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Имя участника"
              className="rounded-xl mt-1"
            />
          </div>
          <Button
            onClick={() => onSave({ display_name: displayName, avatar_url: avatarUrl })}
            disabled={!displayName || saving || uploading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
          >
            <Check className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}