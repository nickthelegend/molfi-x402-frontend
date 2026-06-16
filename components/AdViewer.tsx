'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';

interface Ad {
  id: string;
  mp4Url: string;
  durationMs: number;
  advertiser: string;
  credits: number;
}

export function AdViewer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { setJwt, setCredits } = useChatStore();
  const [activeAd, setActiveAd] = useState<Ad | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const adsList: Ad[] = [
    {
      id: 'avax-subnets',
      mp4Url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blockchain-nodes-43034-large.mp4',
      durationMs: 15000,
      advertiser: 'Avalanche Foundation',
      credits: 5,
    },
    {
      id: 'circle-devs',
      mp4Url: 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-with-a-green-screen-and-credit-card-42861-large.mp4',
      durationMs: 15000,
      advertiser: 'Circle',
      credits: 5,
    },
  ];

  useEffect(() => {
    if (isOpen) {
      const randomAd = adsList[Math.floor(Math.random() * adsList.length)];
      setActiveAd(randomAd);
      setTimeLeft(15);
      setCompleted(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeAd) return;

    // Fast-track test bypass check
    if (typeof window !== 'undefined' && (window as any).__molfi_test_skip_ad) {
      setTimeLeft(0);
      setCompleted(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, activeAd]);

  const handleClaim = async () => {
    if (!activeAd) return;
    setLoading(true);
    setError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

    try {
      const res = await fetch(`${backendUrl}/v1/ads/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: activeAd.id,
          watchedMs: activeAd.durationMs,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to claim credits');
      }

      const data = await res.json() as { jwt: string; credits: number };
      setJwt(data.jwt);
      setCredits(data.credits);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !activeAd) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-accent uppercase">Sponsor Ad</span>
            <h3 className="text-lg font-bold text-text">{activeAd.advertiser}</h3>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono text-text-muted">
              {completed ? 'Ready to Claim' : `Skip in ${timeLeft}s`}
            </span>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border border-border mb-4">
          <video
            ref={videoRef}
            src={activeAd.mp4Url}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          {!completed && (
            <div className="absolute bottom-0 left-0 h-1 bg-accent transition-all duration-1000" style={{ width: `${((15 - timeLeft) / 15) * 100}%` }} />
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-accent/10 border border-accent/20 p-3 text-sm text-accent">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            Watch completely to earn <span className="font-semibold text-text">{activeAd.credits} credits</span>.
          </p>
          {completed ? (
            <button
              onClick={handleClaim}
              disabled={loading}
              className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 transition-all disabled:opacity-50"
            >
              {loading ? 'Claiming...' : 'Claim 5 Credits'}
            </button>
          ) : (
            <button
              disabled
              className="rounded-lg bg-border px-4 py-2 text-sm font-semibold text-text-muted cursor-not-allowed"
            >
              Watch Ad
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
