import React from 'react';
import { Input } from '@/components/ui/input';

const normalize = (value) => String(value || '').trim().toLocaleLowerCase();
const selectedIndexes = (answer) => Array.isArray(answer?.values) ? answer.values : [];

export const isCorrectAnswer = (question, answer) => {
  const type = question.type || 'single';
  if (type === 'text') return normalize(answer?.value) === normalize(question.correct_text);
  if (type === 'multiple') return JSON.stringify([...selectedIndexes(answer)].sort()) === JSON.stringify([...(question.correct_indexes || [])].sort());
  return (answer?.index ?? answer) === question.correct_index;
};

export default function QuizQuestionAnswer({ question, index, answer, onChange, submitted }) {
  const type = question.type || 'single';
  const correct = isCorrectAnswer(question, answer);
  const setMultiple = (optionIndex) => { const values = selectedIndexes(answer); onChange({ type, values: values.includes(optionIndex) ? values.filter((item) => item !== optionIndex) : [...values, optionIndex] }); };
  return <div className="space-y-2"><p className="text-sm font-medium text-foreground">{index + 1}. {question.question}</p>{type === 'text' ? <Input disabled={submitted} placeholder="Ваш ответ" value={answer?.value || ''} onChange={(e) => onChange({ type, value: e.target.value })} /> : question.options?.map((option, optionIndex) => <label className="flex gap-2 text-sm text-muted-foreground" key={optionIndex}><input disabled={submitted} type={type === 'multiple' ? 'checkbox' : 'radio'} name={`question-${index}`} checked={type === 'multiple' ? selectedIndexes(answer).includes(optionIndex) : (answer?.index ?? answer) === optionIndex} onChange={() => type === 'multiple' ? setMultiple(optionIndex) : onChange({ type, index: optionIndex })} />{option}</label>)}{submitted && <p className={`text-sm ${correct ? 'text-emerald-600' : 'text-destructive'}`}>{correct ? 'Верно' : `Правильный ответ: ${type === 'text' ? question.correct_text : type === 'multiple' ? (question.correct_indexes || []).map((item) => question.options?.[item]).join(', ') : question.options?.[question.correct_index]}`}</p>}</div>;
}