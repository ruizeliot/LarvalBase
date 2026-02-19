'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player, LobbyConfigData } from '@/lib/lobby-types';

const SIMULATED_PLAYERS: Omit<Player, 'isHost' | 'isReady' | 'isNew'>[] = [
  { id: '2', name: 'Marie', emoji: '🎸', gradient: 'from-purple-500 to-pink-500', level: 8 },
  { id: '3', name: 'Lucas', emoji: '🎧', gradient: 'from-cyan-500 to-blue-500', level: 15 },
  { id: '4', name: 'Chloé', emoji: '🎹', gradient: 'from-emerald-500 to-lime-500', level: 6 },
  { id: '5', name: 'Théo', emoji: '🥁', gradient: 'from-rose-500 to-orange-400', level: 3 },
  { id: '6', name: 'Léa', emoji: '🎤', gradient: 'from-sky-500 to-indigo-500', level: 10 },
];

const DEFAULT_CONFIG: LobbyConfigData = {
  theme: 'Hits 2024',
  rounds: 15,
  timer: 20,
  mode: 'Buzzer',
};

const MAX_PLAYERS = 8;

/**
 * Simulates a WebSocket-connected lobby.
 * In production, this would use socket.io-client for real-time sync.
 */
export default function useLobby(pin: string, isHost: boolean) {
  const [players, setPlayers] = useState<Player[]>(() => {
    const hostPlayer: Player = {
      id: '1',
      name: isHost ? 'Vous' : 'Hôte',
      emoji: '👑',
      gradient: 'from-amber-500 to-red-500',
      level: 12,
      isHost: true,
      isReady: true,
      isNew: false,
    };

    if (!isHost) {
      const me: Player = {
        id: 'me',
        name: 'Vous',
        emoji: '🎵',
        gradient: 'from-violet-500 to-fuchsia-500',
        level: 5,
        isHost: false,
        isReady: true,
        isNew: true,
      };
      return [hostPlayer, me];
    }

    return [hostPlayer];
  });

  const [config, setConfig] = useState<LobbyConfigData>(DEFAULT_CONFIG);
  const [nextPlayerIdx, setNextPlayerIdx] = useState(0);

  useEffect(() => {
    if (nextPlayerIdx >= SIMULATED_PLAYERS.length) return;

    const delay = 3000 + Math.random() * 4000;
    const timer = setTimeout(() => {
      const simPlayer = SIMULATED_PLAYERS[nextPlayerIdx];
      const newPlayer: Player = {
        ...simPlayer,
        isHost: false,
        isReady: false,
        isNew: true,
      };

      setPlayers((prev) => {
        if (prev.length >= MAX_PLAYERS) return prev;
        return [...prev, newPlayer];
      });

      // Clear "isNew" after 3 seconds
      setTimeout(() => {
        setPlayers((prev) =>
          prev.map((p) => (p.id === simPlayer.id ? { ...p, isNew: false, isReady: true } : p))
        );
      }, 3000);

      setNextPlayerIdx((i) => i + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [nextPlayerIdx]);

  const updateConfig = useCallback((newConfig: LobbyConfigData) => {
    setConfig(newConfig);
  }, []);

  return {
    pin,
    players,
    config,
    isHost,
    maxPlayers: MAX_PLAYERS,
    updateConfig,
  };
}
