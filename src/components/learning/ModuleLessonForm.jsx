import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import QuizQuestionEditor from '@/components/learning/QuizQuestionEditor';

const emptyLesson = () => ({ module_id: '', title: '', content: '', video_url: '', resource_url: '', practice_prompt: '', quiz_questions: [] });
const emptyQuestion = () => ({ question: '', type: 'single', options: ['', ''], correct_index: 0, correct_indexes: [] });

export default function ModuleLessonForm({ modules, onCreateModule, onCreateLesson, saving }) {
  const [module, setModule] = useState({ title: '', description: '' });
  const [lesson, setLesson] = useState(emptyLesson());
  const updateQuestion = (index, question) => setLesson({ ...lesson, quiz_questions: lesson.quiz_questions.map((item, i) => i === index ? question : item) });
  const submitLesson = (e) => { e.preventDefault(); onCreateLesson(lesson); setLesson(emptyLesson()); };
  return <div className="space-y-6">
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onCreateModule(module); setModule({ title: '', description: '' }); }}><div className="font-medium text-foreground">Новый модуль</div><Input placeholder="Название модуля" required value={module.title} onChange={(e) => setModule({ ...module, title: e.target.value })} /><Textarea placeholder="Краткое описание" value={module.description} onChange={(e) => setModule({ ...module, description: e.target.value })} /><Button variant="outline" disabled={saving}>Добавить модуль</Button></form>
    {modules.length > 0 && <form className="space-y-3 border-t border-border pt-5" onSubmit={submitLesson}><div className="font-medium text-foreground">Новый урок</div><select required value={lesson.module_id} onChange={(e) => setLesson({ ...lesson, module_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Выберите модуль</option>{modules.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><Input placeholder="Название урока" required value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} /><Textarea placeholder="Текст урока" required value={lesson.content} onChange={(e) => setLesson({ ...lesson, content: e.target.value })} /><Input placeholder="Ссылка на видео" type="url" value={lesson.video_url} onChange={(e) => setLesson({ ...lesson, video_url: e.target.value })} /><Input placeholder="Ссылка на материал" type="url" value={lesson.resource_url} onChange={(e) => setLesson({ ...lesson, resource_url: e.target.value })} /><Textarea placeholder="Практическое задание" value={lesson.practice_prompt} onChange={(e) => setLesson({ ...lesson, practice_prompt: e.target.value })} /><div className="border-t border-border pt-4 space-y-3"><div className="font-medium text-foreground">Проверочный тест</div>{lesson.quiz_questions.map((question, index) => <QuizQuestionEditor key={index} question={question} index={index} onChange={(next) => updateQuestion(index, next)} onRemove={() => setLesson({ ...lesson, quiz_questions: lesson.quiz_questions.filter((_, i) => i !== index) })} />)}<Button type="button" variant="outline" onClick={() => setLesson({ ...lesson, quiz_questions: [...lesson.quiz_questions, emptyQuestion()] })}>Добавить вопрос</Button></div><Button variant="outline" disabled={saving}>Добавить урок</Button></form>}
  </div>;
}