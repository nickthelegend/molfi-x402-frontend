import { create } from 'zustand';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  paidVia?: 'x402' | 'credits';
  txHash?: string;
}

export interface InspectorData {
  requestUrl?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  decodedXPayment?: any;
  decodedXPaymentResponse?: any;
}

interface ChatState {
  messages: Message[];
  credits: number;
  jwt: string | null;
  selectedModel: string;
  agentMode: boolean;
  agentPrivateKey: string | null;
  agentAddress: string | null;
  agentSpendLimit: number;
  agentSpent: number;
  inspectorData: InspectorData | null;
  addMessage: (msg: Omit<Message, 'id'>) => string;
  updateMessageContent: (id: string, chunk: string) => void;
  updateMessageMetadata: (id: string, metadata: Partial<Message>) => void;
  setCredits: (credits: number) => void;
  setJwt: (jwt: string | null) => void;
  setSelectedModel: (model: string) => void;
  setAgentMode: (mode: boolean) => void;
  initializeAgentWallet: () => { address: string; privateKey: string };
  incrementAgentSpent: (amount: number) => void;
  setAgentSpendLimit: (limit: number) => void;
  setInspectorData: (data: InspectorData | null) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  credits: 0,
  jwt: typeof window !== 'undefined' ? localStorage.getItem('molfi_jwt') : null,
  selectedModel: 'llama-3.3-70b',
  agentMode: false,
  agentPrivateKey: typeof window !== 'undefined' ? localStorage.getItem('molfi_agent_pkey') : null,
  agentAddress: typeof window !== 'undefined' ? localStorage.getItem('molfi_agent_address') : null,
  agentSpendLimit: 1.00,
  agentSpent: 0.00,
  inspectorData: null,

  addMessage: (msg) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      messages: [...state.messages, { ...msg, id }],
    }));
    return id;
  },

  updateMessageContent: (id, chunk) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      ),
    }));
  },

  updateMessageMetadata: (id, metadata) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...metadata } : m)),
    }));
  },

  setCredits: (credits) => set({ credits }),

  setJwt: (jwt) => {
    if (jwt) {
      localStorage.setItem('molfi_jwt', jwt);
    } else {
      localStorage.removeItem('molfi_jwt');
    }
    set({ jwt });
  },

  setSelectedModel: (selectedModel) => set({ selectedModel }),
  
  setAgentMode: (agentMode) => {
    if (agentMode && !get().agentPrivateKey) {
      get().initializeAgentWallet();
    }
    set({ agentMode });
  },

  initializeAgentWallet: () => {
    const pkey = generatePrivateKey();
    const account = privateKeyToAccount(pkey);
    localStorage.setItem('molfi_agent_pkey', pkey);
    localStorage.setItem('molfi_agent_address', account.address);
    set({ agentPrivateKey: pkey, agentAddress: account.address, agentSpent: 0.00 });
    return { address: account.address, privateKey: pkey };
  },

  incrementAgentSpent: (amount) => set((state) => ({ agentSpent: state.agentSpent + amount })),
  
  setAgentSpendLimit: (agentSpendLimit) => set({ agentSpendLimit }),

  setInspectorData: (inspectorData) => set({ inspectorData }),

  clearChat: () => set({ messages: [], inspectorData: null }),
}));
