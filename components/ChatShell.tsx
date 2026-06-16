'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useChatStore } from '../store/chatStore';
import { ModelPicker } from './ModelPicker';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { PaymentInspector } from './PaymentInspector';
import { AgentModePanel } from './AgentModePanel';
import { Menu } from 'lucide-react';

export function ChatShell({ onWatchAdClick }: { onWatchAdClick: () => void }) {
  const { clearChat } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text select-none">
      {/* 1. Left Sidebar */}
      {sidebarOpen ? (
        <div className="flex w-64 flex-col bg-surface border-r border-border p-4 transition-all duration-300">
          {/* Header wordmark */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="MOLFI.FUN Logo" className="h-6 w-6 object-contain" />
              <h1 className="text-xl font-bold tracking-wider text-text font-display">
                MOLFI<span className="text-accent">.</span>FUN
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-xs text-text-muted hover:text-text cursor-pointer"
            >
              ◀
            </button>
          </div>

          {/* Model selection */}
          <div className="mb-4">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              Active LLM Model
            </span>
            <ModelPicker />
          </div>

          {/* Wallet connection */}
          <div className="mb-4">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              USDC Wallet
            </span>
            <div className="scale-90 origin-left">
              <ConnectButton showBalance={true} chainStatus="icon" />
            </div>
          </div>

          {/* Agent Mode Panel */}
          <AgentModePanel />

          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={clearChat}
              className="w-full rounded-lg border border-border bg-surface-2 py-2 text-xs font-semibold text-text hover:border-text-muted transition-all cursor-pointer"
            >
              Clear Conversation
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex w-12 flex-col items-center pt-6 bg-surface border-r border-border hover:bg-surface-2 transition-all cursor-pointer text-text-muted text-xs"
        >
          ▶
        </button>
      )}

      {/* 2. Main Chat Panel */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 items-center justify-between border-b border-border px-6 bg-surface/50">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mr-2 text-text-muted hover:text-text cursor-pointer p-1.5 rounded hover:bg-surface-2 transition-all flex items-center justify-center"
                  title="Open Sidebar"
                >
                  <Menu size={18} />
                </button>
                <div className="flex items-center gap-1.5 mr-2">
                  <img src="/logo.png" alt="MOLFI.FUN Logo" className="h-5 w-5 object-contain" />
                  <span className="text-sm font-bold text-text">MOLFI.FUN</span>
                </div>
              </>
            )}
            <span className="rounded bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
              Fuji Testnet
            </span>
          </div>
          {!inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(true)}
              className="text-xs text-text-muted hover:text-text cursor-pointer"
            >
              Debugger ⚡
            </button>
          )}
        </div>

        {/* Message scroll viewport */}
        <div className="flex-1 overflow-hidden relative">
          <MessageList />
        </div>

        {/* Floating input pane */}
        <Composer onWatchAdClick={onWatchAdClick} />
      </div>

      {/* 3. Right Debugger Panel */}
      {inspectorOpen && (
        <div className="relative flex w-80 flex-col transition-all duration-300">
          <button
            onClick={() => setInspectorOpen(false)}
            className="absolute top-4 right-4 z-40 text-xs text-text-muted hover:text-text cursor-pointer font-bold"
          >
            ✕
          </button>
          <div className="h-full">
            <PaymentInspector />
          </div>
        </div>
      )}
    </div>
  );
}
