import BottomNav from '@/components/navigation/BottomNav';

export default function ProfilPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#1a0533] via-[#2d1b69] to-[#6c2bd9] text-white">
      <div className="w-full max-w-[400px] px-6 pt-16 pb-24">
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-white/50 mt-2">Votre progression et statistiques</p>
      </div>
      <BottomNav currentPath="/profil" />
    </div>
  );
}
