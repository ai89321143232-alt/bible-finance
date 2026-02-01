import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CategoryModal({ isOpen, category, onClose }) {
  if (!category) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${category.colorBg}`}>
                  <category.icon className={`w-6 h-6 ${category.colorText}`} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {category.label}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content Grid */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {category.items.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={createPageUrl(item.name)}>
                      <div
                        onClick={onClose}
                        className={`h-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-transparent transition-all cursor-pointer group hover:shadow-lg ${category.hoverBg}`}
                      >
                        <div className={`p-3 rounded-xl w-fit mb-3 ${category.colorBg} group-hover:scale-110 transition-transform`}>
                          <item.icon className={`w-6 h-6 ${category.colorText}`} />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-base transition-all">
                          {item.label}
                        </h3>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}