'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../store/chatStore';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full flex-col gap-1.5 p-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wider text-text-muted uppercase">
          {isUser ? 'You' : 'Molfi Assistant'}
        </span>

        {/* Paid-via Badge */}
        {!isUser && message.paidVia && (
          <div className="flex items-center gap-1">
            {message.paidVia === 'x402' ? (
              <a
                href={`https://testnet.snowtrace.io/tx/${message.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded bg-surface-2 border border-border px-2 py-0.5 text-[10px] font-semibold text-accent hover:text-accent-2 transition-all font-mono"
                title="View EIP-3009 transfer on Snowtrace"
              >
                💸 USDC tx · {message.txHash?.slice(0, 6)}...{message.txHash?.slice(-4)} ↗
              </a>
            ) : (
              <span className="rounded bg-accent-dim border border-accent/25 px-2 py-0.5 text-[10px] font-semibold text-accent-2">
                🎬 Ad-credited
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`max-w-3xl rounded-xl p-3.5 text-sm leading-relaxed ${
        isUser 
          ? 'bg-surface-2 text-text border-l-2 border-accent rounded-tr-none' 
          : 'bg-surface text-text border border-border'
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              pre: ({ children }) => (
                <pre className="my-2 overflow-x-auto rounded bg-bg p-3 font-mono text-xs border border-border text-text-muted">
                  {children}
                </pre>
              ),
              code: ({ children }) => (
                <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs text-accent-2">
                  {children}
                </code>
              ),
            }}
          >
            {message.content || '...'}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
