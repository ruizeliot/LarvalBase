import MusicWave from '@/components/ui/MusicWave';
import OnlineCounter from '@/components/ui/OnlineCounter';
import BottomNav from '@/components/navigation/BottomNav';
import HomeActions from '@/components/home/HomeActions';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#1a0533] via-[#2d1b69] to-[#6c2bd9] text-white overflow-x-hidden">
      <div className="w-full max-w-[400px] px-6 pt-10 flex flex-col items-center pb-24">
        {/* Logo area */}
        <div className="mt-16 mb-4 text-center">
          <div data-testid="logo-icon" className="text-7xl animate-pulse">
            🎵
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-red-400 via-yellow-300 via-green-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
            BuzzPlay
          </h1>
          <p className="text-sm text-white/70 mt-1.5">Le blindtest entre potes</p>
        </div>

        {/* Music wave animation */}
        <MusicWave />

        {/* Action buttons */}
        <HomeActions />

        {/* Online counter */}
        <OnlineCounter />
      </div>
      <BottomNav currentPath="/" />
    </div>
  );
}
