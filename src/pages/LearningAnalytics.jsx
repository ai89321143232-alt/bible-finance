import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import StudentProgressSummary from '@/components/learning/StudentProgressSummary';
import StudentLessonProgress from '@/components/learning/StudentLessonProgress';

export default function LearningAnalytics() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(async (user) => {
      if (user.role !== 'admin') return navigate('/Education');
      const page = await base44.entities.LearningCourse.filter({}, { sort: 'sort_order', limit: 100 });
      setCourses(page.items);
      setCourseId(page.items[0]?.id || '');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    Promise.all([
      base44.entities.LearningLesson.filter({ course_id: courseId }, { sort: 'sort_order', limit: 500 }),
      base44.entities.CourseAssignment.filter({ course_id: courseId }, { limit: 500 }),
      base44.entities.LearningGroup.filter({ course_id: courseId }, { limit: 500 }),
    ]).then(async ([lessonPage, assignmentPage, groupPage]) => {
      const ids = [...new Set([...assignmentPage.items.map((item) => item.user_id), ...groupPage.items.flatMap((item) => item.member_ids || [])])];
      const [userPage, progressPage, answerPage] = await Promise.all([
        ids.length ? base44.entities.User.filter({ id: { $in: ids } }, { limit: 500 }) : Promise.resolve({ items: [] }),
        ids.length ? base44.entities.LessonProgress.filter({ course_id: courseId, user_id: { $in: ids } }, { limit: 1000 }) : Promise.resolve({ items: [] }),
        ids.length ? base44.entities.LessonAnswer.filter({ course_id: courseId, user_id: { $in: ids } }, { limit: 2000 }) : Promise.resolve({ items: [] }),
      ]);
      setLessons(lessonPage.items);
      setStudents(userPage.items);
      setProgress(progressPage.items);
      setAnswers(answerPage.items);
      setStudentId((current) => ids.includes(current) ? current : ids[0] || '');
      setLoading(false);
    });
  }, [courseId]);

  const togglePractice = async (lesson, item) => {
    const next = !item?.practice_completed;
    const payload = { practice_completed: next, practice_completed_at: next ? new Date().toISOString() : undefined };
    const saved = item ? await base44.entities.LessonProgress.update(item.id, payload) : await base44.entities.LessonProgress.create({ course_id: courseId, lesson_id: lesson.id, user_id: studentId, ...payload });
    setProgress((items) => item ? items.map((entry) => entry.id === item.id ? saved : entry) : [...items, saved]);
  };

  const selectedProgress = progress.filter((item) => item.user_id === studentId);
  const selectedAnswers = answers.filter((item) => item.user_id === studentId);
  const selectedStudent = students.find((item) => item.id === studentId);

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Загрузка аналитики…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Аналитика обучения</h1>
        <p className="mt-1 text-sm text-muted-foreground">Прогресс назначенных учеников, ответы и обратная связь ИИ-наставника.</p>
      </div>
      <label className="block max-w-md text-sm font-medium text-foreground">Курс
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
        </select>
      </label>
      {!students.length ? (
        <Card className="mt-5 p-5 glass-card text-sm text-muted-foreground">На этот курс пока не назначены ученики.</Card>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
          <Card className="p-4 glass-card space-y-2">
            {students.map((student) => (
              <StudentProgressSummary key={student.id} student={student} lessons={lessons} progress={progress.filter((item) => item.user_id === student.id)} selected={student.id === studentId} onSelect={() => setStudentId(student.id)} />
            ))}
          </Card>
          <Card className="p-5 glass-card">
            <h2 className="text-lg font-semibold text-foreground">{selectedStudent?.full_name || selectedStudent?.email}</h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">Уроки, ответы и статус практических заданий.</p>
            <StudentLessonProgress lessons={lessons} progress={selectedProgress} answers={selectedAnswers} onTogglePractice={togglePractice} />
          </Card>
        </div>
      )}
    </div>
  );
}