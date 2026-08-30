import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileUp, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrencySymbol } from '@/lib/formatCurrency';

const IMPORT_FORMATS = [
  { value: 'auto', label: 'Автоопределение' },
  { value: 'coinkeeper', label: 'CoinKeeper (CSV)' },
  { value: 'zenmoney', label: 'Дзен-мани (CSV)' },
  { value: 'monefy', label: 'Monefy (CSV)' },
  { value: 'spendee', label: 'Spendee (CSV)' },
  { value: 'toshl', label: 'Toshl (CSV)' },
  { value: 'generic', label: 'Универсальный CSV' },
];

const CATEGORY_MAP = {
  'еда': 'Еда', 'продукты': 'Еда', 'супермаркет': 'Еда', 'кафе': 'Еда', 'ресторан': 'Еда',
  'fast food': 'Еда', 'coffee': 'Еда', 'кофе': 'Еда', 'groceries': 'Еда', 'food': 'Еда',
  'транспорт': 'Транспорт', 'бензин': 'Транспорт', 'такси': 'Транспорт', 'метро': 'Транспорт',
  'автобус': 'Транспорт', 'парковка': 'Транспорт', 'transport': 'Транспорт', 'fuel': 'Транспорт',
  'taxi': 'Транспорт', 'gas': 'Транспорт',
  'жильё': 'Жильё', 'аренда': 'Жильё', 'квартира': 'Жильё', 'коммуналка': 'Жильё',
  'коммунальные': 'Жильё', 'электричество': 'Жильё', 'интернет': 'Жильё', 'rent': 'Жильё',
  'utilities': 'Жильё', 'mortgage': 'Жильё', 'ипотека': 'Жильё',
  'развлечения': 'Развлечения', 'кино': 'Развлечения', 'фильм': 'Развлечения', 'игры': 'Развлечения',
  'подписки': 'Подписки', 'spotify': 'Подписки', 'netflix': 'Подписки', 'youtube': 'Подписки',
  'entertainment': 'Развлечения', 'fun': 'Развлечения',
  'здоровье': 'Здоровье', 'аптека': 'Здоровье', 'врач': 'Здоровье', 'медицина': 'Здоровье',
  'health': 'Здоровье', 'medical': 'Здоровье', 'pharmacy': 'Здоровье',
  'одежда': 'Одежда', 'обувь': 'Одежда', 'магазин одежды': 'Одежда',
  'clothes': 'Одежда', 'shopping': 'Одежда',
  'образование': 'Образование', 'курсы': 'Образование', 'учёба': 'Образование',
  'education': 'Образование', 'school': 'Образование',
  'зарплата': 'Зарплата', 'salary': 'Зарплата', 'income': 'Зарплата',
  'фриланс': 'Фриланс', 'freelance': 'Фриланс',
  'инвестиции': 'Инвестиции', 'дивиденды': 'Инвестиции', 'dividends': 'Инвестиции',
  'подарок': 'Подарки', 'gift': 'Подарки',
};

function mapCategory(rawCategory, type) {
  if (!rawCategory) return type === 'income' ? 'Зарплата' : 'Другое';
  const lower = rawCategory.toLowerCase().trim();
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return value;
  }
  return rawCategory || (type === 'income' ? 'Зарплата' : 'Другое');
}

function detectType(value, typeField) {
  if (typeField) {
    const t = typeField.toLowerCase();
    if (t.includes('income') || t.includes('доход') || t.includes('пополнение')) return 'income';
    if (t.includes('expense') || t.includes('расход') || t.includes('снятие')) return 'expense';
    if (t.includes('transfer') || t.includes('перевод')) return 'transfer';
  }
  if (typeof value === 'number') return value < 0 ? 'expense' : 'income';
  const numValue = parseFloat(String(value).replace(',', '.').replace(/[^\d.-]/g, ''));
  if (isNaN(numValue)) return 'expense';
  return numValue < 0 ? 'expense' : 'income';
}

function parseAmount(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map(s => s.trim());
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function detectColumns(headers) {
  const findCol = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  return {
    date: findCol('date', 'дата', 'time', 'время', 'день'),
    amount: findCol('amount', 'сумма', 'sum', 'price', 'цена', 'value', 'значение'),
    category: findCol('category', 'категория', 'cat'),
    description: findCol('description', 'описание', 'note', 'notes', 'комментарий', 'comment', 'memo', 'название'),
    type: findCol('type', 'тип', 'direction', 'направление'),
    account: findCol('account', 'счёт', 'счет', 'wallet', 'кошелек'),
  };
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const cleaned = dateStr.trim();
  let match = cleaned.match(/^(\d{1,2})[.](\d{1,2})[.](\d{2,4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    return new Date(year, month - 1, day).toISOString();
  }
  match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])).toISOString();
  }
  match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    return new Date(year, month - 1, day).toISOString();
  }
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

