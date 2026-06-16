import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdViewer } from '../../components/AdViewer';
import { useChatStore } from '../../store/chatStore';

// Mock chat store actions
vi.mock('../../store/chatStore', () => {
  const mockStore = {
    setJwt: vi.fn(),
    setCredits: vi.fn(),
  };
  return {
    useChatStore: () => mockStore,
  };
});

// Mock TxModalProvider to prevent "must be used within a TxModalProvider" errors
const mockShowTxModal = vi.fn();
vi.mock('../../components/tx/TxModalProvider', () => {
  return {
    useTxModal: () => ({
      show: mockShowTxModal,
      close: vi.fn(),
      txs: [],
    }),
  };
});

// Mock AdHost component
vi.mock('../../components/ads/AdHost', () => {
  return {
    AdHost: ({ onCredit }: { onCredit: (jwt: string, txHash?: string) => void }) => (
      <div>
        <button onClick={() => onCredit('mock-jwt-token-xyz', 'mock-tx-hash-123')}>
          Mock Claim Ad
        </button>
      </div>
    ),
  };
});

describe('AdViewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AdViewer isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders ad header and host when open', () => {
    render(<AdViewer isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Sponsor Ad/i)).toBeInTheDocument();
    expect(screen.getByText(/Verify Attention/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mock Claim Ad/i })).toBeInTheDocument();
  });

  it('submits claim request and updates chat store & tx modal', async () => {
    const mockOnClose = vi.fn();

    render(<AdViewer isOpen={true} onClose={mockOnClose} />);

    const claimButton = screen.getByRole('button', { name: /Mock Claim Ad/i });
    fireEvent.click(claimButton);

    // Store is updated
    const store = useChatStore();
    expect(store.setJwt).toHaveBeenCalledWith('mock-jwt-token-xyz');
    expect(store.setCredits).toHaveBeenCalledWith(5);
    
    // Tx Modal is called
    expect(mockShowTxModal).toHaveBeenCalledWith({
      hash: 'mock-tx-hash-123',
      status: 'pending',
      network: 'avalanche-fuji',
      label: 'x402 attention settlement · impression payout',
    });

    // Modal is closed
    expect(mockOnClose).toHaveBeenCalled();
  });
});
