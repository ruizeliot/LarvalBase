import { LobbyConfigData } from '@/lib/lobby-types';

const ROUND_OPTIONS = [10, 15, 20];
const TIMER_OPTIONS = [15, 20, 30];

interface LobbyConfigProps {
  config: LobbyConfigData;
  isHost: boolean;
  onConfigChange: (config: LobbyConfigData) => void;
}

function cycleOption(current: number, options: number[]): number {
  const idx = options.indexOf(current);
  return options[(idx + 1) % options.length];
}

export default function LobbyConfig({ config, isHost, onConfigChange }: LobbyConfigProps) {
  const handleRoundsClick = () => {
    if (!isHost) return;
    onConfigChange({ ...config, rounds: cycleOption(config.rounds, ROUND_OPTIONS) });
  };

  const handleTimerClick = () => {
    if (!isHost) return;
    onConfigChange({ ...config, timer: cycleOption(config.timer, TIMER_OPTIONS) });
  };

  const chipClass =
    'bg-white/[0.08] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs whitespace-nowrap flex items-center gap-1.5 transition-all hover:bg-white/[0.15]';

  return (
    <div className="flex gap-2.5 my-5 overflow-x-auto pb-1">
      <div className={chipClass}>
        <span>🎵</span> {config.theme}
      </div>
      <button onClick={handleRoundsClick} className={chipClass}>
        <span>🔄</span> {config.rounds} rounds
      </button>
      <button onClick={handleTimerClick} className={chipClass}>
        <span>⏱️</span> {config.timer}s
      </button>
      <div className={chipClass}>
        <span>🎯</span> {config.mode}
      </div>
    </div>
  );
}
