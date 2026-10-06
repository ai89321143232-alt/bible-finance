import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const blankOption = (question) => [...(question.options || []), ''];

export default function QuizQuestionEditor({ question, index, onChange, onRemove }) {
  const type = question.type || 'single';
  const options = question.options || [];
  const updateOption = (optionIndex, value) => onChange({ ...question, options: options.map((item, i) => i === optionIndex ? value : item) });
  const toggleCorrect = (optionIndex) => {
    const selected = question.correct_indexes || [];
    onChange({ ...question, correct_indexes: selected.includes(optionIndex) ? selected.filter((item) => item !== optionIndex) : [...selected, optionIndex] });
  };
  return <div className="rounded-lg border border-border p-3 space-y-3">
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Вопрос {index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={onRemove}>Удалить</Button></div>
    <select value={type} onChange={(e) => onChange({ ...question, type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="single">Один вариант</option><option value="multiple">Несколько вариантов</option><option value="text">Текстовый ответ</option></select>
    <Textarea required placeholder="Текст вопроса" value={question.question} onChange={(e) => onChange({ ...question, question: e.target.value })} />
    {type === 'text' ? <Input required placeholder="Правильный текстовый ответ" value={question.correct_text || ''} onChange={(e) => onChange({ ...question, correct_text: e.target.value })} /> : <div className="space-y-2">{options.map((option, optionIndex) => <div className="flex items-center gap-2" key={optionIndex}><input className="h-4 w-4" type={type === 'single' ? 'radio' : 'checkbox'} name={`correct-${index}`} checked={type === 'single' ? question.correct_index === optionIndex : (question.correct_indexes || []).includes(optionIndex)} onChange={() => type === 'single' ? onChange({ ...question, correct_index: optionIndex }) : toggleCorrect(optionIndex)} /><Input required placeholder={`Вариант ${optionIndex + 1}`} value={option} onChange={(e) => updateOption(optionIndex, e.target.value)} /></div>)}<Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...question, options: blankOption(question) })}>Добавить вариант</Button></div>}
  </div>;
}