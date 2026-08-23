'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Loader2 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

// connectionStatus starts as 'connecting' on first load and only becomes
// 'reconnecting'/'offline' after a real disconnect event, which requires
// having connected once already - so this never flashes on initial load.
export default function ReconnectOverlay() {
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const shouldShow = connectionStatus === 'reconnecting' || connectionStatus === 'offline';

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="glass-panel max-w-sm w-full rounded-3xl p-8 text-center border border-white/15 shadow-2xl">
            {connectionStatus === 'offline' ? (
              <WifiOff className="w-10 h-10 mx-auto text-red-400 mb-4" />
            ) : (
              <Loader2 className="w-10 h-10 mx-auto text-amber-400 mb-4 animate-spin" />
            )}
            <h2 className="text-xl font-black text-white">
              {connectionStatus === 'offline' ? 'Connection lost' : 'Reconnecting…'}
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              {connectionStatus === 'offline'
                ? 'Unable to reach the game server. Retrying automatically.'
                : 'Restoring your session and game state.'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
