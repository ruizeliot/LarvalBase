'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PinDisplay from '@/components/lobby/PinDisplay';

function LobbyContent() {
  const searchParams = useSearchParams();
  const pin = searchParams.get('pin') ?? '000000';
  const isHost = searchParams.get('host') === 'true';

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white">
      <div className="w-full max-w-[400px] px-5 pt-5 pb-32">
        <PinDisplay pin={pin} />
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense>
      <LobbyContent />
    </Suspense>
  );
}
