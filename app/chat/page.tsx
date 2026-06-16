'use client';

import React, { useState } from 'react';
import { ChatShell } from '../../components/ChatShell';
import { AdViewer } from '../../components/AdViewer';

export default function ChatPage() {
  const [isAdOpen, setIsAdOpen] = useState(false);

  return (
    <>
      <ChatShell onWatchAdClick={() => setIsAdOpen(true)} />
      <AdViewer isOpen={isAdOpen} onClose={() => setIsAdOpen(false)} />
    </>
  );
}
