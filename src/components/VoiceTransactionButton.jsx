import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const CATEGORY_EMOJIS = {
    'Еда и рестораны': '🍕',
    'Транспорт': '🚗',
    'Здоровье': '💊',
    'Развлечения': '🎬',
    'Одежда': '👕',
    'ЖКХ': '🏠',
    'Связь': '📱',
    'Образование': '📚',
    'Зарплата': '💰',
    'Другое': '📦',
};

export default function VoiceTransactionButton({ onTransactionCreated }) {
    const [status, setStatus] = useState('idle'); // idle | recording | processing | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        setStatus('recording');
        setResult(null);
        setErrorMsg('');
        chunksRef.current = [];

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // iOS Safari doesn't support audio/webm — pick whatever the browser supports
          let mimeType = '';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          }
          const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
          mediaRecorderRef.current = mediaRecorder;
          // Store MIME info for later use (Safari reports empty string for mimeType)
          const detectedMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
          const fileExt = detectedMime.includes('mp4') ? 'm4a' : 'webm';

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            if (chunksRef.current.length === 0) {
              setErrorMsg('Не удалось записать аудио');
              setStatus('error');
              setTimeout(() => setStatus('idle'), 3000);
              return;
            }
            const blob = new Blob(chunksRef.current, { type: detectedMime });
            await processAudio(blob, fileExt);
          };

          mediaRecorder.start();
        } catch (err) {
          setErrorMsg(err.name === 'NotAllowedError' ? 'Доступ к микрофону запрещён' : 'Микрофон недоступен');
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
            setStatus('processing');
        }
    };

    const processAudio = async (blob, ext) => {
        try {
            // Convert Blob to File so the SDK detects it as binary and uses multipart
            const fileName = 'recording.' + (ext || 'webm');
            const fileType = blob.type || 'audio/webm';
            const file = new File([blob], fileName, { type: fileType });
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            // Отправляем на обработку
            const response = await base44.functions.invoke('voiceTransaction', { audio_url: file_url });
            const data = response.data;

            if (data.error) {
                setErrorMsg(data.error + (data.transcript ? `\n"${data.transcript}"` : ''));
                setStatus('error');
                return;
            }

            setResult(data);
            setStatus('success');
            if (onTransactionCreated) onTransactionCreated(data.transaction);

            setTimeout(() => setStatus('idle'), 4000);
        } catch (err) {
            setErrorMsg(err.message || 'Ошибка обработки');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const handleClick = () => {
        if (status === 'idle' || status === 'success' || status === 'error') startRecording();
        else if (status === 'recording') stopRecording();
    };

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Кнопка */}
            <motion.button
                onClick={handleClick}
                disabled={status === 'processing'}
                whileTap={{ scale: 0.92 }}
                className={`
                    relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200
                    ${status === 'recording' ? 'bg-red-500 shadow-red-500/40 shadow-xl' : ''}
                    ${status === 'processing' ? 'bg-white/10 cursor-not-allowed' : ''}
                    ${status === 'success' ? 'bg-green-500' : ''}
                    ${status === 'error' ? 'bg-red-400' : ''}
                    ${status === 'idle' ? 'bg-white hover:bg-white/90' : ''}
                `}
            >
                {status === 'recording' && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-red-500 opacity-30"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                )}
                {status === 'idle' && <Mic className="w-7 h-7 text-black" />}
                {status === 'recording' && <MicOff className="w-7 h-7 text-white" />}
                {status === 'processing' && <Loader2 className="w-7 h-7 text-white animate-spin" />}
                {status === 'success' && <CheckCircle className="w-7 h-7 text-white" />}
                {status === 'error' && <AlertCircle className="w-7 h-7 text-white" />}
            </motion.button>

            {/* Подсказка */}
            <p className="text-xs text-white/40">
                {status === 'idle' && 'Нажмите и говорите'}
                {status === 'recording' && 'Запись... нажмите чтобы остановить'}
                {status === 'processing' && 'Обрабатываю...'}
                {status === 'success' && 'Транзакция добавлена!'}
                {status === 'error' && 'Ошибка'}
            </p>

            {/* Результат */}
            <AnimatePresence>
                {status === 'success' && result?.parsed && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[180px]"
                    >
                        <div className="text-2xl mb-1">
                            {CATEGORY_EMOJIS[result.parsed.category] || '📦'}
                        </div>
                        <div className={`text-lg font-bold ${result.parsed.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                            {result.parsed.type === 'expense' ? '-' : '+'}{result.parsed.amount?.toLocaleString()} ₽
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">{result.parsed.description}</div>
                    </motion.div>
                )}
                {status === 'error' && errorMsg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-red-400 text-center max-w-[200px]"
                    >
                        {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}