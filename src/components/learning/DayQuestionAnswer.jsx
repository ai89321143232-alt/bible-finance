import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Upload, RefreshCw, Mic } from 'lucide-react';
import VoiceRecorder from '@/components/learning/VoiceRecorder';

export default function DayQuestionAnswer({ question, answer, onSubmit, saving }) {
  const [text, setText] = useState(answer?.answer_text || '');
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const hasFeedback = answer?.feedback_status === 'done' && answer?.ai_feedback;
  const isProcessing = answer?.feedback_status === 'processing' || (saving && !hasFeedback);

  const handleAudio = (blob) => setAudioBlob(blob);

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBlob(file);
  };

  const submit = async (format) => {
    if (format === 'text') {
      if (!text.trim()) return;
      await onSubmit({ answer_text: text, answer_format: 'text' });
    } else {
      if (!audioBlob) return;
      setUploading(true);
      try {
        await onSubmit({ audio_blob: audioBlob, answer_format: 'audio' });
      } finally {
        setUploading(false);
        setAudioBlob(null);
      }
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="text-sm font-medium text-foreground">
        {question.scripture_ref && <span className="text-muted-foreground block mb-1">{question.scripture_ref}</span>}
        {question.text}
      </div>

      {hasFeedback ? (
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              <Mic className="w-3 h-3" />Ваш ответ
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{answer.answer_text}</p>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
              <RefreshCw className="w-3 h-3" />Наставник
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{answer.ai_feedback}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setText(answer.answer_text || ''); }} disabled={saving}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />Пересдать
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите ответ или запишите голосом…"
            disabled={isProcessing}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => submit('text')} disabled={isProcessing || !text.trim()}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Отправить текстом
            </Button>
            <VoiceRecorder onRecorded={handleAudio} disabled={isProcessing} />
            <label className="inline-flex items-center gap-1 text-sm cursor-pointer">
              <input type="file" accept="audio/*" onChange={handleUploadFile} disabled={isProcessing} className="hidden" />
              <Button type="button" variant="outline" size="sm" asChild disabled={isProcessing}>
                <span><Upload className="w-4 h-4 mr-1" />Аудио</span>
              </Button>
            </label>
            {audioBlob && (
              <span className="text-xs text-muted-foreground">
                {audioBlob.name || 'Аудиозапись'} готово —{' '}
                <button type="button" className="text-primary" onClick={() => submit('audio')} disabled={uploading || isProcessing}>
                  отправить
                </button>
              </span>
            )}
          </div>
          {isProcessing && <p className="text-xs text-muted-foreground">Обработка ответа…</p>}
        </div>
      )}
    </div>
  );
}