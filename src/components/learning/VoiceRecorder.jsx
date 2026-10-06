import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceRecorder({ onRecorded, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => stop(false), []);

  const stop = (emit = true) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRef.current) {
      mediaRef.current.stream?.getTracks?.().forEach((t) => t.stop());
      mediaRef.current.onstop = () => {
        if (emit && chunksRef.current.length) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          onRecorded(blob);
        }
        chunksRef.current = [];
      };
      mediaRef.current.stop();
      mediaRef.current = null;
    }
    setRecording(false);
    setSeconds(0);
  };

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError('Не удалось получить доступ к микрофону');
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <Button type="button" variant="outline" size="sm" onClick={start} disabled={disabled}>
          <Mic className="w-4 h-4 mr-1" />Записать
        </Button>
      ) : (
        <Button type="button" variant="destructive" size="sm" onClick={() => stop()}>
          <Square className="w-4 h-4 mr-1" />{fmt(seconds)}
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}