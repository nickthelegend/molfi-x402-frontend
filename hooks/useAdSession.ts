'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

type Heartbeat = {
  t: number;
  currentTime: number;
  paused: boolean;
  muted: boolean;
  visible: boolean;
  focused: boolean;
  sig?: string;
};

const HB_INTERVAL_MS = 1000;
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

function hbMessage(sessionId: string, nonceHex: string, hb: Heartbeat) {
  return [
    'molfi:hb:v1',
    sessionId,
    nonceHex,
    String(hb.t),
    hb.currentTime.toFixed(3),
    hb.paused ? '1' : '0',
    hb.muted ? '1' : '0',
    hb.visible ? '1' : '0',
    hb.focused ? '1' : '0',
  ].join('|');
}

export function useAdSession(jwt: string | null, setJwt: (jwt: string | null) => void) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const signMessageRef = useRef(signMessageAsync);
  useEffect(() => {
    signMessageRef.current = signMessageAsync;
  }, [signMessageAsync]);

  const [session, setSession] = useState<any>(null);
  const heartbeats = useRef<Heartbeat[]>([]);
  const startTs = useRef<number>(0);
  const signingFirst = useRef(false);
  const finalizing = useRef(false);

  const loginUser = useCallback(async () => {
    if (!address || !isConnected) throw new Error('Wallet not connected');
    
    const nonceRes = await fetch(`${BACKEND}/v1/users/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address }),
    });
    if (!nonceRes.ok) throw new Error('Failed to get SIWE nonce');
    const { nonce } = await nonceRes.json();

    const domain = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const siweMessage = `${domain} wants you to sign in with your Ethereum account:
${address.toLowerCase()}

URI: ${origin}
Version: 1
Chain ID: 43113
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

    const signature = await signMessageRef.current({ message: siweMessage });

    const verifyRes = await fetch(`${BACKEND}/v1/users/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: siweMessage, signature }),
    });
    if (!verifyRes.ok) throw new Error('SIWE verification failed');
    const { token } = await verifyRes.json();
    setJwt(token);
    return token;
  }, [address, isConnected, setJwt]);

  const start = useCallback(async (opts: { surface: 'chat-web' | 'extension'; kind: 'text' | 'image' | 'video'; modelInUse?: string }) => {
    let currentJwt = jwt;
    if (!currentJwt) {
      currentJwt = await loginUser();
    }

    const r = await fetch(`${BACKEND}/v1/ads/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentJwt}`,
      },
      body: JSON.stringify(opts),
    });
    
    if (r.status === 204) return null;
    
    if (!r.ok) {
      if (r.status === 401) {
        // Token expired/invalid, try logging in again
        currentJwt = await loginUser();
        return start(opts);
      }
      throw new Error(`start failed: ${r.status}`);
    }
    
    const s = await r.json();
    setSession(s);
    heartbeats.current = [];
    startTs.current = Date.now();
    signingFirst.current = false;
    finalizing.current = false;
    return s;
  }, [jwt, loginUser]);

  const beat = useCallback(async (video: HTMLVideoElement | null) => {
    if (!session || finalizing.current) return;
    if (signingFirst.current) return;

    const hb: Heartbeat = {
      t: Date.now() - startTs.current,
      currentTime: video?.currentTime ?? (Date.now() - startTs.current) / 1000,
      paused: video?.paused ?? false,
      muted:  video?.muted  ?? false,
      visible: document.visibilityState === 'visible',
      focused: document.hasFocus(),
    };
    
    // Sign first heartbeat
    const isFirst = heartbeats.current.length === 0;
    if (isFirst) {
      signingFirst.current = true;
      const wasPlaying = video && !video.paused;
      if (wasPlaying) {
        video.pause();
      }
      try {
        // Set hb.t to 0 BEFORE signing so the signed message matches the final submitted object
        hb.t = 0;
        hb.sig = await signMessageRef.current({ message: hbMessage(session.sessionId, session.nonceHex, hb) });
        // Align startTs with the signature completion time to prevent gap verification failures
        startTs.current = Date.now();
        heartbeats.current.push(hb);
        if (wasPlaying && video) {
          video.play().catch(console.error);
        }
      } catch (err) {
        console.error('Failed to sign first heartbeat:', err);
      } finally {
        signingFirst.current = false;
      }
    } else {
      heartbeats.current.push(hb);
    }
  }, [session]);

  const finalize = useCallback(async (video: HTMLVideoElement | null) => {
    if (!session || finalizing.current) return null;
    
    finalizing.current = true;

    // Force a last beat WITH signature
    const last: Heartbeat = {
      t: Date.now() - startTs.current,
      currentTime: video?.currentTime ?? (Date.now() - startTs.current) / 1000,
      paused: video?.paused ?? false,
      muted: video?.muted ?? false,
      visible: document.visibilityState === 'visible',
      focused: document.hasFocus(),
    };

    try {
      last.sig = await signMessageRef.current({ message: hbMessage(session.sessionId, session.nonceHex, last) });
      heartbeats.current.push(last);
    } catch (err) {
      console.error('Failed to sign last heartbeat:', err);
      finalizing.current = false;
      throw err;
    }

    const r = await fetch(`${BACKEND}/v1/ads/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        heartbeats: heartbeats.current,
        watchedMs: Date.now() - startTs.current,
      }),
    });
    
    const out = await r.json();
    setSession(null);
    finalizing.current = false;
    return { ok: r.ok, status: r.status, ...out };
  }, [session, jwt]);

  // Safety triggers — kill session if tab hidden too long
  useEffect(() => {
    if (!session) return;
    let hiddenSince = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSince = Date.now();
      } else if (hiddenSince && Date.now() - hiddenSince > 1500) {
        setSession(null);
        heartbeats.current = [];
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [session]);

  return { session, start, beat, finalize, heartbeatIntervalMs: HB_INTERVAL_MS, loginUser };
}
