'use client';

import React, { Suspense } from 'react';
import { ChatShell } from '../../components/ChatShell';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Chat...</div>}>
      <ChatShell />
    </Suspense>
  );
}

