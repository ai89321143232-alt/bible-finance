import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Users, Plus, Settings2, Pencil, Trash2 } from 'lucide-react';
import CourseForm from '@/components/learning/CourseForm';
import ModuleLessonForm from '@/components/learning/ModuleLessonForm';
import LearningImport from '@/components/learning/LearningImport';
import EditLessonDialog from '@/components/learning/EditLessonDialog';
import EditModuleDialog from '@/components/learning/EditModuleDialog';

export default function LearningAdmin() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [courseOpen, setCourseOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState({ title: '', course_id: '', member_ids: [] });
  const [editLesson, setEditLesson] = useState(null);
  const [editModule, setEditModule] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    const me = await base44.auth.me();
    setUser(me);
    if (me.role !== 'admin') return navigate('/Education');
    const [coursePage, groupPage, allUsers, progressPage] = await Promise.all([
      base44.entities.LearningCourse.filter({}, { sort: 'sort_order', limit: 100 }),
      base44.entities.LearningGroup.filter({}, { limit: 100 }),
      base44.entities.User.list(),
      base44.entities.LessonProgress.filter({}, { limit: 1000 }),
    ]);
    setCourses(coursePage.items);
    setGroups(groupPage.items);
    setUsers(allUsers);
    setProgress(progressPage.items);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!selected) { setModules([]); setLessons([]); return; }
    Promise.all([
      base44.entities.LearningModule.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 100 }),
      base44.entities.LearningLesson.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 200 }),
    ]).then(([mods, less]) => {
      setModules(mods.items);
      const moduleOrder = new Map(mods.items.map((m, i) => [m.id, i]));
      const sorted = [...less.items].sort((a, b) => {
        const am = moduleOrder.get(a.module_id) ?? 999;
        const bm = moduleOrder.get(b.module_id) ?? 999;
        if (am !== bm) return am - bm;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
      setLessons(sorted);
    });
  }, [selected]);

  const saveCourse = async (data) => {
    setSaving(true);
    if (selected) {
      await base44.entities.LearningCourse.update(selected.id, data);
      await Promise.all([
        base44.entities.LearningModule.updateMany({ course_id: selected.id }, { $set: { course_status: data.status } }),
        base44.entities.LearningLesson.updateMany({ course_id: selected.id }, { $set: { course_status: data.status } }),
      ]);
      setSelected({ ...selected, ...data });
    } else {
      const course = await base44.entities.LearningCourse.create({ ...data, sort_order: courses.length });
      setSelected(course);
    }
    setCourseOpen(false);
    setSaving(false);
    load();
  };

  const addModule = async (data) => {
    setSaving(true);
    await base44.entities.LearningModule.create({ ...data, course_id: selected.id, course_status: selected.status, sort_order: modules.length });
    const res = await base44.entities.LearningModule.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 100 });
    setModules(res.items);
    setSaving(false);
  };

  const addLesson = async (data) => {
    setSaving(true);
    const count = await base44.entities.LearningLesson.count({ module_id: data.module_id });
    await base44.entities.LearningLesson.create({ ...data, course_id: selected.id, course_status: selected.status, sort_order: count });
    setSaving(false);
    const res = await base44.entities.LearningLesson.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 200 });
    setLessons(res.items);
  };

  const deleteLesson = async (lesson) => {
    if (!confirm(`Удалить урок «${lesson.title}»? Прогресс учеников сохранится, но урок исчезнет из курса.`)) return;
    await base44.entities.LearningLesson.delete(lesson.id);
    const res = await base44.entities.LearningLesson.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 200 });
    setLessons(res.items);
  };

  const deleteModule = async (mod) => {
    if (!confirm(`Удалить модуль «${mod.title}»? Уроки этого модуля останутся без модуля.`)) return;
    await base44.entities.LearningModule.delete(mod.id);
    const res = await base44.entities.LearningModule.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 100 });
    setModules(res.items);
  };

  const selfEnroll = async () => {
    if (!selected) return;
    setSaving(true);
    const exists = await base44.entities.CourseAssignment.filter({ course_id: selected.id, user_id: user.id }, { limit: 1 });
    if (!exists.items?.length) {
      const grp = await base44.entities.LearningGroup.create({ title: `Тест — ${user.full_name || user.email}`, course_id: selected.id, member_ids: [user.id] });
      await base44.entities.CourseAssignment.create({ course_id: selected.id, group_id: grp.id, user_id: user.id });
    }
    setSaving(false);
    navigate(`/LearningCourse/${selected.id}`);
  };

  const resetProgress = async () => {
    if (!selected) return;
    if (!confirm(`Сбросить весь прогресс курса «${selected.title}» для всех учеников?`)) return;
    setSaving(true);
    try {
      await base44.functions.invoke('resetCourseProgress', { courseId: selected.id });
      alert('Прогресс курса сброшен.');
    } catch (e) {
      alert('Ошибка: ' + (e?.message || e));
    } finally {
      setSaving(false);
      load();
    }
  };

  const saveGroup = async () => {
    setSaving(true);
    const created = await base44.entities.LearningGroup.create(group);
    await base44.entities.CourseAssignment.bulkCreate(group.member_ids.map((user_id) => ({ course_id: group.course_id, group_id: created.id, user_id })));
    setGroupOpen(false);
    setGroup({ title: '', course_id: '', member_ids: [] });
    setSaving(false);
    load();
  };

  if (!user || user.role !== 'admin') return null;
  const completedFor = (courseId) => progress.filter((item) => item.course_id === courseId && item.completed).length;

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-24 lg:pb-8">
    <div className="flex items-center justify-between gap-3 mb-6">
      <div><h1 className="text-2xl font-bold text-foreground">Управление обучением</h1><p className="text-sm text-muted-foreground">Курсы, модули, уроки и прогресс участников</p></div>
      <div className="flex gap-2"><Button asChild variant="outline"><Link to="/LearningAnalytics"><BarChart3 className="w-4 h-4 mr-2" />Аналитика</Link></Button><Button onClick={() => { setSelected(null); setCourseOpen(true); }}><Plus className="w-4 h-4 mr-2" />Курс</Button></div>
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5 glass-card">
        <div className="flex justify-between items-center mb-4"><h2 className="font-semibold">Курсы</h2><Button variant="outline" size="sm" onClick={() => setGroupOpen(true)}><Users className="w-4 h-4 mr-1" />Группа</Button></div>
        <div className="space-y-2">{courses.map((course) => <button key={course.id} onClick={() => setSelected(course)} className={`w-full text-left p-3 rounded-lg border ${selected?.id === course.id ? 'border-primary bg-primary/5' : 'border-border'}`}><div className="font-medium text-foreground">{course.title}</div><div className="text-sm text-muted-foreground">{course.status === 'published' ? 'Опубликован' : 'Черновик'} · завершений: {completedFor(course.id)}</div></button>)}</div>
      </Card>
      <Card className="p-5 glass-card">
        <h2 className="font-semibold mb-4">Учебные группы</h2>
        {groups.length ? <div className="space-y-2">{groups.map((item) => <div key={item.id} className="p-3 rounded-lg border border-border"><div className="font-medium text-foreground">{item.title}</div><div className="text-sm text-muted-foreground">Участников: {item.member_ids?.length || 0}</div></div>)}</div> : <p className="text-sm text-muted-foreground">Групп пока нет.</p>}
      </Card>
    </div>

    {selected && <Card className="p-5 glass-card mt-5">
      <div className="flex justify-between gap-3 mb-5">
        <div><h2 className="font-semibold">{selected.title}</h2><p className="text-sm text-muted-foreground">Редактируйте модули и уроки. Прогресс учеников сохраняется.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selfEnroll} disabled={saving || selected.status !== 'published'}>{saving ? '…' : 'Проверить как студент'}</Button>
          <Button variant="outline" size="sm" onClick={resetProgress} disabled={saving}>Сбросить прогресс</Button>
          <Button variant="outline" size="sm" onClick={() => setCourseOpen(true)}><Settings2 className="w-4 h-4 mr-1" />Изменить</Button>
        </div>
      </div>

      <LearningImport course={selected} onDone={() => { load(); base44.entities.LearningModule.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 100 }).then((res) => setModules(res.items)); }} />

      {modules.length > 0 && (
        <div className="space-y-4 mt-6">
          {modules.map((mod) => {
            const modLessons = lessons.filter((l) => l.module_id === mod.id);
            return (
              <div key={mod.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{mod.title}</div>
                    {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditModule(mod)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteModule(mod)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                {modLessons.length > 0 && (
                  <div className="space-y-1 pl-2">
                    {modLessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2">
                        <span className="text-sm text-foreground flex-1">{lesson.title}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditLesson(lesson)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteLesson(lesson)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <ModuleLessonForm modules={modules} onCreateModule={addModule} onCreateLesson={addLesson} saving={saving} />
      </div>
    </Card>}

    <Dialog open={courseOpen} onOpenChange={setCourseOpen}><DialogContent><DialogHeader><DialogTitle>{selected ? 'Настройки курса' : 'Новый курс'}</DialogTitle></DialogHeader><CourseForm course={selected} onSave={saveCourse} saving={saving} /></DialogContent></Dialog>

    <Dialog open={groupOpen} onOpenChange={setGroupOpen}><DialogContent><DialogHeader><DialogTitle>Новая учебная группа</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Название группы</Label><Input className="mt-1" value={group.title} onChange={(e) => setGroup({ ...group, title: e.target.value })} /></div><div><Label>Курс</Label><select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={group.course_id} onChange={(e) => setGroup({ ...group, course_id: e.target.value })}><option value="">Выберите курс</option>{courses.filter((item) => item.status === 'published').map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div><Label>Участники</Label><div className="mt-2 max-h-48 overflow-y-auto space-y-2">{users.filter((item) => item.role !== 'admin').map((item) => <label className="flex gap-2 text-sm" key={item.id}><input type="checkbox" checked={group.member_ids.includes(item.id)} onChange={(e) => setGroup({ ...group, member_ids: e.target.checked ? [...group.member_ids, item.id] : group.member_ids.filter((id) => id !== item.id) })} />{item.full_name || item.email}</label>)}</div></div><Button className="w-full" disabled={!group.title || !group.course_id || saving} onClick={saveGroup}>{saving ? 'Сохранение…' : 'Создать группу'}</Button></div></DialogContent></Dialog>

    <EditLessonDialog lesson={editLesson} open={!!editLesson} onOpenChange={(o) => { if (!o) setEditLesson(null); }} onSaved={() => { base44.entities.LearningLesson.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 200 }).then((res) => setLessons(res.items)); }} />
    <EditModuleDialog module={editModule} open={!!editModule} onOpenChange={(o) => { if (!o) setEditModule(null); }} onSaved={() => { base44.entities.LearningModule.filter({ course_id: selected.id }, { sort: 'sort_order', limit: 100 }).then((res) => setModules(res.items)); }} />
  </div>;
}