import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Ticket } from 'lucide-react';
import { toast } from 'sonner';

export default function RedeemPromoCode({ onSuccess }) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('redeemPromoCode', { code });
      const data = response.data;
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Промокод активирован!');
        setCode('');
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Не удалось активировать промокод');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
        <Ticket className="w-4 h-4 text-violet-600" />
        Есть промокод от администратора?
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
          placeholder="Введите промокод"
          className="rounded-xl font-mono"
          disabled={isLoading}
        />
        <Button onClick={handleRedeem} disabled={!code.trim() || isLoading} className="rounded-xl flex-shrink-0">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Активировать'}
        </Button>
      </div>
    </div>
  );
}