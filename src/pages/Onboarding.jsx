import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Wallet, CreditCard, Banknote, PiggyBank, ChevronRight, ChevronLeft, Plus, Trash2, ArrowRight } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Наличные', icon: '💵', color: '#22c55e' },
  { value: 'card', label: 'Карта', icon: '💳', color: '#3b82f6' },
  { value: 'bank_account', label: 'Счёт в банке', icon: '🏦', color: '#8b5cf6' },
  { value: 'savings', label: 'Копилка', icon: '🐷', color: '#f59e0b' },
  { value: 'credit', label: 'Кредитная', icon: '💰', color: '#ef4444' },
];

const CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'BYN', 'UAH'];

const STEPS = [
  { id: 'welcome', title: 'Добро пожаловать!' },
  { id: 'accounts', title: 'Ваши счета и кошельки' },
  { id: 'currency', title: 'Основная валюта' },
  { id: 'done', title: 'Всё готово!' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState('RUB');
  const [accounts, setAccounts] = useState([
    { name: 'Наличные', type: 'cash', balance: '', color: '#22c55e' },
  ]);
  const [loading, setLoading] = useState(false);

  const addAccount = () => {
    setAccounts([...accounts, { name: '', type: 'card', balance: '', color: '#3b82f6' }]);
  };

  const removeAccount = (index) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const updateAccount = (index, field, value) => {
    const updated = [...accounts];
    if (field === 'type') {
      const found = ACCOUNT_TYPES.find(t => t.value === value);
      updated[index] = { ...updated[index], type: value, color: found?.color || '#3b82f6' };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setAccounts(updated);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      // Создаём счета
      const validAccounts = accounts.filter(a => a.name.trim());
      for (const acc of validAccounts) {
        await base44.entities.Account.create({
          name: acc.name,
          type: acc.type,
          balance: parseFloat(acc.balance) || 0,
          currency: currency,
          color: acc.color,
          is_active: true,
          user_id: user.id,
        });
      }

      // Помечаем онбординг завершённым
      await base44.auth.updateMe({ onboarding_complete: true });

      navigate('/');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await base44.auth.updateMe({ onboarding_complete: true });
    navigate('/');
  };

  const canProceed = () => {
    if (step === 1) return accounts.some(a => a.name.trim());
    return true;
  };

  return (
    <div
      className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Progress */}
      <div
        className="fixed left-0 right-0 flex justify-center gap-2 z-10"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-white w-8' : 'bg-white/20 w-4'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg"
        >
          {/* STEP 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto text-4xl shadow-2xl">
                💼
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-3">Добро пожаловать!</h1>
                <p className="text-white/60 text-lg leading-relaxed">
                  Давайте настроим ваше финансовое пространство.<br />
                  Это займёт всего пару минут.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: '🏦', text: 'Счета и кошельки' },
                  { icon: '💱', text: 'Валюта' },
                  { icon: '🚀', text: 'Готово к работе' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <p className="text-white/60 text-xs">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: Accounts */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Добавьте счета</h2>
                <p className="text-white/50 text-sm">Добавьте кошельки и счета, которыми пользуетесь</p>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {accounts.map((acc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {ACCOUNT_TYPES.find(t => t.value === acc.type)?.icon || '💳'}
                      </span>
                      <Input
                        value={acc.name}
                        onChange={e => updateAccount(i, 'name', e.target.value)}
                        placeholder="Название счёта"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                      />
                      {accounts.length > 1 && (
                        <button onClick={() => removeAccount(i)} className="text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={acc.type}
                        onChange={e => updateAccount(i, 'type', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                      >
                        {ACCOUNT_TYPES.map(t => (
                          <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        value={acc.balance}
                        onChange={e => updateAccount(i, 'balance', e.target.value)}
                        placeholder="Начальный баланс"
                        className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addAccount}
                className="w-full border border-dashed border-white/20 rounded-xl p-3 text-white/40 hover:text-white/70 hover:border-white/40 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить ещё счёт
              </button>
            </div>
          )}

          {/* STEP 2: Currency */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Основная валюта</h2>
                <p className="text-white/50 text-sm">Выберите валюту для отображения сумм</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      currency === c
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-lg font-bold">{c}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-3">Всё настроено!</h2>
                <p className="text-white/60 text-lg">
                  Ваши счета добавлены и приложение готово к использованию.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="text-white/30 hover:text-white/50 transition-colors text-sm"
              >
                Пропустить
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="bg-white text-black hover:bg-white/90 font-semibold px-6"
              >
                Далее
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8"
              >
                {loading ? 'Сохраняем...' : 'Начать работу'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}