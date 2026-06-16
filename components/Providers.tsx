'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, createConfig, useConnect, useAccount } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { TxModalProvider } from './tx/TxModalProvider';
import { privateKeyToAccount } from 'viem/accounts';
import { mock } from 'wagmi/connectors';

const queryClient = new QueryClient();

const staticConfig = getDefaultConfig({
  appName: 'Molfi.fun',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '9545ec19e71df974b9f298c4749f298c',
  chains: [avalancheFuji],
  ssr: true,
  transports: {
    [avalancheFuji.id]: http('https://api.avax-test.network/ext/bc/C/rpc'),
  },
});

export const config = typeof window !== 'undefined' && (window as any).__molfi_test_wallet_key
  ? createConfig({
      chains: [avalancheFuji],
      connectors: [
        mock({
          accounts: [
            privateKeyToAccount(
              ((window as any).__molfi_test_wallet_key.startsWith('0x')
                ? (window as any).__molfi_test_wallet_key
                : `0x${(window as any).__molfi_test_wallet_key}`) as `0x${string}`
            ).address,
          ],
          features: { reconnect: true },
        }),
      ],
      transports: {
        [avalancheFuji.id]: http('https://api.avax-test.network/ext/bc/C/rpc'),
      },
    })
  : staticConfig;

function E2eAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__molfi_test_wallet_key && !isConnected) {
      const mockConnector = connectors.find((c) => c.id === 'mock');
      if (mockConnector) {
        connect({ connector: mockConnector });
      }
    }
  }, [connect, connectors, isConnected]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#ad46ff',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            overlayBlur: 'small',
          })}
        >
          <TxModalProvider>
            <E2eAutoConnect />
            {children}
          </TxModalProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
