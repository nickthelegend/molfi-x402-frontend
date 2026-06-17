'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdSession } from '../../hooks/useAdSession';

export function VideoAd({
  jwt,
  setJwt,
  onClose,
  onClaimed,
}: {
  jwt: string | null;
  setJwt: (jwt: string | null) => void;
  onClose: () => void;
  onClaimed: (info: any) => void;
}) {
  const { session, start, beat, finalize, heartbeatIntervalMs } = useAdSession(jwt, setJwt);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize session
  useEffect(() => {
    setLoading(true);
    start({ surface: 'chat-web', kind: 'video' })
      .then((s) => {
        if (!s) {
          setError('No active campaigns matching targeting criteria.');
        }
      })
      .catch((e) => {
        setError(e.message || 'Failed to initialize ad session');
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic heartbeat loop
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => beat(videoRef.current), heartbeatIntervalMs);
    return () => clearInterval(id);
  }, [session, beat, heartbeatIntervalMs]);

  // Restrict skip vectors: block contextmenu, fast-forward, and ratechange
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.disablePictureInPicture = true;
    
    const onCtx = (e: Event) => e.preventDefault();
    const onRate = () => {
      v.playbackRate = 1.0;
    };

    v.addEventListener('contextmenu', onCtx);
    v.addEventListener('ratechange', onRate);

    v.play().catch((e) => {
      console.warn('Playback failed, waiting for user click.', e);
    });

    return () => {
      v.removeEventListener('contextmenu', onCtx);
      v.removeEventListener('ratechange', onRate);
    };
  }, [session]);

  const handleEnded = async () => {
    setEnded(true);
    try {
      const r = await finalize(videoRef.current);
      if (r?.ok) {
        onClaimed(r);
      } else {
        setError(r?.reasons?.join('; ') || r?.error || 'Claim verification failed');
      }
    } catch (e: any) {
      setError(e.message || 'Claim verification failed');
    }
  };

  const showSkipButton = typeof window !== 'undefined' && (window as any).__molfi_test_skip_ad;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
        <div className="text-xs font-mono text-purple-400 flex flex-col items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <span>Starting verified ad session...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur p-4">
        <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-zinc-950 p-6 shadow-2xl text-center">
          <div className="text-red-400 text-xs font-bold mb-3">⚠️ Verification Rejected</div>
          <p className="text-[11px] text-zinc-400 leading-relaxed break-words mb-5">{error}</p>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-bold text-text hover:bg-zinc-800 transition-all uppercase"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-purple-500/20 bg-zinc-950 p-6 shadow-2xl flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Sponsored Attention Slot</span>
            <h3 className="text-sm font-bold text-text mt-0.5">{session.title || 'Attention Placement'}</h3>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            Earn {(Number(session.rewardUsdc) / 1e6).toFixed(4)} USDC
          </span>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-zinc-800">
          <video
            ref={videoRef}
            src={session.contentURI}
            poster={session.thumbnailCid ? `https://gateway.pinata.cloud/ipfs/${session.thumbnailCid}` : undefined}
            autoPlay
            playsInline
            controls={false}
            onEnded={handleEnded}
            className="h-full w-full object-contain"
          />
          
          <div className="absolute top-3 left-3 rounded bg-black/60 px-2 py-1 text-[9px] font-semibold text-purple-400 backdrop-blur-sm tracking-wider uppercase">
            Anti-Fraud Verification Active
          </div>

          {ended && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10 gap-2">
              <div className="h-6 w-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              <span className="text-xs font-semibold text-purple-400">Verifying attention proofs...</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex items-center justify-between text-xs">
          <a
            href={session.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 hover:underline transition-all font-semibold flex items-center gap-1"
          >
            {session.ctaText || 'Learn More'} ↗
          </a>
          <span className="text-[10px] text-zinc-500 font-mono">
            Length: {(session.durationMs / 1000).toFixed(0)}s
          </span>
        </div>

        {showSkipButton && (
          <button
            onClick={handleEnded}
            className="w-full rounded-xl bg-purple-600 py-3 text-xs font-bold text-white hover:bg-purple-700 transition-all cursor-pointer uppercase tracking-wider"
          >
            Claim 5 Credits
          </button>
        )}
      </div>
    </div>
  );
}
