import { Player } from '@/lib/lobby-types';

interface PlayerListProps {
  players: Player[];
  maxPlayers: number;
}

function PlayerCard({ player }: { player: Player }) {
  return (
    <div
      className={`flex items-center gap-3.5 bg-white/[0.06] rounded-2xl px-4 py-3.5 ${
        player.isNew ? 'border border-purple-500/30 animate-pulse' : ''
      }`}
      data-testid={`player-${player.id}`}
    >
      <div
        className={`w-11 h-11 rounded-[14px] flex items-center justify-center text-2xl shrink-0 bg-gradient-to-br ${player.gradient}`}
      >
        {player.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold flex items-center gap-2">
          {player.name}
          {player.isHost && (
            <span className="bg-gradient-to-br from-yellow-400 to-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
              Hôte
            </span>
          )}
        </div>
        <div className="text-xs text-white/40 mt-0.5">
          {player.isNew ? "Vient d'arriver !" : `Niveau ${player.level}`}
        </div>
      </div>
      <div className={`text-xl ${!player.isReady ? 'opacity-30' : ''}`}>
        {player.isReady ? '✅' : '⏳'}
      </div>
    </div>
  );
}

export default function PlayerList({ players, maxPlayers }: PlayerListProps) {
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-semibold text-white/70">Joueurs</h2>
        <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
          {players.length} / {maxPlayers}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
      {players.length < maxPlayers && (
        <div className="flex items-center justify-center gap-3 my-6 py-5 border-2 border-dashed border-white/10 rounded-2xl">
          <div className="flex gap-3">
            <span className="w-3 h-3 bg-white/15 rounded-full animate-bounce" />
            <span className="w-3 h-3 bg-white/15 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-3 h-3 bg-white/15 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
          <span className="text-xs text-white/35">En attente d&apos;autres joueurs…</span>
        </div>
      )}
    </div>
  );
}
