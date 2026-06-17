import { create } from 'zustand';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { ChatSession, getChats, getChat, saveChat, deleteChat } from '../lib/db';

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
  sessions: ChatSession[];
  currentChatId: string | null;
  isLoadingSessions: boolean;

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

  loadSessions: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  startNewSession: () => void;
  deleteSession: (id: string) => Promise<void>;
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
  sessions: [],
  currentChatId: null,
  isLoadingSessions: false,

  loadSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const chats = await getChats();
      set({ sessions: chats });
      if (!get().currentChatId && chats.length > 0) {
        set({
          currentChatId: chats[0].id,
          messages: chats[0].messages,
        });
      } else if (!get().currentChatId) {
        get().startNewSession();
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  selectSession: async (id) => {
    try {
      const chat = await getChat(id);
      if (chat) {
        set({
          currentChatId: chat.id,
          messages: chat.messages,
        });
      }
    } catch (err) {
      console.error('Failed to load chat session:', err);
    }
  },

  startNewSession: () => {
    const newId = Math.random().toString(36).substring(7);
    set({
      currentChatId: newId,
      messages: [],
    });
  },

  deleteSession: async (id) => {
    try {
      await deleteChat(id);
      const remainingSessions = get().sessions.filter((s) => s.id !== id);
      set({ sessions: remainingSessions });
      if (get().currentChatId === id) {
        if (remainingSessions.length > 0) {
          const first = remainingSessions[0];
          set({
            currentChatId: first.id,
            messages: first.messages,
          });
        } else {
          get().startNewSession();
        }
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  },

  addMessage: (msg) => {
    const id = Math.random().toString(36).substring(7);
    let chatId = get().currentChatId;
    if (!chatId) {
      chatId = Math.random().toString(36).substring(7);
      set({ currentChatId: chatId });
    }

    set((state) => {
      const newMsgs = [...state.messages, { ...msg, id }];
      
      let title = '';
      const existingSession = state.sessions.find(s => s.id === chatId);
      if (existingSession) {
        title = existingSession.title;
      } else {
        if (msg.role === 'user') {
          title = msg.content.trim().substring(0, 35);
          if (msg.content.trim().length > 35) title += '...';
        } else {
          title = 'New Chat';
        }
      }

      const session: ChatSession = {
        id: chatId!,
        title: title || 'New Chat',
        createdAt: existingSession ? existingSession.createdAt : Date.now(),
        updatedAt: Date.now(),
        messages: newMsgs,
      };

      saveChat(session)
        .then(() => get().loadSessions())
        .catch((err) => console.error('Failed to save chat to IndexedDB:', err));

      return { messages: newMsgs };
    });
    return id;
  },

  updateMessageContent: (id, chunk) => {
    set((state) => {
      const newMsgs = state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      );

      const chatId = state.currentChatId;
      if (chatId) {
        const existingSession = state.sessions.find((s) => s.id === chatId);
        const session: ChatSession = {
          id: chatId,
          title: existingSession ? existingSession.title : 'New Chat',
          createdAt: existingSession ? existingSession.createdAt : Date.now(),
          updatedAt: Date.now(),
          messages: newMsgs,
        };

        saveChat(session)
          .then(() => get().loadSessions())
          .catch((err) => console.error('Failed to save chat to IndexedDB:', err));
      }

      return { messages: newMsgs };
    });
  },

  updateMessageMetadata: (id, metadata) => {
    set((state) => {
      const newMsgs = state.messages.map((m) => (m.id === id ? { ...m, ...metadata } : m));

      const chatId = state.currentChatId;
      if (chatId) {
        const existingSession = state.sessions.find((s) => s.id === chatId);
        const session: ChatSession = {
          id: chatId,
          title: existingSession ? existingSession.title : 'New Chat',
          createdAt: existingSession ? existingSession.createdAt : Date.now(),
          updatedAt: Date.now(),
          messages: newMsgs,
        };

        saveChat(session)
          .then(() => get().loadSessions())
          .catch((err) => console.error('Failed to save chat to IndexedDB:', err));
      }

      return { messages: newMsgs };
    });
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

  clearChat: () => {
    const chatId = get().currentChatId;
    if (chatId) {
      deleteChat(chatId)
        .then(() => get().loadSessions())
        .catch((err) => console.error('Failed to delete chat:', err));
    }
    set({ messages: [], inspectorData: null });
  },
}));
