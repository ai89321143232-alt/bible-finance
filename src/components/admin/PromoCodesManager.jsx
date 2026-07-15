import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const generateCode = () => `PROMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export default function PromoCodesManager() {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState('premium');
  const [durationDays, setDurationDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [newCode, setNewCode] = useState(generateCode());

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: () => base44.entities.PromoCode.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.PromoCode.create({
      code: newCode.trim().toUpperCase(),
      plan,
      duration_days: Number(durationDays),
      max_uses: Number(maxUses),
      used_count: 0,
      is_active: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setNewCode(generateCode());
      toast.success('Промокод создан');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PromoCode.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PromoCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Промокод удалён');
    }
  });

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Скопировано');
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div>
          <Label>Код</Label>
          <div className="flex gap-2 mt-1">
            <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} className="rounded-xl font-mono" />
            <Button variant="outline" size="icon" onClick={() => setNewCode(generateCode())} className="rounded-xl flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Тариф</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="family">Family</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Дней</Label>
            <Input type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>Активаций</Label>
            <Input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="rounded-xl mt-1" />
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!newCode.trim() || createMutation.isPending}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
        >
          Создать промокод
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">Загрузка...</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Промокодов пока нет</p>
        ) : (
          codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-semibold">{c.code}</code>
                  <button onClick={() => copyCode(c.code)}>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{c.plan === 'family' ? 'Family' : 'Premium'}</Badge>
                  <span className="text-xs text-slate-500">{c.duration_days} дн.</span>
                  <span className="text-xs text-slate-500">{c.used_count || 0}/{c.max_uses} исп.</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={c.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: c.id, is_active: v })} />
                <button onClick={() => deleteMutation.mutate(c.id)}>
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}