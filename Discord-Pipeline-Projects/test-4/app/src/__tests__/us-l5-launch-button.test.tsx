/**
 * US-L5: En tant que créateur, je veux lancer la partie
 * quand tout le monde est prêt.
 *
 * Acceptance Criteria:
 * - "Lancer la partie" button visible ONLY for host
 * - Button not rendered for non-host
 * - Clicking triggers onLaunch callback
 * - Full lobby page integrates all lobby components
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LaunchButton from '@/components/lobby/LaunchButton';

describe('US-L5: Launch button (host only)', () => {
  it('renders launch button for host', () => {
    render(<LaunchButton isHost={true} onLaunch={jest.fn()} />);
    expect(screen.getByRole('button', { name: /lancer la partie/i })).toBeInTheDocument();
  });

  it('does NOT render launch button for non-host', () => {
    render(<LaunchButton isHost={false} onLaunch={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /lancer la partie/i })).not.toBeInTheDocument();
  });

  it('calls onLaunch when clicked', async () => {
    const onLaunch = jest.fn();
    const user = userEvent.setup();
    render(<LaunchButton isHost={true} onLaunch={onLaunch} />);
    await user.click(screen.getByRole('button', { name: /lancer la partie/i }));
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });
});
