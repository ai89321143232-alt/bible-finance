import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Construction, Video, ClipboardList } from 'lucide-react';
import { getEducationTopic } from '@/data/educationTopics';

// ============================================================
// EducationLesson.jsx — страница отдельного урока обучения
// URL: /Education/:lessonId
// ============================================================
export default function EducationLesson() {
  const { lessonId } = useParams();
  const topic = getEducationTopic(lessonId);

  if (!topic) {
    return <Navigate to="/Education" replace />;
  }

  const Icon = topic.icon;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <Link
        to="/Education"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Все темы обучения
      </Link>

      <div className="p-5 sm:p-6 rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${topic.color}1A` }}
          >
            <Icon className="w-6 h-6" style={{ color: topic.color }} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{topic.title}</h1>
            <div className="text-sm text-muted-foreground">{topic.subtitle}</div>
          </div>
        </div>

        <p className="mt-4 text-muted-foreground leading-relaxed">{topic.description}</p>
      </div>

      <Card className="mt-6 p-6 flex flex-col items-center text-center gap-3">
        <Construction className="w-8 h-8 text-amber-500" />
        <div className="font-semibold text-foreground">Материал в процессе изготовления</div>
        <p className="text-sm text-muted-foreground max-w-md">
          Мы готовим для этой темы видео-урок и домашнее задание. Материалы появятся здесь совсем скоро —
          загляните позже!
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-card/50">
          <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Видео-урок — скоро</span>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-card/50">
          <ClipboardList className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Домашнее задание — скоро</span>
        </div>
      </div>
    </div>
  );
}