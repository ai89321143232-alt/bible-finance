import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function StudentProgressSummary({ student, lessons, progress, selected, onSelect }) {
  const completed = progress.filter((item) => item.completed).length;
  const practiceLessons = lessons.filter((item) => item.practice_prompt);
  const practicesDone = practiceLessons.filter((lesson) => progress.find((item) => item.lesson_id === lesson.id)?.practice_completed).length;
  return <button onClick={onSelect} className={`w-full rounded-lg border p-3 text-left ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}><div className="flex items-center justify-between gap-3"><span className="font-medium text-foreground">{student.full_name || student.email}</span>{completed === lessons.length && lessons.length > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}</div><p className="mt-1 text-sm text-muted-foreground">Уроки: {completed} из {lessons.length} · задания: {practicesDone} из {practiceLessons.length}</p></button>;
}