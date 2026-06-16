'use client';

import React, { Suspense } from 'react';
import { AnimatedAIChat } from '../components/ui/animated-ai-chat';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white font-mono uppercase tracking-widest">Loading Molfi Chat...</div>}>
      <AnimatedAIChat />
    </Suspense>
  );
}
