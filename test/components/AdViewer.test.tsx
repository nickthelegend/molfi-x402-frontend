import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('AdViewer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Clear global fast-track variables
    if (typeof window !== 'undefined') {
      delete (window as any).__molfi_test_skip_ad;
    }
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AdViewer isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders ad and displays countdown when open', () => {
    render(<AdViewer isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Sponsor Ad/i)).toBeInTheDocument();
    expect(screen.getByText(/Skip in 15s/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Watch Ad/i })).toBeDisabled();
  });

  it('enables claim button when countdown finishes (15s)', () => {
    render(<AdViewer isOpen={true} onClose={() => {}} />);

    // Fast forward 15 seconds
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.getByText(/Ready to Claim/i)).toBeInTheDocument();
    const claimButton = screen.getByRole('button', { name: /Claim 5 Credits/i });
    expect(claimButton).toBeEnabled();
  });

  it('fast-tracks completion when __molfi_test_skip_ad is set', () => {
    if (typeof window !== 'undefined') {
      (window as any).__molfi_test_skip_ad = true;
    }

    render(<AdViewer isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Ready to Claim/i)).toBeInTheDocument();
    const claimButton = screen.getByRole('button', { name: /Claim 5 Credits/i });
    expect(claimButton).toBeEnabled();
  });

  it('submits claim request to backend and updates chat store', async () => {
    const mockOnClose = vi.fn();
    const mockResponse = { jwt: 'mock-jwt-token-xyz', credits: 15 };

    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );
    global.fetch = mockFetch;

    render(<AdViewer isOpen={true} onClose={mockOnClose} />);

    // Advance timer to complete watch
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    const claimButton = screen.getByRole('button', { name: /Claim 5 Credits/i });
    await act(async () => {
      fireEvent.click(claimButton);
    });

    // Check fetch args (must claim 15000ms duration)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/ads/claim'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"watchedMs":15000'),
      })
    );

    // Store is updated and modal closed
    const store = useChatStore();
    expect(store.setJwt).toHaveBeenCalledWith(mockResponse.jwt);
    expect(store.setCredits).toHaveBeenCalledWith(mockResponse.credits);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
