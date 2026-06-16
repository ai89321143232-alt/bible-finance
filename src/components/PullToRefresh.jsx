import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

// ============================================================
// components/PullToRefresh.jsx — NATIVE-STYLE PULL-TO-REFRESH
// ============================================================
// iOS-like pull-to-refresh triggered by touch drag-down at scroll top.
// Uses framer-motion for the indicator animation.
// Props:
//   onRefresh → async function called when pull threshold is reached
//   children  → page content wrapped in scroll container
//   offsetTop → px offset from top (for mobile top bar, default: 64)
// ============================================================
export default function PullToRefresh({ children, onRefresh, offsetTop = 64 }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY <= 2 && !refreshing) {
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!tracking.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const distance = Math.min(diff * 0.35, 90);
      setPullDistance(distance);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!tracking.current) return;
    tracking.current = false;
    if (pullDistance > 50 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (_) {}
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen overscroll-behavior-y-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(refreshing || pullDistance > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: refreshing ? 52 : pullDistance, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center overflow-hidden bg-transparent"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 3.6 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0.1 }}
            >
              <RefreshCw
                className="w-5 h-5 text-white/40"
                style={{ opacity: refreshing ? 1 : Math.min(pullDistance / 50, 0.8) }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}