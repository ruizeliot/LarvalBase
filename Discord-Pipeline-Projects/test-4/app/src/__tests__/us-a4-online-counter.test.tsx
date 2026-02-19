/**
 * US-A4: En tant que joueur, je veux voir combien de joueurs sont en ligne
 * pour sentir la communauté active.
 *
 * Acceptance Criteria:
 * - Green pulsing dot visible
 * - "joueurs en ligne" text visible
 * - Player count number displayed
 * - Count updates in real-time (via WebSocket hook)
 */
import { render, screen } from '@testing-library/react';
import OnlineCounter from '@/components/ui/OnlineCounter';

// Mock the useOnlineCount hook
jest.mock('@/hooks/useOnlineCount', () => ({
  __esModule: true,
  default: () => 1247,
}));

describe('US-A4: Online Players Counter', () => {
  beforeEach(() => {
    render(<OnlineCounter />);
  });

  it('displays a green pulsing dot indicator', () => {
    const dot = screen.getByTestId('online-dot');
    expect(dot).toBeInTheDocument();
  });

  it('displays the player count', () => {
    expect(screen.getByText(/1[\s,.]?247/)).toBeInTheDocument();
  });

  it('displays "joueurs en ligne" label', () => {
    expect(screen.getByText(/joueurs en ligne/i)).toBeInTheDocument();
  });
});
