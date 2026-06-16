'use client';

import React, { useEffect, useState } from 'react';
import { VideoAd } from './VideoAd';
import { ImageAd } from './ImageAd';
import { AdSkeleton } from './AdSkeleton';
import { useAdRequest } from './useAdRequest';

interface AdHostProps {
  slotId: string;
  surface: 'frontend' | 'extension';
  apiBase: string;
  onCredit: (jwt: string, txHash?: string) => void;
}

export function useSessionId() {
  const [session, setSession] = useState('');

  useEffect(() => {
    let s = localStorage.getItem('molfi_session_id');
    if (!s) {
      s = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('molfi_session_id', s);
    }
    setSession(s);
  }, []);

  return session;
}

export function AdHost({ slotId, surface, apiBase, onCredit }: AdHostProps) {
  const session = useSessionId();
  const { requestSlot, loading, error: requestError } = useAdRequest(apiBase);
  const [slot, setSlot] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    requestSlot(slotId, session, surface)
      .then((d) => {
        if (!cancelled) {
          if (d) {
            setSlot(d);
          } else {
            setSlot('none'); // no campaigns active
          }
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [slotId, surface, session]);

  const combinedError = requestError || error;

  if (combinedError) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
        Ad load failed: {combinedError}
      </div>
    );
  }

  if (loading || !slot) {
    return <AdSkeleton />;
  }

  if (slot === 'none') {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center text-zinc-400">
        <svg className="mx-auto h-8 w-8 text-zinc-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm">No ads available right now.</p>
        <p className="text-xs text-zinc-500 mt-1">Please try again later to earn chat credits.</p>
      </div>
    );
  }

  const commonProps = {
    impressionToken: slot.impressionToken,
    ctaUrl: slot.ctaUrl,
    apiBase,
    onComplete: onCredit,
    onError: (e: Error) => setError(e.message),
  };

  return slot.type === 'video' ? (
    <VideoAd {...commonProps} mp4Url={slot.mp4Url} durationMs={slot.durationMs} />
  ) : (
    <ImageAd {...commonProps} imageUrl={slot.imageUrl} dwellMs={slot.durationMs} />
  );
}
