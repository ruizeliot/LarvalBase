import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/playlists', label: 'Playlists', icon: '🎵' },
  { href: '/profil', label: 'Profil', icon: '📊' },
];

interface BottomNavProps {
  currentPath: string;
}

export default function BottomNav({ currentPath }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 w-full max-w-[400px] bg-[rgba(26,5,51,0.95)] backdrop-blur-xl flex justify-around py-3 pb-7 border-t border-white/10">
      {navItems.map((item) => {
        const isActive = currentPath === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={isActive}
            className={`flex flex-col items-center gap-1 text-xs cursor-pointer transition-colors ${
              isActive ? 'text-purple-400' : 'text-white/40'
            }`}
          >
            <span className="text-[22px]">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
