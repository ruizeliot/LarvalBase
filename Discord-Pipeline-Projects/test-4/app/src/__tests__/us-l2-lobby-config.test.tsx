/**
 * US-L2: En tant que créateur, je veux configurer le thème,
 * le nombre de rounds et le timer.
 *
 * Acceptance Criteria:
 * - Config bar with 4 chips: theme, rounds, timer, mode
 * - Each chip shows emoji + value
 * - Host can cycle through round options (10, 15, 20)
 * - Host can cycle through timer options (15s, 20s, 30s)
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LobbyConfig from '@/components/lobby/LobbyConfig';

const defaultConfig = {
  theme: 'Hits 2024',
  rounds: 15,
  timer: 20,
  mode: 'Buzzer',
};

describe('US-L2: Lobby configuration', () => {
  it('renders 4 config chips', () => {
    render(<LobbyConfig config={defaultConfig} isHost={true} onConfigChange={jest.fn()} />);
    expect(screen.getByText('Hits 2024')).toBeInTheDocument();
    expect(screen.getByText('15 rounds')).toBeInTheDocument();
    expect(screen.getByText('20s')).toBeInTheDocument();
    expect(screen.getByText('Buzzer')).toBeInTheDocument();
  });

  it('cycles rounds when host clicks rounds chip', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<LobbyConfig config={defaultConfig} isHost={true} onConfigChange={onChange} />);
    await user.click(screen.getByText('15 rounds'));
    expect(onChange).toHaveBeenCalledWith({ ...defaultConfig, rounds: 20 });
  });

  it('cycles timer when host clicks timer chip', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<LobbyConfig config={defaultConfig} isHost={true} onConfigChange={onChange} />);
    await user.click(screen.getByText('20s'));
    expect(onChange).toHaveBeenCalledWith({ ...defaultConfig, timer: 30 });
  });

  it('does not allow config changes for non-host', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<LobbyConfig config={defaultConfig} isHost={false} onConfigChange={onChange} />);
    await user.click(screen.getByText('15 rounds'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
