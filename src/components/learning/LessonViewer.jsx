import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ExternalLink, PlayCircle } from 'lucide-react';
import QuizTest from '@/components/learning/QuizTest';

export default function LessonViewer({ lesson, progress, canOpen, onSave }) {
  const [practice, setPractice] = useState(progress?.practice_answer || '');
  const [answers, setAnswers] = useState(progress?.quiz_answers || []);
  const questions = lesson.quiz_questions || [];
  useEffect(() => { setPractice(progress?.practice_answer || ''); setAnswers(progress?.quiz_answers || []); }, [lesson.id, progress?.practice_answer, progress?.quiz_answers]);
  if (!canOpen) return <Card className="p-5 text-sm text-muted-foreground">Сначала завершите предыдущий урок.</Card>;
  const complete = () => onSave({ practice_answer: practice, quiz_answers: answers, quiz_passed: false, completed: true, completed_at: new Date().toISOString() });
  return <Card className="p-5 glass-card space-y-5"><div><h1 className="text-xl font-bold text-foreground">{lesson.title}</h1><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{lesson.content}</p></div>{lesson.video_url && <a href={lesson.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary font-medium"><PlayCircle className="w-4 h-4" />Открыть видео</a>}{lesson.resource_url && <a href={lesson.resource_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary font-medium"><ExternalLink className="w-4 h-4" />Открыть материал</a>}{lesson.practice_prompt && <div className="space-y-2"><div className="font-medium text-foreground">Практическое задание</div><p className="text-sm text-muted-foreground">{lesson.practice_prompt}</p><Textarea disabled={progress?.completed} value={practice} onChange={(e) => setPractice(e.target.value)} placeholder="Ваш ответ" /></div>}{questions.length > 0 && <QuizTest questions={questions} answers={answers} setAnswers={setAnswers} submitted={progress?.completed} />}<Button className="w-full" onClick={complete} disabled={progress?.completed}>{progress?.completed ? <><CheckCircle2 className="w-4 h-4 mr-2" />Урок завершён</> : 'Завершить урок'}</Button></Card>;
}