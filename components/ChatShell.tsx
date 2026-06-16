'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWalletClient, useAccount } from 'wagmi';
import { useChatStore } from '../store/chatStore';
import { requestCompletionsWithPay } from '../lib/x402-client';
import { useTxModal } from './tx/TxModalProvider';
import { ModelPicker } from './ModelPicker';
import { MessageList } from './MessageList';
import { AgentModePanel } from './AgentModePanel';
import { PaymentInspector } from './PaymentInspector';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_Prompt } from './ui/animated-ai-input';
import { 
  Settings, 
  Send, 
  Terminal, 
  Monitor, 
  X,
  ChevronDown,
  Smartphone,
  Wallet,
  BookOpen,
  Shield,
  Globe,
  Twitter,
  MessageCircle,
  ArrowUpRight
} from 'lucide-react';


interface DropdownProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const NavDropdown = ({ label, isOpen, onToggle, children }: DropdownProps) => {
  return (
    <div className="relative" onMouseEnter={onToggle} onMouseLeave={onToggle}>
      <button className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 group cursor-pointer ${isOpen ? 'text-white' : 'text-on-surface-variant hover:text-white'}`}>
        {label} <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-4 w-64 bg-[#1f1f1f] rounded-2xl shadow-2xl p-4 overflow-hidden z-[60] transition-all duration-200">
          <div className="flex flex-col gap-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({ icon: Icon, title, desc, href = "#", download = false }: { icon: any, title: string, desc: string, href?: string, download?: boolean }) => (
  <a 
    href={href} 
    download={download} 
    className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group"
  >
    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
      <Icon size={20} />
    </div>
    <div className="flex flex-col gap-0.5 text-left">
      <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1">
        {title} 
        <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
      <span className="text-[10px] text-on-surface-variant font-medium leading-tight">{desc}</span>
    </div>
  </a>
);

const getModelCost = (modelId: string): number => {
  const costs: Record<string, number> = {
    'llama-3.3-70b': 0.001,
    'deepseek-v3': 0.002,
    'gemini-2.5-flash': 0.003,
    'gpt-4o-mini': 0.005,
    'claude-sonnet-4.5': 0.01,
    'gpt-4o': 0.01,
    'claude-opus-4.x': 0.03,
    'llama-nemotron-rerank-vl-1b-v2-free': 0.0001,
    'nex-n2-pro-free': 0.0001,
    'riverflow-v2.5-pro': 0.0002,
    'riverflow-v2.5-fast': 0.0001,
    'nemotron-3.5-content-safety-free': 0.0001,
    'nemotron-3-ultra-550b-a55b-free': 0.0002,
  };
  return costs[modelId] || 0.01;
};

export function ChatShell({ onWatchAdClick }: { onWatchAdClick: () => void }) {
  const {
    messages,
    selectedModel,
    setSelectedModel,
    jwt,
    credits,
    agentMode,
    agentPrivateKey,
    agentAddress,
    setAgentMode,
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
  const searchParams = useSearchParams();

  interface ModelOption {
    id: string;
    name: string;
  }

  const [activeTab, setActiveTab] = useState<'human' | 'agent'>('human');
  const [promptValue, setPromptValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';
      try {
        const res = await fetch(`${backendUrl}/v1/models`);
        if (res.ok) {
          const data = await res.json() as ModelOption[];
          setModels(data);
        }
      } catch (err) {
        console.error('Failed to fetch models from backend:', err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    setMounted(true);
    const p = searchParams.get('prompt');
    if (p) {
      setPromptValue(p);
      setConsoleOpen(true);
    }
  }, [searchParams]);

  const toggleDropdown = (label: string | null) => {
    setOpenDropdown(label);
  };


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

          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto pr-1">
              <MessageList />
            </div>

            {/* Clear conversation */}
            <button
              onClick={clearChat}
              className="w-full mt-4 rounded-lg border border-border bg-surface-2/40 py-2.5 text-xs font-semibold text-text hover:border-text-muted transition-all cursor-pointer uppercase tracking-wider"
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
            Chats
          </span>
          <Terminal size={14} className="text-black" />
        </button>
      )}

      {/* 2. Main Hero Panel */}
      <div className="flex-1 flex flex-col overflow-hidden relative dot-grid">
        {/* Top Header Bar */}
        <header className="w-full flex justify-center px-4 md:px-8 py-6 z-20">
          <div className="w-full h-16 bg-[#0e0e0e] rounded-2xl flex items-center justify-between px-8 shadow-2xl">
            {/* Logo Section */}
            <a href="http://localhost:3001" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img 
                  src="/logo.png" 
                  alt="Molfi Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="text-xl font-black tracking-tighter text-white uppercase font-headline">Molfi</span>
            </a>

            {/* Action controls + Connect Wallet */}
            <div className="flex items-center gap-4">
              {/* Credits counter & Earn Credits button */}
              {mounted && (
                <div className="flex items-center gap-2 border border-border bg-surface-2/40 px-3 py-1.5 rounded-xl text-xs text-white">
                  <span>🎬 <span data-testid="credits-balance">{credits}</span> credits</span>
                  <button
                    onClick={onWatchAdClick}
                    className="text-primary hover:text-primary/80 transition-all font-bold cursor-pointer ml-1"
                  >
                    Earn Credits
                  </button>
                </div>
              )}

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
              {mounted && (
                <div data-testid="wallet-pill">
                  <ConnectButton />
                </div>
              )}
            </div>
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
              onClick={() => {
                setActiveTab('human');
                setAgentMode(false);
              }}
              className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                activeTab === 'human'
                  ? 'bg-primary text-black font-black primary-glow'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              I'M A HUMAN
            </button>
            <button
              data-testid="agent-mode-toggle"
              onClick={() => {
                setActiveTab('agent');
                setAgentMode(true);
              }}
              className={`px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                activeTab === 'agent'
                  ? 'bg-primary text-black font-black primary-glow'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              I'M AN AGENT
            </button>
          </div>

          {/* Agent Address display for E2E tests */}
          {activeTab === 'agent' && agentAddress && (
            <div data-testid="agent-address-display" className="text-xs font-mono text-primary mb-8 bg-[#14141a]/40 border border-border/60 px-4 py-2 rounded-xl">
              Agent Wallet: {agentAddress}
            </div>
          )}

          {/* Animated AI Input Console Bar */}
          <AI_Prompt
            value={promptValue}
            onChange={setPromptValue}
            onSend={() => handleRequestClick()}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            disabled={loading}
            placeholder={
              activeTab === 'human'
                ? "Ask Molfi — Describe the task for your agents..."
                : "Ask Molfi — Enter programmatic prompt payload..."
            }
            models={models}
            cost={getModelCost(selectedModel)}
            className="w-full max-w-3xl"
          />

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

      {/* Bottom Right Log Button */}
      <button
        onClick={() => setIsLogModalOpen(true)}
        className="fixed bottom-6 right-6 bg-[#14141a]/90 hover:bg-[#1c1c24] border border-border text-white px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-2xl hover:brightness-110 active:scale-95 transition-all cursor-pointer z-40"
      >
        <Terminal size={14} className="text-primary animate-pulse" />
        LOGS & TELEMETRY
      </button>

      {/* Bottom Sheet Logs Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setIsLogModalOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-4xl bg-zinc-950 border-t border-border rounded-t-3xl p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-mono text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  MOLFI TELEMETRY LOGS & SETTINGS
                </span>
                <button
                  onClick={() => setIsLogModalOpen(false)}
                  className="text-text-muted hover:text-white cursor-pointer text-xs font-bold font-mono px-2 py-1 bg-white/5 rounded"
                >
                  ✕ CLOSE
                </button>
              </div>

              {/* Content Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 pr-1 pb-4 scrollbar-thin">
                {/* Payment Telemetry inspector */}
                <div className="bg-surface-2/40 border border-border p-5 rounded-xl flex flex-col h-[380px]">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-3 border-b border-border/40 pb-1">
                    x402 Telemetry log
                  </span>
                  <div className="flex-1 overflow-y-auto text-xs pr-1">
                    <PaymentInspector />
                  </div>
                </div>

                {/* Agent keys */}
                <div className="bg-surface-2/40 border border-border p-5 rounded-xl flex flex-col h-[380px] justify-between">
                  <div className="flex-1 overflow-y-auto">
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-3 border-b border-border/40 pb-1">
                      Agent key authorization
                    </span>
                    <AgentModePanel />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
