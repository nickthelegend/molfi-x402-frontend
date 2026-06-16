import { useEffect, useRef } from 'react';

export function useAdHeartbeat(opts: {
  impressionToken: string;
  startedAt: number;
  intervalMs: number;
  evidenceProvider: () => Record<string, any>;
  apiBase: string;
  onError: (e: Error) => void;
}) {
  const seqRef = useRef(0);
  const optsRef = useRef(opts);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    const id = setInterval(async () => {
      const seq = seqRef.current++;
      const elapsedMs = Date.now() - optsRef.current.startedAt;
      const payload = {
        impressionToken: optsRef.current.impressionToken,
        seq,
        elapsedMs,
        visibility: document.visibilityState, // 'visible' | 'hidden'
        evidence: optsRef.current.evidenceProvider(),
      };
      try {
        await fetch(`${optsRef.current.apiBase}/v1/ads/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (e) {
        optsRef.current.onError(e as Error);
      }
    }, opts.intervalMs);

    return () => {
      clearInterval(id);
    };
  }, [opts.impressionToken, opts.intervalMs]);
}
