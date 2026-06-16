'use client';

import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';

export function Composer({ onWatchAdClick }: { onWatchAdClick: () => void }) {
  const { messages, selectedModel, jwt, credits, addMessage, updateMessageContent, updateMessageMetadata, setCredits } = useChatStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setError(null);
    const userPrompt = input.trim();
    setInput('');
    setLoading(true);

    // 1. Add User Message to Store
    addMessage({ role: 'user', content: userPrompt });

    // 2. Add empty Assistant Message to Store to begin streaming
    const assistantMsgId = addMessage({ role: 'assistant', content: '' });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

    try {
      // Structure chat context
      const chatMessages = messages
        .map((m) => ({ role: m.role, content: m.content }))
        .concat({ role: 'user', content: userPrompt });

      // Determine authorization headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (jwt) {
        headers['Authorization'] = `Bearer ${jwt}`;
      }

      const res = await fetch(`${backendUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: chatMessages,
        }),
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
                // Settle final transaction metadata
                updateMessageMetadata(assistantMsgId, {
                  paidVia: parsed.molfiMetadata.paidVia,
                  txHash: parsed.molfiMetadata.txHash,
                });
              } else if (parsed.choices?.[0]?.delta?.content) {
                // Update assistant content chunk
                updateMessageContent(assistantMsgId, parsed.choices[0].delta.content);
              }
            } catch (err) {
              // Ignore metadata framing JSON parse errors
            }
          }
        }
      }

      // Refresh credits balance in store after message
      if (jwt) {
        const balRes = await fetch(`${backendUrl}/v1/credits/balance`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (balRes.ok) {
          const balData = await balRes.json() as { credits: number };
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

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg via-bg to-transparent">
      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="mb-2 text-xs text-accent rounded-lg border border-accent/20 bg-accent/5 p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-end gap-2 rounded-xl border border-border bg-surface p-2 shadow-lg focus-within:border-accent transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={jwt ? "Type your prompt here..." : "Watch an ad to get credits, or connect wallet."}
            rows={1}
            disabled={loading || !jwt}
            className="flex-1 max-h-40 overflow-y-auto bg-transparent border-0 outline-none text-sm text-text px-2 py-1.5 resize-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />

          <div className="flex items-center gap-2">
            {/* Credits Counter & Ad Button */}
            <div className="flex items-center gap-1.5 text-xs border border-border bg-surface-2 rounded-lg px-2.5 py-1.5">
              <span className="text-text-muted">🎬 {credits} credits</span>
              {credits < 2 && (
                <button
                  type="button"
                  onClick={onWatchAdClick}
                  className="text-accent font-semibold hover:text-accent-2 transition-all ml-1"
                >
                  + Add Free
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !input.trim() || !jwt}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
