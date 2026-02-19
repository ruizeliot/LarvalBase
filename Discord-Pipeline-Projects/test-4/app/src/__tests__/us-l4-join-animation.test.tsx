/**
 * US-L4: En tant que joueur, je veux voir les nouveaux joueurs
 * arriver avec une animation.
 *
 * Acceptance Criteria:
 * - New player has "Vient d'arriver !" tag instead of level
 * - New player card has a distinct visual indicator (border pulse)
 * - useLobby hook simulates player joining over time
 */
import { render, screen, act } from '@testing-library/react';
import PlayerList from '@/components/lobby/PlayerList';
import { Player } from '@/lib/lobby-types';
import useLobby from '@/hooks/useLobby';
import { renderHook } from '@testing-library/react';

const playersWithNew: Player[] = [
  { id: '1', name: 'Anthony', emoji: '👑', gradient: 'from-amber-500 to-red-500', level: 12, isHost: true, isReady: true, isNew: false },
  { id: '5', name: 'Théo', emoji: '🥁', gradient: 'from-rose-500 to-orange-400', level: 3, isHost: false, isReady: false, isNew: true },
];

describe('US-L4: Player join animation', () => {
  it('displays "Vient d\'arriver !" for new players', () => {
    render(<PlayerList players={playersWithNew} maxPlayers={8} />);
    expect(screen.getByText("Vient d'arriver !")).toBeInTheDocument();
  });

  it('new player card has joining indicator', () => {
    render(<PlayerList players={playersWithNew} maxPlayers={8} />);
    const newCard = screen.getByTestId('player-5');
    expect(newCard.className).toContain('border');
    expect(newCard.className).toContain('purple');
  });

  it('useLobby hook adds simulated players over time', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useLobby('123456', true));

    // Initially has 1 player (the host)
    expect(result.current.players.length).toBeGreaterThanOrEqual(1);

    const initialCount = result.current.players.length;

    // Advance timers to trigger player joins
    act(() => { jest.advanceTimersByTime(10000); });

    expect(result.current.players.length).toBeGreaterThan(initialCount);

    jest.useRealTimers();
  });
});