const STEPS = {
  UPLOAD: 'upload',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  DONE: 'done',
};

export default function TransactionImport({ open, onClose, onImported }) {
  const currencySymbol = useCurrencySymbol();
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [format, setFormat] = useState('auto');
  const [parsedData, setParsedData] = useState([]);
  const [error, setError] = useState('');
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file) => {
    setError('');
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt', 'tsv'].includes(ext)) {
      setError('Поддерживаются файлы CSV. Экспортируйте данные из приложения в формате CSV.');
      return;
    }

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      if (rows.length === 0) {
        setError('Файл пуст или не содержит данных.');
        return;
      }

      const cols = detectColumns(headers);
      if (cols.amount < 0) {
        setError('Не удалось найти колонку с суммой. Проверьте формат файла.');
        return;
      }

      const transactions = rows.map(row => {
        const amount = parseAmount(row[cols.amount]);
        const type = detectType(row[cols.amount], cols.type >= 0 ? row[cols.type] : null);
        const category = mapCategory(cols.category >= 0 ? row[cols.category] : '', type);
        const description = cols.description >= 0 ? row[cols.description] : '';
        const date = cols.date >= 0 ? parseDate(row[cols.date]) : new Date().toISOString();

        return {
          type,
          amount,
          category,
          description,
          date,
          currency: 'RUB',
          source: 'app',
        };
      }).filter(t => t.amount > 0);

      if (transactions.length === 0) {
        setError('Не удалось распознать ни одной транзакции в файле.');
        return;
      }

      setParsedData(transactions);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError('Ошибка при чтении файла: ' + err.message);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    setStep(STEPS.IMPORTING);
    setImportProgress({ done: 0, total: parsedData.length, errors: 0 });

    let errors = 0;
    const batchSize = 50;

    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize);
      try {
        await base44.entities.Transaction.bulkCreate(batch);
      } catch {
        errors += batch.length;
      }
      setImportProgress({ done: Math.min(i + batchSize, parsedData.length), total: parsedData.length, errors });
    }

    setStep(STEPS.DONE);
    if (onImported) onImported();
  };

  const handleClose = () => {
    setStep(STEPS.UPLOAD);
    setParsedData([]);
    setError('');
    setFormat('auto');
    setImportProgress({ done: 0, total: 0, errors: 0 });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Импорт транзакций
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === STEPS.UPLOAD && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="space-y-2">
                <Label>Формат приложения</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IMPORT_FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Экспортируйте данные из старого приложения в CSV, затем загрузите файл сюда.
                </p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => document.getElementById('import-file-input').click()}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Перетащите CSV-файл сюда
                </p>
                <p className="text-xs text-muted-foreground">
                  или нажмите для выбора файла
                </p>
                <input
                  id="import-file-input"
                  type="file"
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Поддерживаются:</p>
                <p>• CoinKeeper, Дзен-мани, Monefy, Spendee, Toshl</p>
                <p>• Любой CSV с колонками: дата, сумма, категория</p>
                <p>• Форматы дат: DD.MM.YYYY, YYYY-MM-DD</p>
              </div>
            </motion.div>
          )}

          {step === STEPS.PREVIEW && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-600">
                  Найдено <span className="font-bold">{parsedData.length}</span> транзакций для импорта
                </p>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                {parsedData.slice(0, 50).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                      t.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '−'}{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(t.amount)} {currencySymbol}
                    </span>
                    <span className="text-sm text-foreground flex-1 truncate">{t.category}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">{t.description || '—'}</span>
                  </div>
                ))}
                {parsedData.length > 50 && (
                  <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                    ...и ещё {parsedData.length - 50} транзакций
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(STEPS.UPLOAD)}>Назад</Button>
                <Button onClick={handleImport} className="gap-1">
                  Импортировать <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === STEPS.IMPORTING && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-8 text-center">
              <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Импортирую транзакции...</p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {importProgress.done} из {importProgress.total}
              </p>
            </motion.div>
          )}

          {step === STEPS.DONE && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-foreground">Импорт завершён!</h3>
              <p className="text-sm text-muted-foreground">
                Импортировано {importProgress.done - importProgress.errors} транзакций
                {importProgress.errors > 0 && `, ошибок: ${importProgress.errors}`}
              </p>
              <Button onClick={handleClose} className="w-full">Готово</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}