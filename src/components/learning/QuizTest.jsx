import React from 'react';
import QuizQuestionAnswer, { isCorrectAnswer } from '@/components/learning/QuizQuestionAnswer';

const normalizeLegacyAnswer = (question, answer) => typeof answer === 'number' ? { type: question.type || 'single', index: answer } : answer;

export default function QuizTest({ questions, answers, setAnswers, submitted }) {
  const preparedAnswers = questions.map((question, index) => normalizeLegacyAnswer(question, answers[index]));
  const correctCount = questions.filter((question, index) => isCorrectAnswer(question, preparedAnswers[index])).length;
  const updateAnswer = (index, answer) => { const next = [...preparedAnswers]; next[index] = answer; setAnswers(next); };
  return <div className="space-y-4 border-t border-border pt-4"><div><div className="font-medium text-foreground">Проверочный тест</div>{submitted && <p className="mt-1 text-sm text-muted-foreground">Результат: {correctCount} из {questions.length}</p>}</div>{questions.map((question, index) => <QuizQuestionAnswer key={index} question={question} index={index} answer={preparedAnswers[index]} onChange={(answer) => updateAnswer(index, answer)} submitted={submitted} />)}</div>;
}