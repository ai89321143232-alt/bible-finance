import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const emptyDay = () => ({ title: '', scripture: '', scripture_ref: '', reading: '', content: '', questions: [], practice_prompt: '' });
const emptyQuestion = () => ({ text: '', scripture_ref: '', type: 'text' });

export default function DayEditor({ days, onChange }) {
  const [open, setOpen] = useState(0);

  const updateDay = (di, field, value) => {
    const next = [...days];
    next[di] = { ...next[di], [field]: value };
    onChange(next);
  };
  const addDay = () => { onChange([...days, emptyDay()]); setOpen(days.length); };
  const removeDay = (di) => { onChange(days.filter((_, i) => i !== di)); };

  const updateQuestion = (di, qi, field, value) => {
    const next = [...days];
    const questions = [...(next[di].questions || [])];
    questions[qi] = { ...questions[qi], [field]: value };
    next[di] = { ...next[di], questions };
    onChange(next);
  };
  const addQuestion = (di) => {
    const next = [...days];
    next[di] = { ...next[di], questions: [...(next[di].questions || []), emptyQuestion()] };
    onChange(next);
  };
  const removeQuestion = (di, qi) => {
    const next = [...days];
    next[di] = { ...next[di], questions: (next[di].questions || []).filter((_, i) => i !== qi) };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Структура по дням</Label>
        <Button type="button" variant="outline" size="sm" onClick={addDay}><Plus className="w-4 h-4 mr-1" />День</Button>
      </div>
      {days.map((day, di) => {
        const isOpen = open === di;
        return (
          <div key={di} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between bg-muted/30 p-2">
              <button type="button" onClick={() => setOpen(isOpen ? -1 : di)} className="flex items-center gap-2 text-sm font-medium flex-1 text-left">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {day.title || `День ${di + 1}`}
              </button>
              <button type="button" onClick={() => removeDay(di)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {isOpen && (
              <div className="p-3 space-y-3">
                <Input placeholder="Название дня (например, День первый)" value={day.title || ''} onChange={(e) => updateDay(di, 'title', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Библейский стих" value={day.scripture || ''} onChange={(e) => updateDay(di, 'scripture', e.target.value)} />
                  <Input placeholder="Ссылка (напр. Луки 16:11)" value={day.scripture_ref || ''} onChange={(e) => updateDay(di, 'scripture_ref', e.target.value)} />
                </div>
                <Input placeholder="Что прочитать" value={day.reading || ''} onChange={(e) => updateDay(di, 'reading', e.target.value)} />
                <Textarea placeholder="Учебный материал дня" rows={4} value={day.content || ''} onChange={(e) => updateDay(di, 'content', e.target.value)} />
                <Textarea placeholder="Практическое задание дня" rows={2} value={day.practice_prompt || ''} onChange={(e) => updateDay(di, 'practice_prompt', e.target.value)} />
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Вопросы и задания</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addQuestion(di)}><Plus className="w-3 h-3 mr-1" />Вопрос</Button>
                  </div>
                  {(day.questions || []).map((q, qi) => (
                    <div key={qi} className="rounded-md border border-border p-2 space-y-2">
                      <div className="flex items-start gap-2">
                        <Textarea placeholder="Текст вопроса или задания" rows={2} value={q.text || ''} onChange={(e) => updateQuestion(di, qi, 'text', e.target.value)} className="flex-1" />
                        <button type="button" onClick={() => removeQuestion(di, qi)} className="text-muted-foreground hover:text-destructive mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Input placeholder="Отрывок Писания (если есть)" value={q.scripture_ref || ''} onChange={(e) => updateQuestion(di, qi, 'scripture_ref', e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {!days.length && <p className="text-sm text-muted-foreground">Добавьте дни курса, чтобы студенты могли отвечать на вопросы по каждому дню.</p>}
    </div>
  );
}