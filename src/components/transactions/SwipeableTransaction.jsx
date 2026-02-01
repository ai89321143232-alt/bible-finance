import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS = {
  'Еда': '🍔',
  'Транспорт': '🚗',
  'Жильё': '🏠',
  'Развлечения': '🎮',
  'Здоровье': '💊',
  'Одежда': '👕',
  'Подписки': '📱',
  'Образование': '📚',
  'Зарплата': '💰',
  'Фриланс': '💻',
  'Инвестиции': '📈',
  'Подарки': '🎁',
  'Другое': '📦'
};

export default function SwipeableTransaction({ 
  transaction, 
  index, 
  onDelete, 
  onEdit, 
  formatCurrency,
  showActions = false 
}) {
  const [x, setX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(0);
  const elementRef = useRef(null);

  const handleMouseDown = (e) => {
    dragStart.current = e.clientX;
    setIsDragging(true);
  };

  const handleTouchStart = (e) => {
    dragStart.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const diff = currentX - dragStart.current;
    
    if (diff < 0) {
      setX(Math.max(diff, -100));
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStart.current;
    
    if (diff < 0) {
      setX(Math.max(diff, -100));
    }
  };

  const handleDragEnd = () => {
    if (x < -50) {
      setX(-100);
    } else {
      setX(0);
    }
  };

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className="relative overflow-hidden rounded-xl"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        drag="x"
        dragElastic={0.2}
        dragConstraints={{ left: -100, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={{ x }}
        className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 group bg-white dark:bg-slate-800 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-sm ${
            transaction.type === 'income' 
              ? 'bg-emerald-100 dark:bg-emerald-900/30' 
              : 'bg-rose-100 dark:bg-rose-900/30'
          }`}>
            {CATEGORY_ICONS[transaction.category] || '📦'}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {transaction.category || 'Без категории'}
            </p>
            {transaction.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {transaction.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className={`font-semibold text-lg whitespace-nowrap ${
            transaction.type === 'income' 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </p>
          <div className={`flex gap-1 ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(transaction);
              }}
              className="h-8 w-8 text-slate-400 hover:text-violet-600"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transaction.id);
              }}
              className="h-8 w-8 text-slate-400 hover:text-rose-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Delete button on swipe */}
      <div className="absolute right-0 top-0 h-full bg-rose-600 dark:bg-rose-700 flex items-center px-4 pointer-events-none">
        <Trash2 className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}