import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Разбирает строку QR-кода российского чека вида:
// t=20240115T1230&s=1234.56&fn=...&i=...&fp=...&n=1
function parseReceiptQR(text) {
  const str = typeof text === 'string' ? text : String(text ?? '');
  const query = str.includes('?') ? str.split('?')[1] : str;
  const params = new URLSearchParams(query);
  const amountStr = params.get('s');
  const tStr = params.get('t');
  if (!amountStr) return null;

  let date = null;
  if (tStr) {
    const match = tStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/);
    if (match) {
      const [, y, mo, d, h, mi, s] = match;
      date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s || '00'}`);
    }
  }

  return {
    amount: parseFloat(amountStr),
    date: date && !isNaN(date.getTime()) ? date : null,
  };
}

export default function QRReceiptScanner({ onDataExtracted, onClose }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const callbackRef = useRef(onDataExtracted);
  const [error, setError] = useState('');

  // Обновляем ref-колбэк без перезапуска камеры
  useEffect(() => {
    callbackRef.current = onDataExtracted;
  }, [onDataExtracted]);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const raw = result?.data || result;
        const parsed = parseReceiptQR(raw);
        if (parsed) {
          scanner.stop();
          callbackRef.current({
            amount: parsed.amount,
            date: parsed.date ? parsed.date.toISOString() : undefined,
            description: 'Чек по QR-коду',
          });
          toast.success('✅ QR-код чека распознан!');
        } else {
          setError('Это не похоже на QR-код чека. Наведите камеру на QR-код внизу чека.');
        }
      },
      { highlightScanRegion: true, highlightCodeOutline: true }
    );
    scannerRef.current = scanner;
    scanner.start().catch(() => setError('Не удалось получить доступ к камере'));

    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[80] flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-white font-semibold">Сканирование QR-кода чека</h3>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
      </div>
      {error && (
        <div className="p-4 bg-black">
          <p className="text-rose-400 text-sm text-center mb-3">{error}</p>
          <Button variant="outline" className="w-full" onClick={onClose}>Закрыть</Button>
        </div>
      )}
      <p className="text-white/60 text-xs text-center p-4">
        Наведите камеру на QR-код в нижней части чека
      </p>
    </div>
  );
}