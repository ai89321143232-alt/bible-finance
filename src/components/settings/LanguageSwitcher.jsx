import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { LANGUAGES } from '@/lib/i18n';
import { Globe } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select value={language} onValueChange={(v) => setLanguage(v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(LANGUAGES).map(([code, info]) => (
            <SelectItem key={code} value={code}>
              <span className="flex items-center gap-2">
                <span>{info.flag}</span>
                <span>{info.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}