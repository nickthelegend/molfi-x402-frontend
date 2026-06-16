'use client';

import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  creditsEarned: number;
  duration?: number;
  onClose: () => void;
}

export function AdCompleteToast({ message, creditsEarned, duration = 4000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for transition
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-purple-500 bg-zinc-950 p-4 shadow-2xl transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h4 className="text-sm font-bold text-text">Credit Earned!</h4>
        <p className="text-xs text-text-muted">
          +{creditsEarned} credit{creditsEarned > 1 ? 's' : ''} • {message}
        </p>
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-zinc-500 hover:text-zinc-300">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
