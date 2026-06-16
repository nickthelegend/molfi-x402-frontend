'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { getSnowtraceTxUrl } from './Snowtrace';

export interface Tx {
  hash: string;
  status: 'pending' | 'success' | 'reverted';
  network: string;
  label: string;
  meta?: {
    model?: string;
    amountUsdc?: string;
    payer?: string;
  };
  revertReason?: string;
}

interface TxModalContextType {
  txs: Tx[];
  show: (tx: Omit<Tx, 'status'> & { status?: Tx['status'] }) => void;
  close: (hash: string) => void;
}

const TxModalContext = createContext<TxModalContextType | undefined>(undefined);

const fujiRpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';

const publicClient = createPublicClient({
  transport: http(fujiRpc),
});

export function TxModalProvider({ children }: { children: React.ReactNode }) {
  const [txs, setTxs] = useState<Tx[]>([]);

  const show = (newTx: Omit<Tx, 'status'> & { status?: Tx['status'] }) => {
    const txWithStatus: Tx = {
      ...newTx,
      status: newTx.status || 'pending',
    };
    setTxs((prev) => {
      // Avoid duplicate hash entries
      if (prev.some((t) => t.hash.toLowerCase() === txWithStatus.hash.toLowerCase())) {
        return prev.map((t) =>
          t.hash.toLowerCase() === txWithStatus.hash.toLowerCase() ? { ...t, ...txWithStatus } : t
        );
      }
      return [...prev, txWithStatus];
    });
  };

  const close = (hash: string) => {
    setTxs((prev) => prev.filter((t) => t.hash.toLowerCase() !== hash.toLowerCase()));
  };

  // Poll transaction receipts
  useEffect(() => {
    const pendingTxs = txs.filter((t) => t.status === 'pending');
    if (pendingTxs.length === 0) return;

    const interval = setInterval(async () => {
      for (const tx of pendingTxs) {
        try {
          const receipt = await publicClient.getTransactionReceipt({
            hash: tx.hash as `0x${string}`,
          });
          if (receipt) {
            setTxs((prev) =>
              prev.map((t) =>
                t.hash.toLowerCase() === tx.hash.toLowerCase()
                  ? {
                      ...t,
                      status: receipt.status === 'success' ? 'success' : 'reverted',
                      revertReason: receipt.status === 'reverted' ? 'Transaction execution reverted' : undefined,
                    }
                  : t
              )
            );
          }
        } catch (e) {
          // ignore error if not found/pending on RPC
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [txs]);

  return (
    <TxModalContext.Provider value={{ txs, show, close }}>
      {children}
      {/* Global Toast Overlay stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-full">
        {txs.map((tx) => (
          <div
            key={tx.hash}
            className={`p-4 rounded-xl border glass shadow-2xl transition-all duration-300 transform translate-y-0 ${
              tx.status === 'reverted'
                ? 'border-danger/40 bg-danger/5 shadow-danger/10'
                : tx.status === 'success'
                ? 'border-success/45 bg-success/5'
                : 'border-accent/40 bg-accent-dim/10'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    tx.status === 'reverted'
                      ? 'bg-danger/10 text-danger'
                      : tx.status === 'success'
                      ? 'bg-success/10 text-success'
                      : 'bg-accent/10 text-accent animate-pulse'
                  }`}
                >
                  {tx.status}
                </span>
                <h4 className="text-xs font-bold text-text mt-1.5 font-display">{tx.label}</h4>
              </div>
              <button
                onClick={() => close(tx.hash)}
                className="text-text-muted hover:text-text cursor-pointer text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 font-mono text-[10px] text-text-muted select-all bg-black/40 p-2 rounded border border-border">
              {tx.hash.slice(0, 8)}...{tx.hash.slice(-8)}
            </div>

            {tx.revertReason && (
              <div className="mt-2 text-[10px] text-danger font-mono font-semibold">
                ⚠️ Revert Reason: {tx.revertReason}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <a
                href={getSnowtraceTxUrl(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block text-center rounded pill-accent text-white font-bold py-1.5 transition-all text-[11px] shadow-sm hover:brightness-110"
              >
                Open in Snowtrace ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </TxModalContext.Provider>
  );
}

export function useTxModal() {
  const context = useContext(TxModalContext);
  if (!context) {
    throw new Error('useTxModal must be used within a TxModalProvider');
  }
  return context;
}
