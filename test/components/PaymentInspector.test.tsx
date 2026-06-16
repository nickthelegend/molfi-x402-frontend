import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentInspector } from '../../components/PaymentInspector';
import { useChatStore } from '../../store/chatStore';

// Mock chat store
vi.mock('../../store/chatStore', () => {
  return {
    useChatStore: vi.fn(),
  };
});

describe('PaymentInspector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders idle status when no inspector data is set', () => {
    vi.mocked(useChatStore).mockReturnValue({
      inspectorData: null,
    } as any);

    render(<PaymentInspector />);

    expect(screen.getByText(/⚡ Payment Inspector/i)).toBeInTheDocument();
    expect(screen.getByText(/No protocol headers captured yet/i)).toBeInTheDocument();
  });

  it('renders decoded payload fields correctly when inspectorData is provided', () => {
    const mockInspectorData = {
      requestUrl: '/v1/chat/completions',
      requestHeaders: {
        'x-payment': 'mock-base64-header-payload',
      },
      decodedXPayment: {
        scheme: 'exact',
        network: 'avalanche-fuji',
        payload: {
          authorization: {
            from: '0xpayeraddress',
            to: '0xrecipientaddress',
            value: '1000',
            nonce: '0xmocknonce',
          },
        },
      },
      decodedXPaymentResponse: {
        success: true,
        payer: '0xpayeraddress',
        transaction: '0xmocktransactionhash',
      },
    };

    vi.mocked(useChatStore).mockReturnValue({
      inspectorData: mockInspectorData,
    } as any);

    render(<PaymentInspector />);

    expect(screen.getByText(/⚡ Payment Inspector/i)).toBeInTheDocument();
    
    // Check request target and raw header
    expect(screen.getByText(/POST \/v1\/chat\/completions/i)).toBeInTheDocument();
    expect(screen.getByText('mock-base64-header-payload')).toBeInTheDocument();

    // Check decoded authorization details
    expect(screen.getByText('exact')).toBeInTheDocument();
    expect(screen.getByText('avalanche-fuji')).toBeInTheDocument();
    expect(screen.getByText(/"from": "0xpayeraddress"/i)).toBeInTheDocument();
    expect(screen.getByText(/"to": "0xrecipientaddress"/i)).toBeInTheDocument();
    expect(screen.getByText(/"value": "1000"/i)).toBeInTheDocument();
    expect(screen.getByText(/"nonce": "0xmocknonce"/i)).toBeInTheDocument();

    // Check decoded response details
    expect(screen.getByText('0xpayeraddress')).toBeInTheDocument();
    expect(screen.getByText('0xmocktransactionhash')).toBeInTheDocument();
  });
});
