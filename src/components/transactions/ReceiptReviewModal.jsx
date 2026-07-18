import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function ReceiptReviewModal({ 
  items, 
  categories, 
  onConfirm, 
  onClose,
  isLoading = false,
  mode = 'receipt',
  accounts = [],
  accountId = '',
  onAccountChange = () => {}
}) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [itemsWithCategories, setItemsWithCategories] = useState(items);
  const [clarificationQuestion, setClarificationQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isBank = mode === 'bank';

  const handleCategoryChange = (index, newCategory) => {
    const updated = [...itemsWithCategories];
    updated[index].category = newCategory;
    setItemsWithCategories(updated);
  };

  const askAIClarification = async () => {
    if (!clarificationQuestion.trim()) return;
    
    setIsAsking(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Пользователь загрузил чек с несколькими товарами и просит помощь в их категоризации.

Текущие товары:
${itemsWithCategories.map((item, i) => `${i + 1}. ${item.name || 'Товар'} - ${item.price}₽ (текущая категория: ${item.category || 'не определена'})`).join('\n')}

Доступные категории: ${categories.map(c => c.name).join(', ')}

Вопрос пользователя: ${clarificationQuestion}

Ответ на вопрос и рекомендации по категоризации.`,
        add_context_from_internet: false
      });

      toast.success('Ответ AI получен');
      // Можно добавить UI для отображения ответа
      alert(response);
      setClarificationQuestion('');
    } catch (error) {
      console.error('AI clarification error:', error);
      toast.error('Ошибка при получении ответа AI');
    } finally {
      setIsAsking(false);
    }
  };

  const handleConfirm = async () => {
    if (isSaving) return;
    if (isBank && !accountId) {
      toast.error('Выберите счёт');
      return;
    }
    // Проверяем что все товары имеют категории
    const incomplete = itemsWithCategories.find(item => !item.category);
    if (incomplete) {
      toast.error('Пожалуйста, выберите категорию для всех товаров');
      return;
    }
    setIsSaving(true);
    try {
      await onConfirm(itemsWithCategories);
    } finally {
      setIsSaving(false);
    }
  };

  const expenseCats = categories.filter(c => c.type === 'expense');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isBank ? 'Операции из выписки' : 'Распознанные товары'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Account selector — для операций из банковской выписки */}
            {isBank && accounts.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Счёт списания/зачисления
                </label>
                <Select value={accountId} onValueChange={onAccountChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Выберите счёт" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-2 mb-6">
              {itemsWithCategories.map((item, index) => (
                <div 
                  key={index}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
                    className="w-full p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="text-left flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{item.name || 'Товар'}</p>
                      <p className="text-sm text-slate-500">
                        {isBank && item.type === 'income' ? '+' : isBank ? '-' : ''}{item.price}₽
                        {isBank && item.date && ` · ${item.date}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isBank && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          {item.type === 'income' ? 'Доход' : 'Расход'}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.category 
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' 
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {item.category || 'Не выбрана'}
                      </span>
                      {expandedIndex === index ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {expandedIndex === index && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                        Выберите категорию
                      </label>
                      <Select 
                        value={item.category || ''} 
                        onValueChange={(val) => handleCategoryChange(index, val)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {(isBank ? categories.filter(c => c.type === (item.type === 'income' ? 'income' : 'expense')) : expenseCats).map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Clarification */}
            <div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Есть вопросы? Спросите AI
              </p>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Например: какая категория подходит для хлеба?"
                  value={clarificationQuestion}
                  onChange={(e) => setClarificationQuestion(e.target.value)}
                  className="resize-none h-16 text-sm"
                />
              </div>
              <Button
                onClick={askAIClarification}
                disabled={isAsking || !clarificationQuestion.trim()}
                size="sm"
                variant="outline"
                className="mt-2 w-full"
              >
                {isAsking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Получение ответа...
                  </>
                ) : (
                  'Спросить AI'
                )}
              </Button>
            </div>

            {/* Summary */}
            <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              {isBank ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Итого:</span> {itemsWithCategories.reduce((sum, item) => sum + (item.type === 'income' ? (item.price || 0) : -(item.price || 0)), 0)}₽
                </p>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Сумма:</span> {itemsWithCategories.reduce((sum, item) => sum + (item.price || 0), 0)}₽
                </p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium">{isBank ? 'Операций:' : 'Товаров:'}</span> {itemsWithCategories.length}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 h-11"
                disabled={isSaving}
              >
                Отмена
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSaving}
                className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Добавить операции'
                )}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}