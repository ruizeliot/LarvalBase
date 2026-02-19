interface LaunchButtonProps {
  isHost: boolean;
  onLaunch: () => void;
}

export default function LaunchButton({ isHost, onLaunch }: LaunchButtonProps) {
  if (!isHost) return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] px-5 pb-9 pt-5 bg-gradient-to-t from-[rgba(15,23,42,0.98)] to-transparent">
      <button
        onClick={onLaunch}
        className="w-full py-5 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl text-white text-lg font-bold hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(109,40,217,0.5)] transition-all relative overflow-hidden"
      >
        🚀 Lancer la partie
      </button>
    </div>
  );
}
