'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { VideoAd } from './ads/VideoAd';
import { AdCompleteToast } from './ads/AdCompleteToast';

export function AdViewer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { jwt, setJwt, setCredits } = useChatStore();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  if (!isOpen) return null;

  const handleComplete = (claimJson: any) => {
    if (claimJson.jwt) {
      setJwt(claimJson.jwt);
    }
    if (claimJson.credits) {
      setCredits(claimJson.credits);
    }
    setToastMsg('Verified attention ad watched');
    setShowToast(true);
    onClose();
  };

  return (
    <>
      <VideoAd
        jwt={jwt}
        setJwt={setJwt}
        onClose={onClose}
        onClaimed={handleComplete}
      />

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
