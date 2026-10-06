import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import DayEditor from '@/components/learning/DayEditor';
import QuizQuestionEditor from '@/components/learning/QuizQuestionEditor';

const emptyQuestion = () => ({ question: '', type: 'single', options: ['', ''], correct_index: 0, correct_indexes: [] });

export default function EditLessonDialog({ lesson, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (lesson) {
      setForm({
        module_id: lesson.module_id || '',
        title: lesson.title || '',
        content: lesson.content || '',
        video_url: lesson.video_url || '',
        resource_url: lesson.resource_url || '',
        lesson_file_uri: lesson.lesson_file_uri || '',
        assignment_file_uri: lesson.assignment_file_uri || '',
        practice_prompt: lesson.practice_prompt || '',
        quiz_questions: lesson.quiz_questions || [],
        days: lesson.days || [],
        sort_order: lesson.sort_order ?? 0,
      });
    }
  }, [lesson]);

  if (!form) return null;

  const upload = async (file, field) => {
    if (!file) return;
    setUploading(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    setForm((f) => ({ ...f, [field]: file_uri }));
    setUploading(false);
  };

  const updateQuestion = (index, question) =>
    setForm((f) => ({ ...f, quiz_questions: f.quiz_questions.map((q, i) => (i === index ? question : q)) }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.LearningLesson.update(lesson.id, form);
      onOpenChange(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать урок</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Название урока</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Текст урока</Label>
            <Textarea className="mt-1" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div>
            <Label>Ссылка на видео</Label>
            <Input className="mt-1" type="url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
          </div>
          <div>
            <Label>Ссылка на материал</Label>
            <Input className="mt-1" type="url" value={form.resource_url} onChange={(e) => setForm({ ...form, resource_url: e.target.value })} />
          </div>
          <div>
            <Label>Практическое задание (без дней)</Label>
            <Textarea className="mt-1" rows={2} value={form.practice_prompt} onChange={(e) => setForm({ ...form, practice_prompt: e.target.value })} />
          </div>
          <div>
            <Label>Файл урока</Label>
            <Input className="mt-1" type="file" onChange={(e) => upload(e.target.files?.[0], 'lesson_file_uri')} />
            {form.lesson_file_uri && <span className="text-xs text-muted-foreground">Файл загружен</span>}
          </div>
          <div>
            <Label>Файл задания</Label>
            <Input className="mt-1" type="file" onChange={(e) => upload(e.target.files?.[0], 'assignment_file_uri')} />
            {form.assignment_file_uri && <span className="text-xs text-muted-foreground">Файл загружен</span>}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="font-medium text-foreground">Проверочный тест</div>
            {form.quiz_questions.map((q, i) => (
              <QuizQuestionEditor key={i} question={q} index={i} onChange={(next) => updateQuestion(i, next)} onRemove={() => setForm((f) => ({ ...f, quiz_questions: f.quiz_questions.filter((_, j) => j !== i) }))} />
            ))}
            <Button type="button" variant="outline" onClick={() => setForm((f) => ({ ...f, quiz_questions: [...f.quiz_questions, emptyQuestion()] }))}>Добавить вопрос</Button>
          </div>

          <div className="border-t border-border pt-4">
            <DayEditor days={form.days} onChange={(days) => setForm({ ...form, days })} />
          </div>

          <Button className="w-full" onClick={save} disabled={saving || uploading}>
            {saving ? 'Сохранение…' : 'Сохранить изменения'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}