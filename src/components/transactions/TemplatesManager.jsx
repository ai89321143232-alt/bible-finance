import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = {
  income: ['Зарплата', 'Фриланс', 'Инвестиции', 'Подарки', 'Продажи', 'Кэшбэк', 'Пособия', 'Другое'],
  expense: ['Продукты', 'Транспорт', 'Жильё', 'Здоровье', 'Развлечения', 'Одежда', 'Образование', 'Связь', 'Рестораны', 'Путешествия', 'Подарки', 'Другое']
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

export default function TemplatesManager({ open, onClose, onUseTemplate, accounts = [] }) {
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'expense', amount: '', category: '', account_id: '', color: COLORS[0], icon: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  const loadTemplates = async () => {
    const data = await base44.entities.TransactionTemplate.list('sort_order', 50);
    setTemplates(data);
  };

  const resetForm = () => {
    setForm({ name: '', type: 'expense', amount: '', category: '', account_id: '', color: COLORS[0], icon: '' });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount || !form.category) return;
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type,
      amount: parseFloat(form.amount),
      category: form.category,
      account_id: form.account_id || undefined,
      color: form.color,
      icon: form.icon || undefined,
      sort_order: templates.length
    };
    if (editingId) {
      await base44.entities.TransactionTemplate.update(editingId, payload);
    } else {
      await base44.entities.TransactionTemplate.create(payload);
    }
    resetForm();
    await loadTemplates();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.TransactionTemplate.delete(id);
    loadTemplates();
  };

  const handleEdit = (t) => {
    setForm({ name: t.name, type: t.type, amount: String(t.amount), category: t.category, account_id: t.account_id || '', color: t.color || COLORS[0], icon: t.icon || '' });
    setEditingId(t.id);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/70 z-50" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#141820] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">Шаблоны операций</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10"><X className="w-4 h-4 text-white/60" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Templates list */}
                {templates.length === 0 ? (
                  <p className="text-white/35 text-sm text-center py-8">Нет шаблонов. Создайте первый ниже.</p>
                ) : (
                  <div className="space-y-2">
                    {templates.map(t => {
                      const isExpense = t.type === 'expense';
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-all group">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: (t.color || COLORS[0]) + '20', color: t.color || COLORS[0] }}>
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{t.name}</p>
                            <p className="text-white/35 text-xs">{t.category}</p>
                          </div>
                          <span className={`text-sm font-semibold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isExpense ? '-' : '+'}{parseInt(t.amount).toLocaleString()} ₽
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onUseTemplate(t)}>
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(t)}>
                              <Edit2 className="w-3.5 h-3.5 text-white/40" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(t.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Form */}
                <div className="border-t border-white/8 pt-4 space-y-3">
                  <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    {editingId ? 'Редактировать шаблон' : 'Новый шаблон'}
                  </h3>

                  <div>
                    <Label className="text-white/50 text-xs">Название</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="Например: Кофе по утрам" className="mt-1 bg-white/5 border-white/10 text-white text-sm h-9" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/50 text-xs">Тип</Label>
                      <Select value={form.type} onValueChange={v => setForm({...form, type: v, category: ''})}>
                        <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1f2b] border-white/10">
                          <SelectItem value="expense">Расход</SelectItem>
                          <SelectItem value="income">Доход</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/50 text-xs">Сумма</Label>
                      <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                        placeholder="500" className="mt-1 bg-white/5 border-white/10 text-white text-sm h-9" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white/50 text-xs">Категория</Label>
                    <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2b] border-white/10 max-h-48">
                        {(CATEGORIES[form.type] || []).map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white/50 text-xs">Счёт (опционально)</Label>
                    <Select value={form.account_id} onValueChange={v => setForm({...form, account_id: v})}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue placeholder="Любой счёт" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2b] border-white/10">
                        <SelectItem value={null}>Любой счёт</SelectItem>
                        {accounts.filter(a => a.is_active !== false).map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white/50 text-xs">Цвет</Label>
                    <div className="flex gap-2 mt-1">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setForm({...form, color: c})}
                          className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleSave} disabled={saving} className="flex-1 bg-white text-black hover:bg-white/90 h-9 text-sm font-medium">
                      {editingId ? 'Сохранить' : 'Создать шаблон'}
                    </Button>
                    {editingId && (
                      <Button onClick={resetForm} variant="ghost" className="text-white/50 hover:text-white h-9">
                        Отмена
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}