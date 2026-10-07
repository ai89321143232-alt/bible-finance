import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function SectionCard({ icon: Icon, icon3d, title, description, children }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-5">
        <div className="flex gap-3 mb-4">
          {icon3d ? (
            <img src={icon3d} alt="" className="w-12 h-12 rounded-xl object-contain shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-base">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}