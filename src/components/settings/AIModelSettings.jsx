import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Eye, EyeOff, Check, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

const AI_PROVIDERS = [
  {
    key: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek-V3 — мощная модель для аналитики',
    docsUrl: 'https://platform.deepseek.com/api-keys',
    placeholder: 'sk-...',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'openai',
    name: 'ChatGPT (OpenAI)',
    description: 'GPT-4o — лучшая модель для финансовой аналитики',
    docsUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
];

export default function AIModelSettings({ open, onOpenChange }) {
  const [keys, setKeys] = useState({ deepseek: '', openai: '' });
  const [showKey, setShowKey] = useState({ deepseek: false, openai: false });
  const [activeModel, setActiveModel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadSettings();
  }, [open]);

  const loadSettings = async () => {
    const user = await base44.auth.me();
    setKeys({
      deepseek: user.data?.ai_deepseek_key || '',
      openai: user.data?.ai_openai_key || '',
    });
    setActiveModel(user.data?.ai_active_model || '');
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      ai_deepseek_key: keys.deepseek,
      ai_openai_key: keys.openai,
      ai_active_model: activeModel,
    });
    setSaving(false);
    toast.success('Настройки AI сохранены');
    onOpenChange(false);
  };

  const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 6) + '•'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-600" />
            Подключение AI-моделей
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-1">
          Добавьте свой API-ключ для использования AI в аналитике. Ключи хранятся только в вашем аккаунте.
        </p>

        <div className="space-y-5 mt-2">
          {AI_PROVIDERS.map((provider) => {
            const hasKey = !!keys[provider.key];
            const isActive = activeModel === provider.key;
            return (
              <div key={provider.key} className={`rounded-xl border-2 p-4 transition-all ${isActive ? 'border-violet-500' : 'border-slate-100 dark:border-slate-700'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{provider.name}</span>
                    {hasKey && (
                      <Badge className={provider.color}>
                        <span className={`w-1.5 h-1.5 rounded-full ${provider.dotColor} mr-1.5`} />
                        Ключ добавлен
                      </Badge>
                    )}
                  </div>
                  <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-violet-600 flex items-center gap-1 hover:underline">
                    Получить ключ <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{provider.description}</p>
                <div className="relative">
                  <Input
                    type={showKey[provider.key] ? 'text' : 'password'}
                    value={keys[provider.key]}
                    onChange={(e) => setKeys(prev => ({ ...prev, [provider.key]: e.target.value }))}
                    placeholder={provider.placeholder}
                    className="rounded-xl pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(prev => ({ ...prev, [provider.key]: !prev[provider.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKey[provider.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {hasKey && (
                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className={`mt-3 rounded-xl w-full ${isActive ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
                    onClick={() => setActiveModel(isActive ? '' : provider.key)}
                  >
                    {isActive ? <><Check className="w-3.5 h-3.5 mr-1.5" />Активна</> : 'Использовать для аналитики'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <Separator className="my-2" />

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
        >
          <Check className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}