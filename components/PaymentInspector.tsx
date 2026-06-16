'use client';

import React from 'react';
import { useChatStore } from '../store/chatStore';

export function PaymentInspector() {
  const { inspectorData } = useChatStore();

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border p-4 overflow-y-auto text-xs">
      <div className="mb-4 pb-2 border-b border-border">
        <h3 className="text-sm font-bold text-text uppercase tracking-wider">⚡ Payment Inspector</h3>
        <p className="text-[10px] text-text-muted mt-0.5">Real-time HTTP 402 protocol debugger</p>
      </div>

      {!inspectorData ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-4">
          <span className="text-2xl mb-2 opacity-55">📡</span>
          <span className="text-text-muted">No protocol headers captured yet.</span>
          <p className="text-[10px] text-text-muted mt-1 leading-normal max-w-[200px]">
            Connect your wallet to pay with USDC and view EIP-3009 signatures and headers here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 font-mono">
          {/* Endpoint URL */}
          <div>
            <span className="text-[10px] font-semibold text-accent uppercase">Request Target</span>
            <div className="rounded bg-bg p-2 border border-border text-text mt-1 truncate">
              POST /v1/chat/completions
            </div>
          </div>

          {/* Request Header */}
          {inspectorData.requestHeaders?.['x-payment'] && (
            <div>
              <span className="text-[10px] font-semibold text-accent uppercase">Request Header: X-PAYMENT</span>
              <div className="rounded bg-bg p-2 border border-border text-text mt-1 break-all select-all max-h-24 overflow-y-auto text-[10px] opacity-75">
                {inspectorData.requestHeaders['x-payment']}
              </div>
            </div>
          )}

          {/* Decoded Authorization Payload */}
          {inspectorData.decodedXPayment && (
            <div>
              <span className="text-[10px] font-semibold text-success uppercase">Decoded EIP-3009 Payload</span>
              <div className="rounded bg-bg p-2.5 border border-border mt-1 text-text-muted overflow-x-auto max-h-56">
                <div className="mb-1 text-text">
                  <span className="text-[10px] text-text-muted">Scheme: </span>
                  {inspectorData.decodedXPayment.scheme}
                </div>
                <div className="mb-1 text-text">
                  <span className="text-[10px] text-text-muted">Network: </span>
                  {inspectorData.decodedXPayment.network}
                </div>
                <div className="border-t border-border mt-1.5 pt-1.5">
                  <div className="text-accent-2 font-semibold">Authorization Details:</div>
                  <pre className="text-[10px] leading-tight mt-1 text-text-muted">
                    {JSON.stringify(inspectorData.decodedXPayment.payload?.authorization, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Decoded Payment Response */}
          {inspectorData.decodedXPaymentResponse && (
            <div>
              <span className="text-[10px] font-semibold text-accent uppercase">Response Header: X-PAYMENT-RESPONSE</span>
              <div className="rounded bg-bg p-2.5 border border-border mt-1 text-text-muted">
                <div className="flex items-center justify-between mb-1">
                  <span>Settlement Success:</span>
                  <span className="font-bold text-success">TRUE</span>
                </div>
                <div className="mb-2">
                  <span className="text-[10px] text-text-muted">Payer: </span>
                  <span className="text-text block truncate select-all">{inspectorData.decodedXPaymentResponse.payer}</span>
                </div>
                <div className="border-t border-border mt-2 pt-2">
                  <div className="text-accent font-semibold mb-1 text-[10px]">On-Chain Transaction:</div>
                  <div className="text-text truncate select-all mb-2 font-mono text-[10px]">
                    {inspectorData.decodedXPaymentResponse.transaction}
                  </div>
                  <a
                    href={`https://testnet.snowtrace.io/tx/${inspectorData.decodedXPaymentResponse.transaction}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-block text-center rounded bg-accent hover:bg-accent-2 text-white font-bold py-1.5 transition-all text-[11px]"
                  >
                    View on Snowtrace ↗
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
