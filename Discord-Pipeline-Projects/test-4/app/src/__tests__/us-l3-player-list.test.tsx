/**
 * US-L3: En tant que joueur, je veux voir la liste des joueurs
 * présents et leur statut.
 *
 * Acceptance Criteria:
 * - "Joueurs" header visible
 * - Player count badge (e.g. "3 / 8")
 * - Each player shows avatar, name, level, ready status
 * - Host has "Hôte" badge
 * - Waiting zone with animated dots when lobby not full
 */
import { render, screen } from '@testing-library/react';
import PlayerList from '@/components/lobby/PlayerList';
import { Player } from '@/lib/lobby-types';

const mockPlayers: Player[] = [
  { id: '1', name: 'Anthony', emoji: '👑', gradient: 'from-amber-500 to-red-500', level: 12, isHost: true, isReady: true, isNew: false },
  { id: '2', name: 'Marie', emoji: '🎸', gradient: 'from-purple-500 to-pink-500', level: 8, isHost: false, isReady: true, isNew: false },
  { id: '3', name: 'Lucas', emoji: '🎧', gradient: 'from-cyan-500 to-blue-500', level: 15, isHost: false, isReady: false, isNew: false },
];

describe('US-L3: Real-time player list', () => {
  it('displays "Joueurs" header', () => {
    render(<PlayerList players={mockPlayers} maxPlayers={8} />);
    expect(screen.getByText('Joueurs')).toBeInTheDocument();
  });

  it('displays player count badge', () => {
    render(<PlayerList players={mockPlayers} maxPlayers={8} />);
    expect(screen.getByText('3 / 8')).toBeInTheDocument();
  });

  it('displays each player name', () => {
    render(<PlayerList players={mockPlayers} maxPlayers={8} />);
    expect(screen.getByText('Anthony')).toBeInTheDocument();
    expect(screen.getByText('Marie')).toBeInTheDocument();
    expect(screen.getByText('Lucas')).toBeInTheDocument();
  });

  it('displays player level', () => {
    render(<PlayerList players={mockPlayers} maxPlayers={8} />);
    expect(screen.getByText('Niveau 12')).toBeInTheDocument();
  });

  it('displays host badge for the host player', () => {
    render(<PlayerList players={mockPlayers} maxPlayers={8} />);
    expect(screen.getByText('Hôte')).toBeInTheDocument();
  });

  it('displays ready/waiting status icons', () => {
    render(<PlayerList players={mockPlayers} maxPlayers={8} />);
    const readyIcons = screen.getAllByText('✅');
    expect(readyIcons).toHaveLength(2);
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('displays waiting zone when lobby not full', () => {
    render(<PlayerList players={mockPlayers} maxPlayers={8} />);
    expect(screen.getByText(/en attente d'autres joueurs/i)).toBeInTheDocument();
  });
});
