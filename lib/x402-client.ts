import { keccak256, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface X402RequestOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  walletClient?: any;
  userAddress?: string;
  jwt?: string | null;
  agentMode?: boolean;
  agentPrivateKey?: string | null;
  onPaymentCaptured?: (data: any) => void;
}

export async function requestCompletionsWithPay(options: X402RequestOptions): Promise<Response> {
  const {
    model,
    messages,
    walletClient,
    userAddress,
    jwt,
    agentMode,
    agentPrivateKey,
    onPaymentCaptured,
  } = options;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

  // 1. Initial Request (Unpaid or with credit JWT)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  let res = await fetch(`${backendUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages }),
  });

  // 2. Handle 402 Redirect
  if (res.status === 402) {
    const errorJson = await res.json();
    const accepts = errorJson.accepts?.[0];

    if (!accepts) {
      throw new Error(errorJson.error || 'Payment required but accepts payload missing.');
    }

    const { maxAmountRequired, payTo, asset, extra } = accepts;
    let signature = '';
    let fromAddress = '';
    let payloadAuthorization: any = null;

    const nonce = keccak256(stringToHex(`nonce-${Date.now()}-${Math.random()}`));
    const validAfter = 0;
    const validBefore = Math.floor(Date.now() / 1000) + 300; // 5 min expiry

    const domain = {
      name: extra?.name || 'USD Coin',
      version: extra?.version || '2',
      chainId: 43113,
      verifyingContract: asset as `0x${string}`,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    // 3. Sign EIP-3009
    const testWalletKey = typeof window !== 'undefined' && (window as any).__molfi_test_wallet_key;
    if (testWalletKey) {
      const key = testWalletKey.startsWith('0x') ? testWalletKey : `0x${testWalletKey}`;
      const testAccount = privateKeyToAccount(key);
      fromAddress = testAccount.address;

      signature = await testAccount.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: fromAddress as `0x${string}`,
          to: payTo as `0x${string}`,
          value: BigInt(maxAmountRequired),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce,
        },
      });

      payloadAuthorization = {
        from: fromAddress,
        to: payTo,
        value: maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
      };
    } else if (agentMode && agentPrivateKey) {
      const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);
      fromAddress = agentAccount.address;

      signature = await agentAccount.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: fromAddress as `0x${string}`,
          to: payTo as `0x${string}`,
          value: BigInt(maxAmountRequired),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce,
        },
      });

      payloadAuthorization = {
        from: fromAddress,
        to: payTo,
        value: maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
      };

    } else if (walletClient && userAddress) {
      fromAddress = userAddress;

      signature = await walletClient.signTypedData({
        account: fromAddress as `0x${string}`,
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: fromAddress as `0x${string}`,
          to: payTo as `0x${string}`,
          value: BigInt(maxAmountRequired),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce,
        },
      });

      payloadAuthorization = {
        from: fromAddress,
        to: payTo,
        value: maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
      };

    } else {
      throw new Error('Wallet connection or Agent Mode is required to perform x402 payment.');
    }

    const xPaymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: 'avalanche-fuji',
      payload: {
        signature,
        authorization: payloadAuthorization,
      },
    };

    const xPaymentBase64 = Buffer.from(JSON.stringify(xPaymentPayload)).toString('base64');

    const retryHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-PAYMENT': xPaymentBase64,
    };

    res = await fetch(`${backendUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: retryHeaders,
      body: JSON.stringify({ model, messages }),
    });

    if (onPaymentCaptured) {
      const xPaymentResponse = res.headers.get('x-payment-response');
      let decodedXPaymentResponse: any = null;
      if (xPaymentResponse) {
        try {
          decodedXPaymentResponse = JSON.parse(
            Buffer.from(xPaymentResponse, 'base64').toString('utf-8')
          );
        } catch (e) {
          // ignore
        }
      }

      onPaymentCaptured({
        requestUrl: `${backendUrl}/v1/chat/completions`,
        requestHeaders: retryHeaders,
        responseHeaders: {
          'x-payment-response': xPaymentResponse || '',
        },
        decodedXPayment: xPaymentPayload,
        decodedXPaymentResponse,
      });
    }
  }

  return res;
}
