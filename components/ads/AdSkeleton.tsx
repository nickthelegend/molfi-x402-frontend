import React from 'react';

export function AdSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl">
      <div className="aspect-video w-full rounded-lg bg-zinc-900 border border-zinc-800" />
      <div className="mt-3 flex justify-between">
        <div className="h-3 w-24 rounded bg-zinc-900" />
        <div className="h-3 w-10 rounded bg-zinc-900" />
      </div>
    </div>
  );
}
