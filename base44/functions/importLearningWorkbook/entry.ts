import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const value = (row, mapping, field) => String(row[mapping[field]] || '').trim();

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { courseId, rows, mapping, fileUris = {}, preview = false } = await req.json();
    if (!courseId || !Array.isArray(rows) || !mapping?.module_title || !mapping?.lesson_title) return Response.json({ error: 'Выберите курс, модуль и урок для импорта.' }, { status: 400 });
    const [modulesPage, lessonsPage, course] = await Promise.all([
      base44.entities.LearningModule.filter({ course_id: courseId }, { sort: 'sort_order', limit: 1000 }),
      base44.entities.LearningLesson.filter({ course_id: courseId }, { sort: 'sort_order', limit: 1000 }),
      base44.entities.LearningCourse.get(courseId),
    ]);
    if (!course) return Response.json({ error: 'Курс не найден.' }, { status: 404 });
    const modules = modulesPage.items;
    const lessons = lessonsPage.items;
    const validRows = rows.filter((row) => value(row, mapping, 'module_title') && value(row, mapping, 'lesson_title'));
    const skipped = rows.length - validRows.length;
    const existingModules = new Map(modules.map((item) => [item.title.toLocaleLowerCase(), item]));
    const existingLessons = new Map(lessons.map((item) => [`${item.module_id}:${item.title.toLocaleLowerCase()}`, item]));
    const moduleTitles = new Set(validRows.map((row) => value(row, mapping, 'module_title').toLocaleLowerCase()));
    const lessonMatches = validRows.filter((row) => { const module = existingModules.get(value(row, mapping, 'module_title').toLocaleLowerCase()); return module && existingLessons.has(`${module.id}:${value(row, mapping, 'lesson_title').toLocaleLowerCase()}`); }).length;
    if (preview) return Response.json({ rows: validRows.slice(0, 5), valid: validRows.length, skipped, existingModules: [...moduleTitles].filter((title) => existingModules.has(title)).length, existingLessons: lessonMatches });
    let createdModules = 0; let updatedModules = 0; let createdLessons = 0; let updatedLessons = 0;
    for (const row of validRows) {
      const moduleTitle = value(row, mapping, 'module_title');
      const moduleKey = moduleTitle.toLocaleLowerCase();
      const posterName = value(row, mapping, 'module_poster');
      const moduleData = { title: moduleTitle, description: value(row, mapping, 'module_description'), poster_uri: fileUris[posterName] || undefined, course_status: course.status };
      let module = existingModules.get(moduleKey);
      if (module) { await base44.entities.LearningModule.update(module.id, moduleData); updatedModules += 1; module = { ...module, ...moduleData }; }
      else { module = await base44.entities.LearningModule.create({ ...moduleData, course_id: courseId, sort_order: existingModules.size }); existingModules.set(moduleKey, module); createdModules += 1; }
      const lessonTitle = value(row, mapping, 'lesson_title');
      const lessonKey = `${module.id}:${lessonTitle.toLocaleLowerCase()}`;
      const lessonData = { title: lessonTitle, content: value(row, mapping, 'lesson_content'), practice_prompt: value(row, mapping, 'assignment'), lesson_file_uri: fileUris[value(row, mapping, 'lesson_attachment')] || undefined, assignment_file_uri: fileUris[value(row, mapping, 'assignment_attachment')] || undefined, course_status: course.status };
      const lesson = existingLessons.get(lessonKey);
      if (lesson) { await base44.entities.LearningLesson.update(lesson.id, lessonData); updatedLessons += 1; }
      else { const created = await base44.entities.LearningLesson.create({ ...lessonData, course_id: courseId, module_id: module.id, sort_order: lessons.filter((item) => item.module_id === module.id).length }); existingLessons.set(lessonKey, created); lessons.push(created); createdLessons += 1; }
    }
    return Response.json({ createdModules, updatedModules, createdLessons, updatedLessons, skipped });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}