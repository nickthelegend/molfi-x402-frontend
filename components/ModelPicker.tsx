'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

interface Model {
  id: string;
  name: string;
  usdcCost: number;
  creditCost: number;
  description: string;
}

export function ModelPicker() {
  const { selectedModel, setSelectedModel } = useChatStore();
  const [models, setModels] = useState<Model[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';
      try {
        const res = await fetch(`${backendUrl}/v1/models`);
        if (res.ok) {
          const data = await res.json() as Model[];
          setModels(data);
        }
      } catch (err) {
        console.error('Failed to fetch models from backend:', err);
      }
    };
    fetchModels();
  }, []);

  const activeModel = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    usdcCost: 0.001,
    creditCost: 1,
    description: 'Completions model.',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-left text-sm text-text hover:border-text-muted transition-all"
      >
        <div>
          <div className="font-semibold text-text">{activeModel.name}</div>
          <div className="text-xs text-text-muted">
            💸 {activeModel.usdcCost} USDC · 🎬 {activeModel.creditCost} credits
          </div>
        </div>
        <span className="text-xs text-text-muted">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(model.id);
                setIsOpen(false);
              }}
              className={`flex w-full flex-col p-3 text-left hover:bg-surface-2 transition-all ${
                model.id === selectedModel ? 'bg-surface-2 border-l-2 border-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text">{model.name}</span>
                <span className="text-xs text-text-muted font-mono">
                  ${model.usdcCost} / {model.creditCost}c
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{model.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
