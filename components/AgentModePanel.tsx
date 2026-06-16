'use client';

import React, { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { createPublicClient, http, formatUnits } from 'viem';
import { avalancheFuji } from 'wagmi/chains';

export function AgentModePanel() {
  const {
    agentMode,
    setAgentMode,
    agentAddress,
    agentSpent,
    agentSpendLimit,
    initializeAgentWallet,
  } = useChatStore();
  const [avaxBalance, setAvaxBalance] = useState('0.00');
  const [usdcBalance, setUsdcBalance] = useState('0.00');

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http('https://api.avax-test.network/ext/bc/C/rpc'),
  });

  const fetchBalances = async () => {
    if (!agentAddress) return;
    try {
      const avax = await publicClient.getBalance({ address: agentAddress as `0x${string}` });
      setAvaxBalance(parseFloat(formatUnits(avax, 18)).toFixed(4));

      const erc20Abi = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
        },
      ] as const;

      const usdcAddress =
        process.env.NEXT_PUBLIC_FUJI_USDC_ADDRESS || '0x5425890298aed601595a70AB815c96711a31Bc65';
      const usdc = await publicClient.readContract({
        address: usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [agentAddress as `0x${string}`],
      });
      setUsdcBalance(parseFloat(formatUnits(usdc, 6)).toFixed(2));
    } catch (e) {
      // ignore balance read errors if RPC stalls
    }
  };

  useEffect(() => {
    if (agentAddress) {
      fetchBalances();
      const interval = setInterval(fetchBalances, 8000);
      return () => clearInterval(interval);
    }
  }, [agentAddress]);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text">⚡ Agent Mode</span>
        <button
          onClick={() => setAgentMode(!agentMode)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
            agentMode ? 'bg-accent' : 'bg-border'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              agentMode ? 'translate-x-4.5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {agentAddress && (
        <div className="flex flex-col gap-1.5 text-[10px] text-text-muted mt-2 border-t border-border pt-2 font-mono">
          <div className="flex items-center justify-between">
            <span>Agent Wallet:</span>
            <span className="text-text select-all" title={agentAddress}>
              {agentAddress.slice(0, 6)}...{agentAddress.slice(-4)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Balances:</span>
            <span className="text-text">
              {avaxBalance} AVAX · {usdcBalance} USDC
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/40">
            <span>Session Spent:</span>
            <span className="text-accent font-semibold">
              {agentSpent.toFixed(3)} / {agentSpendLimit.toFixed(2)} USDC
            </span>
          </div>

          {agentMode && (
            <div className="mt-2 text-[9px] text-accent font-semibold text-center animate-pulse">
              ⚡ Silent Auto-paying Active
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-1 pt-1">
            <button
              onClick={initializeAgentWallet}
              className="rounded bg-bg border border-border py-1 text-[8px] text-text hover:border-text-muted transition-all cursor-pointer"
            >
              Rotate Key
            </button>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-bg border border-border py-1 text-[8px] text-text hover:border-text-muted transition-all text-center"
            >
              Fund USDC
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
