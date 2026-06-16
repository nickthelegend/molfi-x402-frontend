'use client';

import React, { useState, Suspense } from 'react';
import { ChatShell } from '../../components/ChatShell';
import { AdViewer } from '../../components/AdViewer';

function ChatContent({ onWatchAdClick }: { onWatchAdClick: () => void }) {
  return <ChatShell onWatchAdClick={onWatchAdClick} />;
}

export default function ChatPage() {
  const [isAdOpen, setIsAdOpen] = useState(false);

  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Chat...</div>}>
      <ChatContent onWatchAdClick={() => setIsAdOpen(true)} />
      <AdViewer isOpen={isAdOpen} onClose={() => setIsAdOpen(false)} />
    </Suspense>
  );
}

