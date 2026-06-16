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
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-[#0b0b0d] px-3.5 py-2 text-left text-xs text-text hover:brightness-110 transition-all select-none"
      >
        <div>
          <div className="font-bold text-white tracking-wider uppercase text-[10px]">{activeModel.name}</div>
        </div>
        <span className="text-[9px] text-text-muted">▲</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-[#0b0b0d] shadow-2xl p-1 flex flex-col gap-1 w-52">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(model.id);
                setIsOpen(false);
              }}
              className={`flex w-full flex-col p-2.5 rounded-lg text-left hover:bg-white/5 transition-all ${
                model.id === selectedModel ? 'bg-accent-dim border border-accent/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider">{model.name}</span>
                <span className="text-[9px] text-primary font-mono font-bold">
                  {model.usdcCost} USDC
                </span>
              </div>
              <p className="text-[10px] text-text-muted mt-0.5 font-medium leading-tight">{model.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

