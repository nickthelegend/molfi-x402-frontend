'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdHeartbeat } from './useHeartbeat';

interface VideoAdProps {
  impressionToken: string;
  mp4Url: string;
  durationMs: number;
  ctaUrl: string;
  apiBase: string;
  onComplete: (creditJwt: string, txHash?: string) => void;
  onError: (e: Error) => void;
}

export function VideoAd(p: VideoAdProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [startedAt] = useState(() => Date.now());
  const [loadingClaim, setLoadingClaim] = useState(false);
  const lastEvidence = useRef({ videoCurrentTimeMs: 0, videoPaused: false, videoMuted: false });

  useAdHeartbeat({
    impressionToken: p.impressionToken,
    startedAt,
    intervalMs: 500,
    apiBase: p.apiBase,
    evidenceProvider: () => lastEvidence.current,
    onError: p.onError,
  });

  const triggerClaim = async () => {
    if (loadingClaim) return;
    setLoadingClaim(true);
    try {
      const watchedMs = Date.now() - startedAt;
      const res = await fetch(`${p.apiBase}/v1/ads/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impressionToken: p.impressionToken,
          watchedMs,
          lastSeq: -1,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Claim verification failed');
      }
      const { creditJwt, txHash } = await res.json();
      p.onComplete(creditJwt, txHash);
    } catch (e) {
      p.onError(e as Error);
    } finally {
      setLoadingClaim(false);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      lastEvidence.current.videoCurrentTimeMs = v.currentTime * 1000;
    };
    const onPause = () => {
      lastEvidence.current.videoPaused = true;
    };
    const onPlay = () => {
      lastEvidence.current.videoPaused = false;
    };
    const onMute = () => {
      lastEvidence.current.videoMuted = v.muted;
    };
    const onEnded = () => {
      triggerClaim();
    };

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('pause', onPause);
    v.addEventListener('play', onPlay);
    v.addEventListener('volumechange', onMute);
    v.addEventListener('ended', onEnded);

    v.play().catch((e) => {
      console.warn('Auto play failed, user interaction may be required', e);
    });

    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('volumechange', onMute);
      v.removeEventListener('ended', onEnded);
    };
  }, [p.impressionToken, p.apiBase, startedAt]);

  const showSkipButton = typeof window !== 'undefined' && (window as any).__molfi_test_skip_ad;

  return (
    <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-zinc-950 p-4 shadow-xl">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black border border-zinc-800">
        <video
          ref={videoRef}
          src={p.mp4Url}
          playsInline
          controls={false} // no seek/skip controls to enforce attention
          className="h-full w-full object-cover"
        />
        <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-purple-400 backdrop-blur-sm">
          Attention Verification Active
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
          Duration: {(p.durationMs / 1000).toFixed(0)}s
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
