'use client';

import { useRouter } from 'next/navigation';
import { generatePin } from '@/lib/pin';

export default function HomeActions() {
  const router = useRouter();

  const handleCreate = () => {
    const pin = generatePin();
    router.push(`/lobby?pin=${pin}&host=true`);
  };

  return (
    <div className="w-full flex flex-col gap-4 mt-6">
      <button
        onClick={handleCreate}
        className="w-full py-5 rounded-2xl text-lg font-bold bg-gradient-to-br from-red-400 to-orange-600 text-white shadow-[0_8px_32px_rgba(238,90,36,0.4)] hover:-translate-y-0.5 transition-all"
      >
        <span className="mr-2.5 text-xl">🎤</span>
        Créer une partie
      </button>
      <button className="w-full py-5 rounded-2xl text-lg font-bold bg-white/10 text-white border-2 border-white/25 backdrop-blur-sm hover:bg-white/20 hover:-translate-y-0.5 transition-all">
        <span className="mr-2.5 text-xl">🔑</span>
        Rejoindre
      </button>
    </div>
  );
}
