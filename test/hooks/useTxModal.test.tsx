import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TxModalProvider, useTxModal } from '../../components/tx/TxModalProvider';

const { mockGetTransactionReceipt } = vi.hoisted(() => ({
  mockGetTransactionReceipt: vi.fn(),
}));

// Mock viem to intercept createPublicClient
vi.mock('viem', async (importOriginal) => {
  const original = await importOriginal<typeof import('viem')>();
  return {
    ...original,
    createPublicClient: () => ({
      getTransactionReceipt: mockGetTransactionReceipt,
    }),
  };
});

// A dummy component to access useTxModal hook and test its state
function TestComponent({ txHash }: { txHash: string }) {
  const { txs, show, close } = useTxModal();

  return (
    <div>
      <div data-testid="tx-count">{txs.length}</div>
      {txs.map((tx) => (
        <div key={tx.hash} data-testid={`tx-${tx.hash}`}>
          <span data-testid="status">{tx.status}</span>
          <span data-testid="reason">{tx.revertReason || ''}</span>
        </div>
      ))}
      <button
        onClick={() =>
          show({
            hash: txHash,
            network: 'avalanche-fuji',
            label: 'Test transaction',
          })
        }
      >
        Add Tx
      </button>
      <button onClick={() => close(txHash)}>Close Tx</button>
    </div>
  );
}

describe('useTxModal hook and TxModalProvider polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add pending transaction and transition to success status on receipt confirmation', async () => {
    const txHash = '0x1111111111111111111111111111111111111111';
    
    // Receipt mock returns success status
    mockGetTransactionReceipt.mockResolvedValue({
      status: 'success',
      blockNumber: 12345n,
    });

    render(
      <TxModalProvider>
        <TestComponent txHash={txHash} />
      </TxModalProvider>
    );

    // Initial state
    expect(screen.getByTestId('tx-count').textContent).toBe('0');

    // Add transaction
    const addButton = screen.getByRole('button', { name: /Add Tx/i });
    act(() => {
      addButton.click();
    });

    expect(screen.getByTestId('tx-count').textContent).toBe('1');
    expect(screen.getByTestId('status').textContent).toBe('pending');

    // Advance vitest timers by 2500ms to trigger polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    // Verify status updated to success
    expect(screen.getByTestId('status').textContent).toBe('success');
    expect(mockGetTransactionReceipt).toHaveBeenCalledWith({ hash: txHash });
  });

  it('should transition to reverted status and show reason on transaction revert', async () => {
    const txHash = '0x2222222222222222222222222222222222222222';
    
    // Receipt mock returns reverted status
    mockGetTransactionReceipt.mockResolvedValue({
      status: 'reverted',
      blockNumber: 12345n,
    });

    render(
      <TxModalProvider>
        <TestComponent txHash={txHash} />
      </TxModalProvider>
    );

    const addButton = screen.getByRole('button', { name: /Add Tx/i });
    act(() => {
      addButton.click();
    });

    expect(screen.getByTestId('status').textContent).toBe('pending');

    // Advance vitest timers by 2500ms to trigger polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    // Verify status updated to reverted and contains message
    expect(screen.getByTestId('status').textContent).toBe('reverted');
    expect(screen.getByTestId('reason').textContent).toBe('Transaction execution reverted');
  });
});
