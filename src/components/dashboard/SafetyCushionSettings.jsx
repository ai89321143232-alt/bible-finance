import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

export default function SafetyCushionSettings({ user, accounts, formatCurrency, onSaved }) {
  const saved = user?.safety_cushion || user?.data?.safety_cushion || {};
  const [auto, setAuto] = useState(saved.auto !== false);
  const [amount, setAmount] = useState(saved.amount || '');
  const [accountIds, setAccountIds] = useState(saved.account_ids || []);
  const [saving, setSaving] = useState(false);
  const toggleAccount = (id) => setAccountIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const save = async () => {
    setSaving(true);
    await base44.auth.updateMe({ safety_cushion: { auto, amount: auto ? null : Number(amount) || 0, account_ids: accountIds } });
    setSaving(false);
    onSaved();
  };
  return <div className="glass-card rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center"><ShieldCheck className="w-3.5 h-3.5 text-sky-500" /></div><div><p className="text-sm font-semibold">Подушка безопасности</p><p className="text-sm text-muted-foreground">Резерв не учитывается в дневном лимите</p></div></div>
    <div className="flex items-center justify-between"><span className="text-sm">Рассчитывать автоматически</span><Switch checked={auto} onCheckedChange={setAuto} /></div>
    {auto ? <p className="text-sm text-muted-foreground">Размер: средние расходы за три месяца.</p> : <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма подушки" />}
    <div className="space-y-2"><p className="text-sm font-medium">Счета, где хранится подушка</p>{accounts.map((account) => <label key={account.id} className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox checked={accountIds.includes(account.id)} onCheckedChange={() => toggleAccount(account.id)} /><span>{account.name}</span><span className="ml-auto text-foreground">{formatCurrency(account.balance || 0, account.currency)}</span></label>)}</div>
    <Button onClick={save} disabled={saving} variant="outline" className="w-full">{saving ? 'Сохраняю…' : 'Сохранить подушку'}</Button>
  </div>;
}