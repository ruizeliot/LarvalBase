'use client';

export default function MusicWave() {
  return (
    <div data-testid="music-wave" className="flex items-end gap-1 h-10 my-8">
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-purple-700 to-purple-400 animate-wave"
          style={{
            animationDelay: `${i * 0.1}s`,
            height: [16, 28, 40, 24, 32, 20, 36][i],
          }}
        />
      ))}
    </div>
  );
}
