'use client';

import useOnlineCount from '@/hooks/useOnlineCount';

export default function OnlineCounter() {
  const count = useOnlineCount();

  return (
    <div className="flex items-center gap-1.5 text-sm text-white/50 mt-8">
      <span
        data-testid="online-dot"
        className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
      />
      {count.toLocaleString('fr-FR')} joueurs en ligne
    </div>
  );
}
