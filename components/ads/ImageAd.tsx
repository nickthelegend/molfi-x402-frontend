'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdHeartbeat } from './useHeartbeat';

interface ImageAdProps {
  impressionToken: string;
  imageUrl: string;
  dwellMs: number;
  ctaUrl: string;
  apiBase: string;
  onComplete: (creditJwt: string, txHash?: string) => void;
  onError: (e: Error) => void;
}

export function ImageAd(p: ImageAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startedAt] = useState(() => Date.now());
  const [progress, setProgress] = useState(0);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isCursorInside = useRef(false);
  const isScrollIntoView = useRef(false);

  const evidenceProvider = () => {
    return {
      cursorInside: isCursorInside.current,
      scrollIntoView: isScrollIntoView.current,
      focused: typeof document !== 'undefined' ? document.hasFocus() : true,
    };
  };

  useAdHeartbeat({
    impressionToken: p.impressionToken,
    startedAt,
    intervalMs: 500,
    apiBase: p.apiBase,
    evidenceProvider,
    onError: p.onError,
  });

  // IntersectionObserver for visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        isScrollIntoView.current = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      },
      { threshold: [0.0, 0.5, 1.0] }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const showSkipButton = typeof window !== 'undefined' && (window as any).__molfi_test_skip_ad;

  const triggerClaim = async () => {
    if (loadingClaim) return;
    setLoadingClaim(true);
    try {
      const elapsed = Date.now() - startedAt;
      const res = await fetch(`${p.apiBase}/v1/ads/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impressionToken: p.impressionToken,
          watchedMs: elapsed,
          lastSeq: -1,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Claim failed');
      }
      const { creditJwt, txHash } = await res.json();
      p.onComplete(creditJwt, txHash);
    } catch (e) {
      p.onError(e as Error);
    } finally {
      setLoadingClaim(false);
    }
  };

  // Timer check loop
  useEffect(() => {
    const timer = setInterval(async () => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min((elapsed / p.dwellMs) * 100, 100);
      setProgress(pct);

      if (elapsed >= p.dwellMs && !completed) {
        clearInterval(timer);
        setCompleted(true);
        triggerClaim();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [p.dwellMs, startedAt, completed, p.impressionToken, p.apiBase, loadingClaim]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        isCursorInside.current = true;
      }}
      onMouseLeave={() => {
        isCursorInside.current = false;
      }}
      className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-zinc-950 p-4 shadow-xl"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border border-zinc-800">
        <img
          src={p.imageUrl}
          alt="Sponsor Ad creative"
          className="h-full w-full object-cover select-none pointer-events-none"
        />
        <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-purple-400 backdrop-blur-sm">
          Attention Verification Active
        </div>
        
        {/* Progress bar overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
          <div
            className="h-full bg-purple-500 transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <a
          href={p.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
        >
          Sponsored — learn more <span className="text-[10px]">↗</span>
        </a>
        <span className="text-[10px] text-zinc-500">
          Dwell required: {(p.dwellMs / 1000).toFixed(0)}s
        </span>
      </div>
      {showSkipButton && (
        <button
          onClick={triggerClaim}
          className="mt-4 w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-700 transition-all cursor-pointer"
        >
          Claim 5 Credits
        </button>
      )}
    </div>
  );
}
