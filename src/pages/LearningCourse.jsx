import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import LessonViewer from '@/components/learning/LessonViewer';
import PrivateImage from '@/components/learning/PrivateImage';
import CourseCertificateCard from '@/components/learning/CourseCertificateCard';

export default function LearningCourse() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const viewerRef = useRef(null);

  const load = async () => {
    const user = await base44.auth.me();
    const [c, m, l, p, certs, ans] = await Promise.all([
      base44.entities.LearningCourse.get(courseId),
      base44.entities.LearningModule.filter({ course_id: courseId }, { sort: 'sort_order', limit: 100 }),
      base44.entities.LearningLesson.filter({ course_id: courseId }, { sort: 'sort_order', limit: 200 }),
      base44.entities.LessonProgress.filter({ course_id: courseId }, { limit: 500 }),
      base44.entities.CourseCertificate.filter({ course_id: courseId, user_id: user.id }, { limit: 1 }),
      base44.entities.LessonAnswer.filter({ course_id: courseId, user_id: user.id }, { limit: 1000 }),
    ]);
    setCourse(c);
    setModules(m.items);
    const moduleOrder = new Map(m.items.map((mod, i) => [mod.id, i]));
    const sortedLessons = [...l.items].sort((a, b) => {
      const am = moduleOrder.get(a.module_id) ?? 999;
      const bm = moduleOrder.get(b.module_id) ?? 999;
      if (am !== bm) return am - bm;
      const as = a.sort_order ?? 0;
      const bs = b.sort_order ?? 0;
      if (as !== bs) return as - bs;
      return (a.created_date || '').localeCompare(b.created_date || '');
    });
    setLessons(sortedLessons);
    setProgress(p.items);
    setCertificate(certs.items[0] || null);
    setAnswers(ans.items);
    setSelectedId((current) => current || sortedLessons[0]?.id);
  };

  useEffect(() => { load(); }, [courseId]);

  useEffect(() => {
    if (selectedId && viewerRef.current) {
      viewerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

  if (!course) return <div className="p-8 text-center text-sm text-muted-foreground">Загрузка курса…</div>;

  const selectedIndex = lessons.findIndex((item) => item.id === selectedId);
  const selected = lessons[selectedIndex];
  const selectedProgress = progress.find((item) => item.lesson_id === selectedId);
  const selectedAnswers = answers.filter((a) => a.lesson_id === selectedId);
  const canOpen = selectedIndex <= 0 || progress.some((item) => item.lesson_id === lessons[selectedIndex - 1]?.id && item.completed);

  const saveProgress = async (data) => {
    if (selectedProgress) await base44.entities.LessonProgress.update(selectedProgress.id, data);
    else await base44.entities.LessonProgress.create({ course_id: courseId, lesson_id: selectedId, user_id: (await base44.auth.me()).id, ...data });
    await load();
  };

  const submitAnswer = async ({ day_index, question_index, question_text, answer_text, audio_blob, answer_format }) => {
    setSubmitting(true);
    try {
      const existing = selectedAnswers.find((a) => a.day_index === day_index && a.question_index === question_index);
      let audio_uri = existing?.audio_uri || '';
      let finalText = answer_text || '';

      if (answer_format === 'audio' && audio_blob) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: audio_blob });
        audio_uri = file_uri;
      }

      let saved;
      const payload = {
        course_id: courseId,
        lesson_id: selectedId,
        module_id: selected?.module_id || '',
        user_id: (await base44.auth.me()).id,
        day_index,
        question_index,
        question_text,
        answer_text: finalText,
        audio_uri,
        answer_format,
        feedback_status: 'pending',
        submitted_at: new Date().toISOString(),
      };

      if (existing) {
        saved = await base44.entities.LessonAnswer.update(existing.id, payload);
      } else {
        saved = await base44.entities.LessonAnswer.create(payload);
      }

      // If audio, transcribe first, then review. If text, review directly.
      if (answer_format === 'audio' && audio_uri) {
        await base44.functions.invoke('reviewLessonAnswer', { answer_id: saved.id });
      } else {
        await base44.functions.invoke('reviewLessonAnswer', { answer_id: saved.id });
      }
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const lessonButton = (lesson, index) => {
    const done = progress.some((item) => item.lesson_id === lesson.id && item.completed);
    const open = index === 0 || progress.some((item) => item.lesson_id === lessons[index - 1]?.id && item.completed);
    return (
      <button key={lesson.id} onClick={() => open && setSelectedId(lesson.id)} className={`w-full flex gap-2 p-3 text-left rounded-lg border text-sm ${selectedId === lesson.id ? 'border-primary bg-primary/5' : 'border-border'} ${open ? '' : 'opacity-60 cursor-not-allowed'}`}>
        {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : open ? <span className="w-4 text-center">{index + 1}</span> : <Lock className="w-4 h-4 shrink-0" />}
        <span>{lesson.title}</span>
      </button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 pb-24 lg:pb-8">
      <Link to="/LearningCourses" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-5"><ArrowLeft className="w-4 h-4" />Моё обучение</Link>
      <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
      <CourseCertificateCard certificate={certificate} />
      <div className="grid lg:grid-cols-[260px_1fr] gap-5 mt-6">
        <aside className="space-y-4">
          {modules.map((module) => (
            <section key={module.id} className="space-y-2">
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {module.poster_uri && <PrivateImage fileUri={module.poster_uri} alt={module.title} className="h-28 w-full object-cover" />}
                <div className="p-3">
                  <h2 className="text-sm font-semibold text-foreground">{module.title}</h2>
                  {module.description && <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>}
                </div>
              </div>
              {lessons.map((lesson, index) => lesson.module_id === module.id ? lessonButton(lesson, index) : null)}
            </section>
          ))}
          {!modules.length && lessons.map(lessonButton)}
        </aside>
        {selected && <div ref={viewerRef}><LessonViewer lesson={selected} progress={selectedProgress} canOpen={canOpen} onSave={saveProgress} answers={selectedAnswers} onAnswer={submitAnswer} /></div>}
      </div>
    </div>
  );
}