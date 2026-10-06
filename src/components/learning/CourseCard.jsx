import React from 'react';
import { BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CourseCard({ course, progress = 0, onOpen }) {
  return <Card className="p-4 glass-card cursor-pointer" onClick={onOpen}>
    <div className="flex gap-3">
      <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><h2 className="font-semibold text-foreground truncate">{course.title}</h2>{progress === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}</div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{course.description || 'Учебный курс'}</p>
        <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} /></div><span className="text-sm font-medium text-foreground">{progress}%</span><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
      </div>
    </div>
  </Card>;
}