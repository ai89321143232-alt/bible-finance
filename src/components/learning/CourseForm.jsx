import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function CourseForm({ course, onSave, saving }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'draft' });
  useEffect(() => setForm(course ? { title: course.title, description: course.description || '', status: course.status } : { title: '', description: '', status: 'draft' }), [course]);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
    <div><Label>Название курса</Label><Input required value={form.title} onChange={change('title')} className="mt-1" /></div>
    <div><Label>Описание</Label><Textarea value={form.description} onChange={change('description')} className="mt-1" /></div>
    <div><Label>Статус</Label><select value={form.status} onChange={change('status')} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="draft">Черновик</option><option value="published">Опубликован</option></select></div>
    <Button className="w-full" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить курс'}</Button>
  </form>;
}