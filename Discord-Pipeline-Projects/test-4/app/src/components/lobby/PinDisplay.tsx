'use client';

interface PinDisplayProps {
  pin: string;
}

export default function PinDisplay({ pin }: PinDisplayProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
  };

  return (
    <div className="text-center py-5">
      <p className="text-xs text-white/50 uppercase tracking-[3px] mb-2">
        Code de la partie
      </p>
      <p className="text-5xl font-black tracking-[12px] bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
        {pin}
      </p>
      <button
        onClick={handleCopy}
        className="mt-2 flex items-center gap-2 mx-auto text-xs text-white/50 hover:text-yellow-400 transition-colors"
      >
        📋 Copier le code
      </button>
    </div>
  );
}
