'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWalletClient, useAccount } from 'wagmi';
import { useChatStore } from '../store/chatStore';
import { requestCompletionsWithPay } from '../lib/x402-client';
import { useTxModal } from './tx/TxModalProvider';
import { ModelPicker } from './ModelPicker';
import { MessageList } from './MessageList';
import { AgentModePanel } from './AgentModePanel';
import { PaymentInspector } from './PaymentInspector';
import { Settings, Send, Terminal, Monitor, X } from 'lucide-react';

const getModelCost = (modelId: string): number => {
  const costs: Record<string, number> = {
    'llama-3.3-70b': 0.001,
    'deepseek-v3': 0.002,
    'gemini-2.5-flash': 0.003,
    'gpt-4o-mini': 0.005,
    'claude-sonnet-4.5': 0.01,
    'gpt-4o': 0.01,
    'claude-opus-4.x': 0.03,
  };
  return costs[modelId] || 0.01;
};

export function ChatShell({ onWatchAdClick }: { onWatchAdClick: () => void }) {
  const {
    messages,
    selectedModel,
    jwt,
    credits,
    agentMode,
    agentPrivateKey,
    addMessage,
    updateMessageContent,
    updateMessageMetadata,
    setCredits,
    setInspectorData,
    incrementAgentSpent,
    clearChat,
  } = useChatStore();

  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { show: showTxModal } = useTxModal();

  const [activeTab, setActiveTab] = useState<'human' | 'agent'>('human');
  const [promptValue, setPromptValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || loading) return;

    setError(null);
    setLoading(true);

    const assistantMsgId = addMessage({ role: 'assistant', content: '' });
    addMessage({ role: 'user', content: promptText });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

    try {
      const chatMessages = messages
        .map((m) => ({ role: m.role, content: m.content }))
        .concat({ role: 'user', content: promptText });

      const res = await requestCompletionsWithPay({
        model: selectedModel,
        messages: chatMessages,
        walletClient,
        userAddress: address,
        jwt,
        agentMode,
        agentPrivateKey,
        onPaymentCaptured: (data) => {
          setInspectorData(data);
          if (data.decodedXPaymentResponse?.success && data.decodedXPaymentResponse?.transaction) {
            const valueRaw = data.decodedXPayment?.payload?.authorization?.value || '0';
            const costUsdc = parseFloat(valueRaw) / 1000000;
            incrementAgentSpent(costUsdc);
            showTxModal({
              hash: data.decodedXPaymentResponse.transaction,
              status: 'pending',
              network: 'avalanche-fuji',
              label: `x402 payment · ${costUsdc.toFixed(3)} USDC`,
            });
          }
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Completions stream is empty.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6);
            if (rawData === '[DONE]') continue;

            try {
              const parsed = JSON.parse(rawData);

              if (parsed.molfiMetadata) {
                updateMessageMetadata(assistantMsgId, {
                  paidVia: parsed.molfiMetadata.paidVia,
                  txHash: parsed.molfiMetadata.txHash,
                });
              } else if (parsed.choices?.[0]?.delta?.content) {
                updateMessageContent(assistantMsgId, parsed.choices[0].delta.content);
              }
            } catch (err) {
              // ignore
            }
          }
        }
      }

      if (jwt) {
        const balRes = await fetch(`${backendUrl}/v1/credits/balance`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (balRes.ok) {
          const balData = (await balRes.json()) as { credits: number };
          setCredits(balData.credits);
        }
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      updateMessageContent(assistantMsgId, `⚠️ Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = () => {
    if (!promptValue.trim()) return;

    if (activeTab === 'human') {
      if (!jwt || credits <= 0) {
        onWatchAdClick();
        return;
      }
    } else {
      if (!address && !agentPrivateKey) {
        alert("Please connect your wallet or generate an Agent Key in the console drawer first to proceed under Agent mode.");
        setConsoleOpen(true);
        return;
      }
    }

    handleSendPrompt(promptValue);
    setPromptValue('');
    setConsoleOpen(true);
  };

  const handleGearClick = () => {
    setConsoleOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-text select-none relative font-sans">
      {/* 1. Left Console Drawer */}
      {consoleOpen && (
        <div className="flex w-[400px] flex-col bg-[#0b0b0d] border-r border-border p-4 transition-all duration-300 z-30">
          {/* Console Header */}
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <span className="text-xs font-mono text-text-muted uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              MOLFI TERMINAL CONSOLE
            </span>
            <button
              onClick={() => setConsoleOpen(false)}
              className="text-text-muted hover:text-white cursor-pointer text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
            {/* Model & Balance Selector */}
            <div className="bg-surface-2/40 border border-border p-4 rounded-xl space-y-3">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block">Active LLM Model</span>
              <ModelPicker />
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 mt-1">
                <span className="text-text-muted">🎬 Free Credits:</span>
                <span className="text-white font-bold flex items-center gap-1.5">
                  {credits} credits
                  <button
                    onClick={onWatchAdClick}
                    className="text-accent hover:underline text-[10px] font-black tracking-wider uppercase"
                  >
                    + Add
                  </button>
                </span>
              </div>
            </div>

            {/* Conversation list */}
            <div className="bg-surface-2/40 border border-border p-4 rounded-xl flex flex-col h-[280px]">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2">Conversation Output</span>
              <div className="flex-1 overflow-y-auto pr-1">
                <MessageList />
              </div>
            </div>

            {/* Payment Telemetry inspector */}
            <div className="bg-surface-2/40 border border-border p-4 rounded-xl flex flex-col h-[220px]">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2">x402 Telemetry log</span>
              <div className="flex-1 overflow-y-auto text-xs pr-1">
                <PaymentInspector />
              </div>
            </div>

            {/* Agent keys */}
            <div className="bg-surface-2/40 border border-border p-4 rounded-xl">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2">Agent key authorization</span>
              <AgentModePanel />
            </div>

            {/* Clear conversation */}
            <button
              onClick={clearChat}
              className="w-full rounded-lg border border-border bg-surface-2/40 py-2.5 text-xs font-semibold text-text hover:border-text-muted transition-all cursor-pointer uppercase tracking-wider"
            >
              Clear Console Chat
            </button>
          </div>
        </div>
      )}

      {/* Vertical Collapsed Console Trigger */}
      {!consoleOpen && (
        <button
          onClick={() => setConsoleOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 bg-primary text-black border-r border-y border-outline-variant/20 rounded-r-2xl py-6 px-3 flex flex-col items-center gap-3 cursor-pointer shadow-2xl hover:brightness-110 transition-all z-40"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.25em] select-none text-center" style={{ writingMode: 'vertical-rl' }}>
            Open Console
          </span>
          <Terminal size={14} className="text-black" />
        </button>
      )}

      {/* 2. Main Hero Panel */}
      <div className="flex-1 flex flex-col overflow-hidden relative dot-grid">
        {/* Top Header Bar */}
        <header className="flex h-20 items-center justify-between px-8 border-b border-border bg-[#050505]/60 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Molfi Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-black tracking-tighter text-white uppercase font-display">Molfi</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="text-text-muted hover:text-white cursor-pointer p-1.5 rounded hover:bg-surface-2/40 transition-all"
              title="Toggle Console View"
            >
              <Monitor size={18} />
            </button>
            <button
              onClick={handleGearClick}
              className="text-text-muted hover:text-white cursor-pointer p-1.5 rounded hover:bg-surface-2/40 transition-all"
              title="Configure Console Settings"
            >
              <Settings size={18} />
            </button>

            {/* RainbowKit Connected Wallet Button */}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="bg-primary text-black px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                          >
                            Connect Wallet
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                          >
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="hidden md:flex items-center gap-1.5 bg-[#191919] border border-outline-variant/10 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer hover:bg-white/5 transition-all"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  marginRight: 4,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 12, height: 12 }}
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </button>

                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="bg-primary text-black px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                          >
                            {account.displayName}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </header>

        {/* Hero Interactive Workspace */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
          {/* Logo Name */}
          <h1
            className="text-7xl md:text-[8rem] font-black tracking-[-0.04em] mb-12 font-display text-center uppercase"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #c899ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Molfi
          </h1>

          {/* Toggle Switches */}
          <div className="flex items-center bg-[#14141a]/60 border border-border p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => setActiveTab('human')}
              className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                activeTab === 'human'
                  ? 'bg-primary text-black font-black primary-glow'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              I'M A HUMAN
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                activeTab === 'agent'
                  ? 'bg-primary text-black font-black primary-glow'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              I'M AN AGENT
            </button>
          </div>

          {/* Input Console Bar */}
          <div className="w-full max-w-3xl bg-[#14141a]/80 border border-border rounded-3xl p-3 flex items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] focus-within:border-primary transition-all">
            <span className="text-on-surface-variant font-mono text-sm ml-2">&gt;_</span>
            <input
              type="text"
              placeholder={
                activeTab === 'human'
                  ? "Describe the task for your agents..."
                  : "Enter programmatic prompt payload..."
              }
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="bg-transparent border-none outline-none text-white flex-1 text-sm placeholder:text-text-dim"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRequestClick();
                }
              }}
            />
            
            {/* Cost Indicator */}
            <div className="flex items-center gap-1 bg-[#0b0b0d] border border-border px-3 py-1.5 rounded-xl font-mono text-xs text-white">
              <span className="text-text-muted">$</span>
              <span className="font-bold">{getModelCost(selectedModel).toFixed(2)}</span>
            </div>

            {/* Settings trigger */}
            <button
              onClick={handleGearClick}
              className="text-text-muted hover:text-white cursor-pointer p-1.5 transition-all"
              title="Open Settings in Console"
            >
              <Settings size={18} />
            </button>

            {/* Request Trigger */}
            <button
              onClick={handleRequestClick}
              disabled={loading}
              className="bg-primary text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin h-3 w-3 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <Send size={12} className="text-black" />
              )}
              REQUEST
            </button>
          </div>

          {/* Trending Operations */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <span className="text-[9px] font-black uppercase tracking-widest text-text-dim mr-2">Trending Operations:</span>
            {[
              { label: 'VIRAL TWEET THREAD', prompt: 'Write a viral Twitter thread about x402 payments and how agents pay with USDC on Avalanche Fuji.' },
              { label: 'SMART CONTRACT AUDIT', prompt: 'Perform a security audit on the ImpressionRegistry solidity contract for batch verification.' },
              { label: 'MARKET ANALYSIS', prompt: 'Analyze the current stablecoin market volume and AVAX Fuji gas prices.' },
              { label: 'AI AGENT SETUP', prompt: 'Explain how to set up an automated AI agent script using the EIP-3009 payment headers.' }
            ].map((op) => (
              <button
                key={op.label}
                onClick={() => setPromptValue(op.prompt)}
                className="bg-[#14141a]/40 border border-border/60 hover:border-primary/40 text-[9px] font-bold text-text-muted hover:text-white px-4 py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
              >
                {op.label}
              </button>
            ))}
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="w-full max-w-3xl mt-4 text-xs text-accent rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
