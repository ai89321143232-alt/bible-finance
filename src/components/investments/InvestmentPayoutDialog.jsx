import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES = { dividend: 'Дивиденды', coupon: 'Купон', interest: 'Проценты', rent: 'Аренда' };

export default function InvestmentPayoutDialog({ investment, open, onOpenChange, values, onChange, goals, accounts, onSave, saving }) {
  const goal = goals.find((item) => item.id === values.linked_goal_id);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-2xl max-w-sm">
    <DialogHeader><DialogTitle>Новое поступление</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{investment?.name}</p>
      <div><Label>Тип выплаты</Label><Select value={values.type} onValueChange={(type) => onChange({ ...values, type })}><SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPES).map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Сумма</Label><Input className="mt-1 rounded-xl" type="number" min="0" value={values.amount} onChange={(e) => onChange({ ...values, amount: e.target.value })} /></div>
      <div><Label>Дата</Label><Input className="mt-1 rounded-xl" type="date" value={values.date} onChange={(e) => onChange({ ...values, date: e.target.value })} /></div>
      <div><Label>Назначение</Label><Select value={values.destination} onValueChange={(destination) => onChange({ ...values, destination, linked_goal_id: destination === 'goal' ? values.linked_goal_id : '' })}><SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Просто доход</SelectItem><SelectItem value="goal">На финансовую цель</SelectItem><SelectItem value="reinvest">Реинвестировать</SelectItem></SelectContent></Select></div>
      {values.destination === 'goal' && <><div><Label>Цель</Label><Select value={values.linked_goal_id} onValueChange={(linked_goal_id) => onChange({ ...values, linked_goal_id })}><SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Выберите цель" /></SelectTrigger><SelectContent>{goals.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select></div><div><Label>Счёт зачисления</Label><Select value={values.account_id} onValueChange={(account_id) => onChange({ ...values, account_id })}><SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Выберите счёт" /></SelectTrigger><SelectContent>{accounts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>{goal && <p className="text-xs text-muted-foreground">Сумма будет добавлена к цели «{goal.title}».</p>}</>}
      <Button className="w-full rounded-xl" disabled={!values.amount || (values.destination === 'goal' && (!values.linked_goal_id || !values.account_id)) || saving} onClick={onSave}>Сохранить поступление</Button>
    </div>
  </DialogContent></Dialog>;
}