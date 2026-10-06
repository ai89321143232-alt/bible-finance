import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const { courseId, userId } = await req.json();
    if (!courseId || !userId) return Response.json({ error: 'courseId and userId are required' }, { status: 400 });
    const base44 = createClientFromRequest(req);
    const data = base44.asServiceRole;
    const [course, lessonPage, progressPage, assignmentPage, existingPage, student, answerPage] = await Promise.all([
      data.entities.LearningCourse.get(courseId),
      data.entities.LearningLesson.filter({ course_id: courseId }, { limit: 500 }),
      data.entities.LessonProgress.filter({ course_id: courseId, user_id: userId }, { limit: 1000 }),
      data.entities.CourseAssignment.filter({ course_id: courseId, user_id: userId }, { limit: 1 }),
      data.entities.CourseCertificate.filter({ course_id: courseId, user_id: userId }, { limit: 1 }),
      data.entities.User.get(userId),
      data.entities.LessonAnswer.filter({ course_id: courseId, user_id: userId }, { limit: 2000 }),
    ]);
    if (!course || !student || !assignmentPage.items.length) return Response.json({ issued: false });
    if (existingPage.items.length) return Response.json({ issued: false, certificate: existingPage.items[0] });
    const lessons = lessonPage.items;
    const progress = progressPage.items;
    const answers = answerPage.items;
    const practiceLessons = lessons.filter((lesson) => lesson.practice_prompt);
    const lessonsComplete = lessons.length > 0 && lessons.every((lesson) => progress.some((item) => item.lesson_id === lesson.id && item.completed));
    const practicesComplete = practiceLessons.every((lesson) => progress.some((item) => item.lesson_id === lesson.id && item.practice_completed));
    // For day-based lessons, check that all questions across all days have feedback
    const dayBasedLessons = lessons.filter((lesson) => (lesson.days || []).length > 0);
    const dayQuestionsComplete = dayBasedLessons.every((lesson) => {
      const totalQuestions = (lesson.days || []).reduce((sum, day) => sum + (day.questions || []).length, 0);
      if (totalQuestions === 0) return true;
      const lessonAnswers = answers.filter((a) => a.lesson_id === lesson.id);
      return lessonAnswers.filter((a) => a.feedback_status === 'done').length >= totalQuestions;
    });
    if (!lessonsComplete || !practicesComplete || !dayQuestionsComplete) return Response.json({ issued: false });
    const certificate = await data.entities.CourseCertificate.create({ course_id: courseId, user_id: userId, student_name: student.full_name || student.email, course_title: course.title, certificate_number: `BF-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, issued_at: new Date().toISOString() });
    return Response.json({ issued: true, certificate });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}