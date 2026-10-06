import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const svc = base44.asServiceRole;
  const { courseId } = await req.json();
  if (!courseId) return Response.json({ error: 'courseId is required' }, { status: 400 });

  const [progress, answers, certs] = await Promise.all([
    svc.entities.LessonProgress.filter({ course_id: courseId }, { limit: 5000 }),
    svc.entities.LessonAnswer.filter({ course_id: courseId }, { limit: 5000 }),
    svc.entities.CourseCertificate.filter({ course_id: courseId }, { limit: 5000 }),
  ]);

  let deleted = 0;
  if (progress.items?.length) {
    await svc.entities.LessonProgress.deleteMany({ id: { $in: progress.items.map((p) => p.id) } });
    deleted += progress.items.length;
  }
  if (answers.items?.length) {
    await svc.entities.LessonAnswer.deleteMany({ id: { $in: answers.items.map((a) => a.id) } });
    deleted += answers.items.length;
  }
  if (certs.items?.length) {
    await svc.entities.CourseCertificate.deleteMany({ id: { $in: certs.items.map((c) => c.id) } });
    deleted += certs.items.length;
  }

  return Response.json({ success: true, deleted });
}