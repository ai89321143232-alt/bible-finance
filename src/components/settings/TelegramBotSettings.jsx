import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Bot, Check, Unlink } from 'lucide-react';

const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
];

// ============================================================
// TelegramBotSettings — модалка подключения личного Telegram-бота
// (Premium-функция). Пользователь вводит токен от @BotFather и свой
// Telegram ID, выбирает счёт по умолчанию — бэкенд проверяет токен
// и настраивает webhook (base44/functions/telegramBotConnect).
// ============================================================
export default function TelegramBotSettings({ open, onOpenChange }) {
  const [config, setConfig] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [botToken, setBotToken] = useState('');
  const [telegramUserId, setTelegramUserId] = useState('');
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [configs, accs] = await Promise.all([
        base44.entities.TelegramBotConfig.list(),
        base44.entities.Account.list(),
      ]);
      const existing = configs[0] || null;
      setConfig(existing);
      setAccounts(accs);
      setBotToken(existing?.bot_token || '');
      setTelegramUserId(existing?.telegram_user_id || '');
      setDefaultAccountId(existing?.default_account_id || accs[0]?.id || '');
      setTimezone(existing?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!botToken.trim() || !telegramUserId.trim()) {
      setError('Укажите токен бота и ваш Telegram ID');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('telegramBotConnect', {
        action: 'connect',
        bot_token: botToken.trim(),
        telegram_user_id: telegramUserId.trim(),
        default_account_id: defaultAccountId || undefined,
        timezone,
        app_url: appParams.appBaseUrl || window.location.origin,
      });
      if (res.data?.error) {
        setError(res.data.error);
        return;
      }
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.error || 'Не удалось подключить бота');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSaving(true);
    setError('');
    try {
      await base44.functions.invoke('telegramBotConnect', { action: 'disconnect' });
      setBotToken('');
      setTelegramUserId('');
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-600" />
            Telegram-бот
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {config?.is_active ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <Check className="w-4 h-4" />
                Бот @{config.bot_username} подключён
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Создайте бота через{' '}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 underline"
                >
                  @BotFather
                </a>{' '}
                в Telegram, скопируйте токен и вставьте его ниже. Свой Telegram ID можно узнать у{' '}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 underline"
                >
                  @userinfobot
                </a>
                .
              </p>
            )}

            <div>
              <Label>Токен бота</Label>
              <Input
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label>Ваш Telegram ID</Label>
              <Input
                value={telegramUserId}
                onChange={(e) => setTelegramUserId(e.target.value)}
                placeholder="Например, 123456789"
                className="rounded-xl mt-1"
              />
            </div>

            {accounts.length > 0 && (
              <div>
                <Label>Счёт для записи операций</Label>
                <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue placeholder="Выберите счёт" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Ваш часовой пояс</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Выберите часовой пояс" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">Операции из Telegram будут записываться с датой по этому часовому поясу</p>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {config?.is_active ? 'Обновить' : 'Подключить'}
              </Button>
              {config?.is_active && (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                  className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}