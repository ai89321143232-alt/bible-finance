import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Cloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BudgetSummaryExport() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('saveBudgetSummary');
      if (response.data?.success) {
        toast.success('Сводка по бюджетам сохранена в Google Drive');
      } else {
        toast.error(response.data?.error || 'Ошибка при сохранении');
      }
    } catch (error) {
      toast.error('Ошибка при экспорте');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Сохранение...
        </>
      ) : (
        <>
          <Cloud className="w-4 h-4" />
          Сохранить в Google Drive
        </>
      )}
    </Button>
  );
}