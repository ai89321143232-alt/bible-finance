// ============================================================
// components/workspace/WorkspaceSwitcher.jsx — ПЕРЕКЛЮЧАТЕЛЬ ПРОСТРАНСТВ (Этап 2)
// ============================================================
// Компактный dropdown для выбора активного Workspace (Личное / Семейное).
// Использует useWorkspaces() из WorkspaceContext.
// Если у пользователя только одно пространство — ничего не рендерит.
// ============================================================

import { useState } from 'react';
import { Users, User, ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorkspaces } from '@/components/workspace/WorkspaceContext';

export default function WorkspaceSwitcher({ compact = false }) {
  const { workspaces, activeWorkspace, loading, switchWorkspace } = useWorkspaces();
  const [open, setOpen] = useState(false);

  if (loading || workspaces.length < 2 || !activeWorkspace) return null;

  const Icon = activeWorkspace.type === 'family' ? Users : User;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 transition-colors ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2 w-full'}`}
      >
        <Icon className="w-4 h-4 text-white/60 shrink-0" />
        {!compact && <span className="text-sm text-white/80 font-medium truncate flex-1 text-left">{activeWorkspace.name}</span>}
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 mt-1.5 w-56 rounded-lg border border-white/10 bg-[#141820] shadow-xl z-50 overflow-hidden"
            >
              {workspaces.map((w) => {
                const WIcon = w.type === 'family' ? Users : User;
                const isActive = w.id === activeWorkspace.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => { switchWorkspace(w.id); setOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <WIcon className="w-4 h-4 text-white/50 shrink-0" />
                    <span className="text-sm text-white/80 flex-1 truncate">{w.name}</span>
                    {isActive && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}