import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { offlineQueue } from '@/lib/offlineQueue';
import { useQueryClient } from '@tanstack/react-query';
import { getRepository } from '@/data/repositories';
import { eventBus, EVENTS } from '@/lib/eventBus';

export default function OfflineBanner() {
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(offlineQueue.count());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = async () => {
      setSyncing(true);
      setIsOffline(false);

      const queue = offlineQueue.peekAll();
      if (queue.length > 0) {
        const repo = getRepository('Transaction');
        await offlineQueue.processQueue(async (entry) => {
          const { id, created_at, ...txData } = entry;
          const created = await repo.create(txData);
          queryClient.setQueriesData({ queryKey: ['transactions'] }, (old = []) => {
            const withoutTemp = old.filter((t) => t.id !== entry.id);
            return [created, ...withoutTemp];
          });
          setPendingCount(offlineQueue.count());
          return true;
        });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      }
      setPendingCount(0);
      setSyncing(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient]);

  // Обновляем счётчик при создании новой офлайн-транзакции
  useEffect(() => {
    const off = eventBus.on(EVENTS.TRANSACTION_CHANGED, (payload) => {
      if (payload?.offline) {
        setPendingCount(offlineQueue.count());
      }
    });
    return off;
  }, []);

  return (
    <AnimatePresence>
      {(isOffline || syncing) && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-[9999] ${syncing ? 'bg-emerald-600' : 'bg-amber-500'} text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium shadow-lg`}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
        >
          {syncing ? (
            <>
              <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
              Синхронизация данных...
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              Нет подключения к интернету.
              {pendingCount > 0 && ` Сохранено локально: ${pendingCount}. Будет отправлено при восстановлении связи.`}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}