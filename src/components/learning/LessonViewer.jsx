import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ExternalLink, PlayCircle, ChevronDown, ChevronRight, BookOpen, Check } from 'lucide-react';
import QuizTest from '@/components/learning/QuizTest';
import PrivateFileLink from '@/components/learning/PrivateFileLink';
import DayQuestionAnswer from '@/components/learning/DayQuestionAnswer';

export default function LessonViewer({ lesson, progress, canOpen, onSave, answers = [], onAnswer }) {
  const [practice, setPractice] = useState(progress?.practice_answer || '');
  const [answers2, setAnswers2] = useState(progress?.quiz_answers || []);
  const [openDay, setOpenDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dayPracticeDone, setDayPracticeDone] = useState(progress?.day_practice_done || []);
  const questions = lesson.quiz_questions || [];
  const days = lesson.days || [];

  useEffect(() => {
    setPractice(progress?.practice_answer || '');
    setAnswers2(progress?.quiz_answers || []);
    setOpenDay(0);
    setError(null);
    setDayPracticeDone(progress?.day_practice_done || []);
  }, [lesson.id, progress?.practice_answer, progress?.quiz_answers, progress?.day_practice_done]);

  if (!canOpen) return <Card className="p-5 text-sm text-muted-foreground">Сначала завершите предыдущий урок.</Card>;

  const hasDays = days.length > 0;

  const submitDayAnswer = async (dayIndex, questionIndex, question, payload) => {
    if (!onAnswer) return;
    await onAnswer({ day_index: dayIndex, question_index: questionIndex, question_text: question.text, ...payload });
  };

  // Count answered questions per unique (day_index, question_index) pair
  const totalDayQuestions = hasDays
    ? days.reduce((sum, d) => sum + (d.questions || []).length, 0)
    : 0;
  const answeredDayQuestions = hasDays
    ? days.reduce((sum, d, di) => {
        const qs = d.questions || [];
        return sum + qs.filter((_, qi) => {
          const a = answers.find((x) => x.day_index === di && x.question_index === qi);
          return a?.feedback_status === 'done';
        }).length;
      }, 0)
    : 0;
  const dayQuestionsDone = !hasDays || totalDayQuestions === 0 || answeredDayQuestions >= totalDayQuestions;

  // Day practice completion
  const isDayPracticeDone = (di) => dayPracticeDone.some((p) => p.day_index === di && p.done);
  const toggleDayPractice = (di) => {
    setDayPracticeDone((prev) => {
      const existing = prev.find((p) => p.day_index === di);
      if (existing) {
        return prev.map((p) => p.day_index === di
          ? { ...p, done: !p.done, completed_at: !p.done ? new Date().toISOString() : undefined }
          : p);
      }
      return [...prev, { day_index: di, done: true, completed_at: new Date().toISOString() }];
    });
  };

  const dayPracticeRequired = hasDays && days.some((d) => d.practice_prompt);
  const dayPracticeAllDone = !dayPracticeRequired || days.every((d, di) => !d.practice_prompt || isDayPracticeDone(di));

  const practiceRequired = !hasDays && !!lesson.practice_prompt;
  const practiceDone = !practiceRequired || !!(progress?.practice_completed || (practice && practice.trim()));

  const canComplete = dayQuestionsDone && dayPracticeAllDone && practiceDone;

  const complete = async () => {
    if (!canComplete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        practice_answer: practice,
        quiz_answers: answers2,
        quiz_passed: false,
        completed: true,
        completed_at: new Date().toISOString(),
        day_practice_done: dayPracticeDone,
      });
    } catch (e) {
      setError(e?.message || 'Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 glass-card space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{lesson.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{lesson.content}</p>
      </div>

      {lesson.video_url && (
        <a href={lesson.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary font-medium">
          <PlayCircle className="w-4 h-4" />Открыть видео
        </a>
      )}
      {lesson.resource_url && (
        <a href={lesson.resource_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary font-medium">
          <ExternalLink className="w-4 h-4" />Открыть материал
        </a>
      )}

      <div className="flex flex-wrap gap-2">
        <PrivateFileLink fileUri={lesson.lesson_file_uri} label="Файл урока" />
        <PrivateFileLink fileUri={lesson.assignment_file_uri} label="Файл задания" />
      </div>

      {hasDays && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <BookOpen className="w-4 h-4" />Задания по дням
          </div>
          {days.map((day, di) => {
            const isOpen = openDay === di;
            const dayAnswers = answers.filter((a) => a.day_index === di);
            const dayTotal = (day.questions || []).length;
            const dayDone = dayAnswers.filter((a) => {
              const qi = answers.indexOf(a);
              return a.feedback_status === 'done';
            }).length;
            const dayQuestionsAnswered = (day.questions || []).filter((_, qi) => {
              const a = dayAnswers.find((x) => x.question_index === qi);
              return a?.feedback_status === 'done';
            }).length;
            return (
              <div key={di} className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setOpenDay(isOpen ? -1 : di)}
                  className="w-full flex items-center justify-between p-3 text-left bg-muted/30"
                >
                  <span className="text-sm font-medium text-foreground">
                    {day.title || `День ${di + 1}`}
                    {day.scripture_ref && <span className="ml-2 text-xs text-muted-foreground">{day.scripture_ref}</span>}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {dayTotal > 0 && <span>{dayQuestionsAnswered}/{dayTotal}</span>}
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="p-4 space-y-4">
                    {day.scripture && (
                      <div className="rounded-md bg-primary/5 p-3 text-sm italic text-foreground border-l-2 border-primary">
                        {day.scripture}
                        {day.scripture_ref && <span className="block mt-1 text-xs text-muted-foreground not-italic">{day.scripture_ref}</span>}
                      </div>
                    )}
                    {day.reading && <p className="text-sm text-muted-foreground">{day.reading}</p>}
                    {day.content && <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{day.content}</p>}
                    {(day.questions || []).map((q, qi) => {
                      const a = dayAnswers.find((x) => x.question_index === qi);
                      return (
                        <DayQuestionAnswer
                          key={qi}
                          question={q}
                          answer={a}
                          saving={a?.feedback_status === 'processing'}
                          onSubmit={(payload) => submitDayAnswer(di, qi, q, payload)}
                        />
                      );
                    })}
                    {day.practice_prompt && (
                      <div className={`rounded-md border p-3 ${isDayPracticeDone(di) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground mb-1">Практическое задание</div>
                            <p className="text-sm text-muted-foreground">{day.practice_prompt}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isDayPracticeDone(di) ? 'default' : 'outline'}
                            onClick={() => toggleDayPractice(di)}
                            disabled={progress?.completed}
                          >
                            {isDayPracticeDone(di) ? <><Check className="w-3.5 h-3.5 mr-1" />Выполнено</> : 'Отметить выполненным'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lesson.practice_prompt && !hasDays && (
        <div className="space-y-2">
          <div className="font-medium text-foreground">Практическое задание</div>
          <p className="text-sm text-muted-foreground">{lesson.practice_prompt}</p>
          <Textarea disabled={progress?.completed} value={practice} onChange={(e) => setPractice(e.target.value)} placeholder="Ваш ответ" />
        </div>
      )}

      {questions.length > 0 && <QuizTest questions={questions} answers={answers2} setAnswers={setAnswers2} submitted={progress?.completed} />}

      {hasDays && totalDayQuestions > 0 && (
        <div className="text-sm text-muted-foreground">
          Отвечено вопросов: {answeredDayQuestions} из {totalDayQuestions}
        </div>
      )}

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button className="w-full" onClick={complete} disabled={progress?.completed || saving || !canComplete}>
        {progress?.completed ? <><CheckCircle2 className="w-4 h-4 mr-2" />Урок завершён</> : saving ? 'Сохранение…' : !canComplete ? 'Завершите задания урока' : 'Завершить урок'}
      </Button>
    </Card>
  );
}