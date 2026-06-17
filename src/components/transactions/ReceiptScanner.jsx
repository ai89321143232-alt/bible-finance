import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Camera, Upload, Loader2, Check, X, ScanLine } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function ReceiptScanner({ onDataExtracted }) {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleScan = async (file) => {
    if (!file) return;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setIsScanning(true);

    try {
      // Convert to data URL first (UploadFile requires string, not raw File)
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: dataUrl });
      
      // Extract data from receipt using AI
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            total_amount: { type: 'number', description: 'Total amount on receipt' },
            date: { type: 'string', description: 'Date of purchase in YYYY-MM-DD format' },
            merchant_name: { type: 'string', description: 'Name of the store/merchant' },
            category: { 
              type: 'string', 
              description: 'Category of expense (Еда, Транспорт, Жильё, Развлечения, Здоровье, Одежда, Подписки, Образование, Другое)',
              enum: ['Еда', 'Транспорт', 'Жильё', 'Развлечения', 'Здоровье', 'Одежда', 'Подписки', 'Образование', 'Другое']
            },
            items: {
              type: 'array',
              description: 'Individual line items',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                  price: { type: 'number' }
                }
              }
            }
          },
          required: ['total_amount']
        }
      });

      if (result.status === 'success' && result.output) {
        onDataExtracted({
          amount: result.output.total_amount,
          date: result.output.date,
          description: result.output.merchant_name || 'Покупка',
          category: result.output.category || 'Другое',
          attachment_url: file_url
        });
        toast.success('✅ Чек успешно распознан!');
      } else {
        toast.error('Не удалось распознать чек. Попробуйте другое фото.');
      }
    } catch (error) {
      console.error('Receipt scan error:', error);
      toast.error('Ошибка при сканировании. Попробуйте ещё раз.');
    } finally {
      setIsScanning(false);
      setPreview(null);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) handleScan(file);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        {preview ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4"
          >
            <img 
              src={preview} 
              alt="Receipt preview" 
              className="w-full max-h-64 object-contain rounded-xl border-2 border-violet-200"
            />
          </motion.div>
        ) : (
          <div className="py-8 mb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              {isScanning ? (
                <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
              ) : (
                <ScanLine className="w-10 h-10 text-violet-600" />
              )}
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              {isScanning ? 'Распознавание чека...' : 'Сканирование чека'}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Сфотографируйте или загрузите чек для автоматического распознавания суммы и категории
            </p>
          </div>
        )}
        
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-violet-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Анализируем чек с помощью AI...</span>
            </div>
          </motion.div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isScanning}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 h-12"
          >
            <Camera className="w-5 h-5 mr-2" />
            Сфотографировать чек
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={isScanning}
            className="h-12"
          >
            <Upload className="w-5 h-5 mr-2" />
            Загрузить из галереи
          </Button>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          💡 Поддерживаются форматы: JPG, PNG, PDF
        </p>
      </div>
    </div>
  );
}