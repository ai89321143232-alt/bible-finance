import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';
import { useCurrencySymbol } from '@/lib/formatCurrency';

const ASSET_TYPES = [
  { value: 'real_estate', label: 'Недвижимость' },
  { value: 'auto', label: 'Автомобиль' },
  { value: 'gold', label: 'Золото' },
  { value: 'other', label: 'Другое' }
];

export default function AddFixedAssetModal({ open, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('real_estate');
  const [value, setValue] = useState('');
  const [valueDate, setValueDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const currencySymbol = useCurrencySymbol();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !value) return;
    setSaving(true);
    const user = await base44.auth.me();
    await base44.entities.FixedAsset.create({
      name: name.trim(),
      type,
      value: parseFloat(value),
      value_date: valueDate,
      family_id: user?.family_id || undefined
    });
    setSaving(false);
    setName('');
    setValue('');
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить актив</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Квартира, Toyota Camry..." required />
          </div>
          <div>
            <Label>Тип актива</Label>
            <MobileSelect value={type} onValueChange={setType} title="Тип актива">
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </MobileSelect>
          </div>
          <div>
            <Label>Рыночная стоимость</Label>
            <div className="relative">
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" className="pr-8" required />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{currencySymbol}</span>
            </div>
          </div>
          <div>
            <Label>Дата внесения</Label>
            <Input type="date" value={valueDate} onChange={(e) => setValueDate(e.target.value)} required />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? 'Сохранение...' : 'Добавить'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}