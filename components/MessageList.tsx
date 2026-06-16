'use client';

import React from 'react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';

export function MessageList() {
  const { messages } = useChatStore();

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center dot-grid">
        <div className="max-w-md glass p-8 rounded-2xl shadow-xl">
          <div className="inline-block rounded-full bg-accent/10 p-4 mb-4 border border-accent/20">
            <span className="text-3xl">🏔️</span>
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Welcome to Molfi.fun</h2>
          <p className="text-sm text-text-muted mb-6">
            A premium multi-model AI assistant powered by agentic stablecoin streams on Avalanche Fuji.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
              <div className="font-semibold text-text mb-1">Human Rail 🎬</div>
              <div className="text-text-muted">Watch a 15-second sponsor ad to earn 5 free credits instantly.</div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
              <div className="font-semibold text-text mb-1">Agent Rail 💸</div>
              <div className="text-text-muted">Pay exact micro-cents autonomously in Fuji USDC per message.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto pb-24 h-full">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
