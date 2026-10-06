import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function QuickForm({ value, onChange, onSubmit, placeholder, action = 'Добавить', type = 'text' }) {
  return <form onSubmit={onSubmit} className="flex gap-2"><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><Button type="submit" disabled={!value}>{action}</Button></form>;
}