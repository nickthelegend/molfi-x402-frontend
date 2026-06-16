'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { AdHost } from './ads/AdHost';
import { AdCompleteToast } from './ads/AdCompleteToast';
import { useTxModal } from './tx/TxModalProvider';

export function AdViewer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { setJwt, setCredits } = useChatStore();
  const { show: showTxModal } = useTxModal();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

  if (!isOpen) return null;

  const handleComplete = (creditJwt: string, txHash?: string) => {
    setJwt(creditJwt);
    setCredits(5); // Add credits to display
    setToastMsg('Verified attention ad watched');
    setShowToast(true);
    onClose();
    
    if (txHash) {
      showTxModal({
        hash: txHash,
        status: 'pending',
        network: 'avalanche-fuji',
        label: `x402 attention settlement · impression payout`,
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-purple-500/20 bg-zinc-950 p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold tracking-wider text-purple-400 uppercase">Sponsor Ad</span>
              <h3 className="text-lg font-bold text-text">Verify Attention</h3>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <AdHost
            slotId="composer"
            surface="frontend"
            apiBase={backendUrl}
            onCredit={handleComplete}
          />
        </div>
      </div>

      {showToast && (
        <AdCompleteToast
          message={toastMsg}
          creditsEarned={5}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}
