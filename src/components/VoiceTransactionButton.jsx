import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
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
    const [status, setStatus] = useState('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState(null);
    const [needsAccount, setNeedsAccount] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [isFinalizing, setIsFinalizing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const fetchAccounts = async () => {
        try {
            const user = await base44.auth.me();
            const all = await base44.entities.Account.list();
            const mine = all.filter(acc =>
                acc.user_id === user?.id || acc.created_by_id === user?.id
            );
            setAccounts(mine);
        } catch (e) {}
    };

    const startRecording = async () => {
        setStatus('recording');
        setResult(null);
        setErrorMsg('');
        setNeedsAccount(false);
        setSelectedAccountId('');
        chunksRef.current = [];

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
            const fileName = 'recording.' + (ext || 'webm');
            const fileType = blob.type || 'audio/webm';
            const file = new File([blob], fileName, { type: fileType });
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            const response = await base44.functions.invoke('voiceTransaction', { audio_url: file_url });
            const data = response.data;

            if (data.error) {
                setErrorMsg(data.error + (data.transcript ? `\n"${data.transcript}"` : ''));
                setStatus('error');
                return;
            }

            // Account matched — transaction created immediately
            if (data.success) {
                setResult(data);
                setStatus('success');
                if (onTransactionCreated) onTransactionCreated(data.transaction);
                setTimeout(() => setStatus('idle'), 4000);
                return;
            }

            // Account not detected — show picker
            if (data.needs_account) {
                setResult(data);
                setNeedsAccount(true);
                setStatus('idle'); // stop "processing" spinner, show picker
                await fetchAccounts();
                return;
            }
        } catch (err) {
            setErrorMsg(err.message || 'Ошибка обработки');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const finalizeWithAccount = async () => {
        if (!selectedAccountId || !result?.parsed) return;
        setIsFinalizing(true);
        try {
            const response = await base44.functions.invoke('voiceTransaction', {
                parsed: result.parsed,
                account_id: selectedAccountId
            });
            const data = response.data;

            if (data.error) {
                setErrorMsg(data.error);
                setStatus('error');
                return;
            }

            setResult(data);
            setNeedsAccount(false);
            setStatus('success');
            if (onTransactionCreated) onTransactionCreated(data.transaction);
            setTimeout(() => setStatus('idle'), 4000);
        } catch (err) {
            setErrorMsg(err.message || 'Ошибка сохранения');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleClick = () => {
        if (status === 'idle' || status === 'success' || status === 'error') startRecording();
        else if (status === 'recording') stopRecording();
    };

    const formatBalance = (amount) => {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Кнопка записи */}
            {!needsAccount && (
                <motion.button
                    onClick={handleClick}
                    disabled={status === 'processing' || isFinalizing}
                    whileTap={{ scale: 0.92 }}
                    className={`
                        relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
                        ${status === 'recording' ? 'bg-red-500 shadow-red-500/40' : ''}
                        ${status === 'processing' ? 'bg-white/10 cursor-not-allowed' : ''}
                        ${status === 'success' ? 'bg-green-500' : ''}
                        ${status === 'error' ? 'bg-red-400' : ''}
                        ${status === 'idle' ? 'bg-violet-500/15 border border-violet-500/20 hover:bg-violet-500/25' : ''}
                    `}
                >
                    {status === 'recording' && (
                        <motion.div
                            className="absolute inset-0 rounded-lg bg-red-500 opacity-30"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                        />
                    )}
                    {status === 'idle' && <Mic className="w-4 h-4 text-violet-400" />}
                    {status === 'recording' && <MicOff className="w-4 h-4 text-white" />}
                    {status === 'processing' && <Loader2 className="w-4 h-4 text-white animate-spin" />}
                    {status === 'success' && <CheckCircle className="w-4 h-4 text-white" />}
                    {status === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
                </motion.button>
            )}

            {/* Выбор счёта */}
            <AnimatePresence>
                {needsAccount && result?.parsed && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 w-64"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-4 h-4 text-white/50" />
                            <span className="text-sm text-white/70">
                                {result.parsed.type === 'expense' ? 'С какого счёта списать?' : 'На какой счёт зачислить?'}
                            </span>
                        </div>

                        {/* Распознанные данные */}
                        <div className="flex items-center gap-3 mb-3 bg-white/3 rounded-xl px-3 py-2">
                            <span className="text-xl">
                                {CATEGORY_EMOJIS[result.parsed.category] || '📦'}
                            </span>
                            <div>
                                <div className={`text-sm font-bold ${result.parsed.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                                    {result.parsed.type === 'expense' ? '-' : '+'}{result.parsed.amount?.toLocaleString()} ₽
                                </div>
                                <div className="text-xs text-white/40">{result.parsed.description}</div>
                            </div>
                        </div>

                        {/* Список счетов */}
                        {accounts.length === 0 ? (
                            <p className="text-xs text-white/30 text-center py-2">Нет доступных счетов</p>
                        ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                                {accounts.map(acc => (
                                    <button
                                        key={acc.id}
                                        onClick={() => setSelectedAccountId(acc.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                                            selectedAccountId === acc.id
                                                ? 'bg-violet-500/20 border border-violet-500/30 text-white'
                                                : 'bg-white/3 hover:bg-white/8 text-white/70 border border-transparent'
                                        }`}
                                    >
                                        <span>{acc.name}</span>
                                        <span className="text-xs text-white/40">{formatBalance(acc.balance)}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Кнопка подтверждения */}
                        <button
                            onClick={finalizeWithAccount}
                            disabled={!selectedAccountId || isFinalizing}
                            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-semibold transition-all"
                        >
                            {isFinalizing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Сохранение...
                                </span>
                            ) : (
                                'Сохранить'
                            )}
                        </button>

                        {/* Отмена */}
                        <button
                            onClick={() => { setNeedsAccount(false); setResult(null); }}
                            className="w-full mt-2 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
                        >
                            Отмена
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Подсказка */}
            {!needsAccount && (
                <p className="text-xs text-white/40">
                    {status === 'idle' && 'Нажмите и говорите'}
                    {status === 'recording' && 'Запись... нажмите чтобы остановить'}
                    {status === 'processing' && 'Обрабатываю...'}
                    {status === 'success' && 'Транзакция добавлена!'}
                    {status === 'error' && 'Ошибка'}
                </p>
            )}

            {/* Результат */}
            <AnimatePresence>
                {status === 'success' && result?.parsed && !needsAccount && (
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