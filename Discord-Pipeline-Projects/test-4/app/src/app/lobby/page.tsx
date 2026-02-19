'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PinDisplay from '@/components/lobby/PinDisplay';
import LobbyConfig from '@/components/lobby/LobbyConfig';
import PlayerList from '@/components/lobby/PlayerList';
import LaunchButton from '@/components/lobby/LaunchButton';
import useLobby from '@/hooks/useLobby';

function LobbyContent() {
  const searchParams = useSearchParams();
  const pin = searchParams.get('pin') ?? '000000';
  const isHost = searchParams.get('host') === 'true';

  const lobby = useLobby(pin, isHost);

  const handleLaunch = () => {
    // TODO: Navigate to game screen when gameplay epic is built
    console.log('Launching game with', lobby.players.length, 'players');
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white">
      <div className="w-full max-w-[400px] px-5 pt-5 pb-32">
        <PinDisplay pin={lobby.pin} />
        <LobbyConfig
          config={lobby.config}
          isHost={lobby.isHost}
          onConfigChange={lobby.updateConfig}
        />
        <PlayerList players={lobby.players} maxPlayers={lobby.maxPlayers} />
      </div>
      <LaunchButton isHost={lobby.isHost} onLaunch={handleLaunch} />
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
