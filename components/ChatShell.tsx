'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWalletClient, useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useChatStore } from '../store/chatStore';
import { requestCompletionsWithPay } from '../lib/x402-client';
import { useTxModal } from './tx/TxModalProvider';
import { ModelPicker } from './ModelPicker';
import { MessageBubble } from './MessageBubble';
import { AgentModePanel } from './AgentModePanel';
import { PaymentInspector } from './PaymentInspector';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AdViewer } from './AdViewer';
import { formatUnits } from 'viem';
import marketAbi from '../lib/abi/MolfiAdMarket.json';
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
  ArrowUpRight,
  Plus,
  Trash2
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

export function ChatShell() {
  const {
    messages,
    selectedModel,
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
    sessions,
    currentChatId,
    isLoadingSessions,
    loadSessions,
    selectSession,
    startNewSession,
    deleteSession,
  } = useChatStore();

  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { show: showTxModal } = useTxModal();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'human' | 'agent'>('human');
  const [promptValue, setPromptValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const pendingPromptRef = useRef<string>('');

  const marketAddress = process.env.NEXT_PUBLIC_AD_MARKET_ADDRESS as `0x${string}`;

  // Read pending withdraw balance for the connected user
  const { data: pendingBalance, refetch: refetchPendingBalance } = useReadContract({
    address: marketAddress,
    abi: marketAbi.abi,
    functionName: 'pendingWithdraw',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const { writeContractAsync, isPending: isWithdrawPending } = useWriteContract();

  const handleWithdrawUSDC = async () => {
    if (!address) return;
    try {
      const txHash = await writeContractAsync({
        address: marketAddress,
        abi: marketAbi.abi,
        functionName: 'userWithdraw',
      });
      showTxModal({
        hash: txHash,
        status: 'pending',
        network: 'avalanche-fuji',
        label: 'USDC Withdraw',
      });
    } catch (err: any) {
      console.error('Failed to withdraw USDC:', err);
      alert(`Withdraw failed: ${err.message}`);
    }
  };

  // Poll pending withdraw balance every 10s if wallet connected
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      refetchPendingBalance();
    }, 10000);
    return () => clearInterval(interval);
  }, [address, refetchPendingBalance]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions from IndexedDB on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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


  const handleSendPrompt = async (promptText: string, customJwt?: string) => {
    if (!promptText.trim() || loading) return;

    setError(null);
    setLoading(true);

    addMessage({ role: 'user', content: promptText });
    const assistantMsgId = addMessage({ role: 'assistant', content: '' });

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
        jwt: customJwt || jwt,
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
    if (!promptValue.trim() || loading) return;

    if (activeTab === 'human') {
      pendingPromptRef.current = promptValue;
      setIsAdOpen(true);
    } else {
      if (!address && !agentPrivateKey) {
        alert("Please connect your wallet or set up an Agent Key in the settings first to proceed under Agent mode.");
        setIsLogModalOpen(true);
        return;
      }
      handleSendPrompt(promptValue);
      setPromptValue('');
    }
  };

  const handleGearClick = () => {
    setIsLogModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-text select-none relative font-sans">
      {/* 1. Left Chat History Drawer */}
      {consoleOpen && (
        <div className="flex w-[320px] flex-col bg-[#0b0b0d] border-r border-border p-4 transition-all duration-300 z-30">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <span className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <MessageCircle size={14} className="text-primary" />
              CHATS
            </span>
            <button
              onClick={() => setConsoleOpen(false)}
              className="text-text-muted hover:text-white cursor-pointer text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => startNewSession()}
            className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface-2/20 py-3 text-xs font-bold uppercase tracking-wider text-white hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
          >
            <Plus size={14} className="text-text-muted group-hover:text-primary transition-colors" />
            New Chat
          </button>

          {/* Chats list */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin">
            {isLoadingSessions ? (
              <div className="flex flex-col gap-2 p-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 w-full bg-surface-2/10 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <MessageCircle size={24} className="text-text-dim mb-2 opacity-40 animate-pulse" />
                <span className="text-[10px] text-text-muted uppercase tracking-wider">No chats yet</span>
              </div>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === currentChatId;
                const formattedTime = new Date(session.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={session.id}
                    className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 border-primary/40 text-white shadow-[0_0_15px_rgba(200,153,255,0.05)] font-bold'
                        : 'bg-surface-2/20 border-border/40 text-text-muted hover:border-border hover:bg-surface-2/40 hover:text-white'
                    }`}
                    onClick={() => selectSession(session.id)}
                  >
                    <div className="flex flex-col gap-1 overflow-hidden pr-6">
                      <span className="text-xs truncate">
                        {session.title || 'Untitled Chat'}
                      </span>
                      <span className="text-[9px] text-text-dim opacity-70 font-mono">
                        {formattedTime}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-accent p-1.5 rounded-lg bg-surface-2/80 border border-border/40 hover:border-accent/40 absolute right-2 top-1/2 -translate-y-1/2 transition-all cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* On-Chain Earnings Section */}
          <div className="border-t border-border pt-4 mt-4 bg-surface-2/10 p-3.5 rounded-xl border border-border/60">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2 border-b border-border/40 pb-1">
              On-Chain Cashflow
            </span>
            {address ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted font-medium">Earned Balance:</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {formatUnits(pendingBalance as bigint || 0n, 6)} USDC
                  </span>
                </div>
                <button
                  onClick={handleWithdrawUSDC}
                  disabled={!pendingBalance || (pendingBalance as bigint) === 0n || isWithdrawPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-black py-2.5 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 cursor-pointer primary-glow"
                >
                  {isWithdrawPending ? 'Processing...' : 'Withdraw USDC'}
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-text-dim block text-center py-2">
                Connect wallet to view/withdraw USDC earnings
              </span>
            )}
          </div>
        </div>
      )}

      {/* Vertical Collapsed Chats Trigger */}
      {!consoleOpen && (
        <button
          onClick={() => setConsoleOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 bg-primary text-black border-r border-y border-outline-variant/20 rounded-r-2xl py-6 px-3 flex flex-col items-center gap-3 cursor-pointer shadow-2xl hover:brightness-110 transition-all z-40"
        >
          <span className="text-[9px] font-black uppercase tracking-[0.25em] select-none text-center" style={{ writingMode: 'vertical-rl' }}>
            Chats
          </span>
          <MessageCircle size={14} className="text-black" />
        </button>
      )}

      {/* 2. Main Chat Panel */}
      <div className="flex-1 flex flex-col overflow-hidden relative dot-grid">
        {/* Top Header Bar */}
        <header className="w-full flex justify-center px-4 md:px-8 py-4 z-20 flex-shrink-0">
          <div className="w-full h-16 bg-[#0e0e0e]/85 backdrop-blur border border-border/40 rounded-2xl flex items-center justify-between px-8 shadow-2xl">
            {/* Logo Section */}
            <a href="https://molfi.fun" className="flex items-center gap-3 group">
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


              <button
                onClick={() => setConsoleOpen(!consoleOpen)}
                className="text-text-muted hover:text-white cursor-pointer p-1.5 rounded hover:bg-surface-2/40 transition-all"
                title="Toggle Chat History"
              >
                <MessageCircle size={18} />
              </button>
              <button
                onClick={handleGearClick}
                className="text-text-muted hover:text-white cursor-pointer p-1.5 rounded hover:bg-surface-2/40 transition-all"
                title="Developer Logs & Settings"
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

        {/* Message Container Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full relative z-10 scrollbar-thin">
          <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-full justify-between">
            {messages.length === 0 ? (
              // Welcome Screen
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <h1
                  className="text-6xl md:text-[6.5rem] font-black tracking-[-0.04em] mb-4 font-display text-center uppercase"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #c899ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Molfi
                </h1>
                <p className="text-sm text-text-muted max-w-md mb-8">
                  A premium multi-model AI assistant powered by agentic stablecoin streams on Avalanche Fuji.
                </p>

                {/* Human / Agent Toggle Switches */}
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

                {/* Info Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mb-8 text-left">
                  <div className="rounded-2xl border border-border bg-surface-2/20 p-5 backdrop-blur-sm">
                    <div className="text-lg mb-2">🎬 <span className="font-bold text-white uppercase tracking-wider text-xs ml-1">Human Rail</span></div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Watch short sponsor advertisements in-stream to fund your query. Completely free for manual testing.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-2/20 p-5 backdrop-blur-sm">
                    <div className="text-lg mb-2">💸 <span className="font-bold text-white uppercase tracking-wider text-xs ml-1">Agent Rail</span></div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Pay exact micro-cents autonomously in Fuji USDC per prompt. Connect a programmatic agent key for machine-to-machine tasks.
                    </p>
                  </div>
                </div>

                {/* Trending Operations */}
                <div className="flex flex-wrap items-center justify-center gap-3">
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
              </div>
            ) : (
              // Chat Messages list
              <div className="flex-1 flex flex-col gap-6 pb-24">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-20 flex-shrink-0">
          {/* Agent Address display for E2E tests */}
          {activeTab === 'agent' && agentAddress && (
            <div data-testid="agent-address-display" className="text-xs font-mono text-primary mb-3 bg-[#14141a]/40 border border-border/60 px-4 py-2 rounded-xl text-center">
              Agent Wallet: {agentAddress}
            </div>
          )}

          {/* Mode Switch Indicator (visible when messages exist to let users toggle/see status) */}
          {messages.length > 0 && (
            <div className="flex justify-center mb-3">
              <div className="flex items-center bg-[#14141a]/80 border border-border/60 p-1 rounded-xl text-[9px]">
                <button
                  onClick={() => {
                    setActiveTab('human');
                    setAgentMode(false);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'human' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
                  }`}
                >
                  Human
                </button>
                <button
                  data-testid="agent-mode-toggle"
                  onClick={() => {
                    setActiveTab('agent');
                    setAgentMode(true);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'agent' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
                  }`}
                >
                  Agent
                </button>
              </div>
            </div>
          )}

          {/* Input Console Bar */}
          <div className="w-full bg-[#14141a]/85 backdrop-blur-md border border-border rounded-2xl p-3 flex items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] focus-within:border-primary transition-all">
            <span className="text-on-surface-variant font-mono text-sm ml-2">&gt;_</span>
            <textarea
              placeholder={
                activeTab === 'human'
                  ? "Ask Molfi — Describe the task for your agents..."
                  : "Ask Molfi — Enter programmatic prompt payload..."
              }
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="bg-transparent border-none outline-none text-white flex-1 text-sm placeholder:text-text-dim resize-none h-6 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleRequestClick();
                }
              }}
            />
            
            {/* Model Selector directly in the chat bar */}
            <div className="w-40 flex-shrink-0">
              <ModelPicker />
            </div>

            {/* Cost Indicator */}
            <div className="flex items-center gap-1 bg-[#0b0b0d] border border-border px-3 py-2 rounded-xl font-mono text-xs text-white">
              <span className="text-text-muted">$</span>
              <span className="font-bold">{getModelCost(selectedModel).toFixed(3)}</span>
            </div>

            {/* Request Trigger */}
            <button
              data-testid="send-message-button"
              onClick={handleRequestClick}
              disabled={loading}
              className="bg-primary text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin h-3 w-3 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <Send size={12} className="text-black" />
              )}
              REQUEST
            </button>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="w-full mt-3 text-xs text-accent rounded-xl border border-accent/25 bg-accent/5 p-3 text-center">
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

      <AdViewer
        isOpen={isAdOpen}
        onClose={() => setIsAdOpen(false)}
        onClaimed={(claimJson) => {
          if (pendingPromptRef.current) {
            handleSendPrompt(pendingPromptRef.current, claimJson.jwt);
            pendingPromptRef.current = '';
            setPromptValue('');
          }
        }}
      />
    </div>
  );
}
