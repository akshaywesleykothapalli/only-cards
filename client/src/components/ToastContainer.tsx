'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useGameStore, Toast } from '../store/useGameStore';

const VARIANT_STYLES: Record<Toast['variant'], string> = {
  error: 'bg-red-950/90 border-red-500/50 text-red-300',
  success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300',
  info: 'bg-slate-900/90 border-white/20 text-gray-200'
};

const VARIANT_ICONS: Record<Toast['variant'], React.ReactNode> = {
  error: <AlertTriangle className="w-4 h-4 flex-shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
  info: <Info className="w-4 h-4 flex-shrink-0" />
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useGameStore();

  return (
    <div
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={() => dismissToast(toast.id)}
            className={`pointer-events-auto flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full tracking-wide border backdrop-blur-sm shadow-lg cursor-pointer max-w-[90vw] ${VARIANT_STYLES[toast.variant]}`}
          >
            {VARIANT_ICONS[toast.variant]}
            <span className="truncate">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
