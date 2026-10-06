import React from 'react';
import { Award } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CourseCertificateCard({ certificate }) {
  if (!certificate) return null;
  return <Card className="mt-5 overflow-hidden border-primary/30 glass-card"><div className="bg-primary px-5 py-3 text-primary-foreground"><Award className="inline-block w-5 h-5 mr-2" />Цифровой сертификат</div><div className="p-5 text-center"><p className="text-sm text-muted-foreground">Настоящим подтверждается, что</p><h2 className="mt-2 text-xl font-bold text-foreground">{certificate.student_name}</h2><p className="mt-3 text-sm text-muted-foreground">успешно завершил(а) курс</p><p className="mt-1 font-semibold text-foreground">{certificate.course_title}</p><p className="mt-4 text-sm text-muted-foreground">Выдан {new Date(certificate.issued_at).toLocaleDateString('ru-RU')} · № {certificate.certificate_number}</p></div></Card>;
}