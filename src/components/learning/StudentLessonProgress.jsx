import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, ChevronRight, Mic, MessageSquare } from 'lucide-react';

export default function StudentLessonProgress({ lessons, progress, answers = [], onTogglePractice }) {
  const [openLesson, setOpenLesson] = useState(null);
  return (
    <div className="space-y-3">
      {lessons.map((lesson) => {
        const item = progress.find((entry) => entry.lesson_id === lesson.id);
        const hasPractice = Boolean(lesson.practice_prompt);
        const lessonAnswers = answers.filter((a) => a.lesson_id === lesson.id);
        const hasDays = (lesson.days || []).length > 0;
        const isOpen = openLesson === lesson.id;
        return (
          <div key={lesson.id} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-foreground">{lesson.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Урок: {item?.completed ? 'пройден' : 'не пройден'}</p>
              </div>
              {item?.completed && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />}
            </div>

            {hasDays && (
              <div className="mt-3 border-t border-border pt-3">
                <button onClick={() => setOpenLesson(isOpen ? null : lesson.id)} className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Ответы по дням ({lessonAnswers.length})
                </button>
                {isOpen && (
                  <div className="mt-3 space-y-3">
                    {(lesson.days || []).map((day, di) => {
                      const dayAnswers = lessonAnswers.filter((a) => a.day_index === di);
                      if (!dayAnswers.length) return null;
                      return (
                        <div key={di} className="rounded-md border border-border p-3">
                          <div className="text-sm font-medium text-foreground mb-2">{day.title || `День ${di + 1}`}</div>
                          {dayAnswers.map((a, qi) => (
                            <div key={qi} className="mb-3 last:mb-0">
                              <div className="text-xs text-muted-foreground mb-1">
                                {a.question_text || `Вопрос ${a.question_index + 1}`}
                              </div>
                              <div className="flex items-start gap-2">
                                {a.answer_format === 'audio' && <Mic className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />}
                                <p className="text-sm text-foreground whitespace-pre-wrap flex-1 rounded-md bg-muted/50 p-2">
                                  {a.answer_text || '(голосовой ответ)'}
                                </p>
                              </div>
                              {a.ai_feedback && (
                                <div className="mt-2 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2">
                                  <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5" />
                                  <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{a.ai_feedback}</p>
                                </div>
                              )}
                              {a.feedback_status === 'processing' && <p className="text-xs text-muted-foreground mt-1">Обработка…</p>}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {!lessonAnswers.length && <p className="text-sm text-muted-foreground">Ответов пока нет.</p>}
                  </div>
                )}
              </div>
            )}

            {hasPractice && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm font-medium text-foreground">Практическое задание</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{lesson.practice_prompt}</p>
                <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">{item?.practice_answer || 'Ответ ученика пока не сохранён.'}</p>
                <Button className="mt-3" size="sm" variant={item?.practice_completed ? 'secondary' : 'outline'} onClick={() => onTogglePractice(lesson, item)}>
                  {item?.practice_completed ? 'Отменить выполнение' : 'Отметить выполненным'}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}