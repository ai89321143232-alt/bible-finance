import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function EditModuleDialog({ module, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (module) {
      setForm({
        title: module.title || '',
        description: module.description || '',
        poster_uri: module.poster_uri || '',
        sort_order: module.sort_order ?? 0,
      });
    }
  }, [module]);

  if (!form) return null;

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    setForm((f) => ({ ...f, poster_uri: file_uri }));
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.LearningModule.update(module.id, form);
      onOpenChange(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать модуль</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Название модуля</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Постер модуля</Label>
            <Input className="mt-1" type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
            {form.poster_uri && <span className="text-xs text-muted-foreground">Постер загружен</span>}
          </div>
          <Button className="w-full" onClick={save} disabled={saving || uploading}>
            {saving ? 'Сохранение…' : 'Сохранить изменения'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}