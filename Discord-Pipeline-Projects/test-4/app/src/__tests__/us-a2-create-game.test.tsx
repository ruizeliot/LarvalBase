/**
 * US-A2: En tant que joueur, je veux créer une partie en un clic
 * pour inviter mes amis rapidement.
 *
 * Acceptance Criteria:
 * - "Créer une partie" button navigates to /lobby?host=true
 * - A 6-digit PIN is generated
 * - PIN is passed to the lobby page
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeActions from '@/components/home/HomeActions';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('US-A2: Create game in one click', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders "Créer une partie" button', () => {
    render(<HomeActions />);
    expect(screen.getByRole('button', { name: /créer une partie/i })).toBeInTheDocument();
  });

  it('navigates to /lobby with host=true when clicking create', async () => {
    const user = userEvent.setup();
    render(<HomeActions />);
    await user.click(screen.getByRole('button', { name: /créer une partie/i }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0];
    expect(url).toMatch(/^\/lobby\?pin=\d{6}&host=true$/);
  });

  it('generates a 6-digit PIN', async () => {
    const user = userEvent.setup();
    render(<HomeActions />);
    await user.click(screen.getByRole('button', { name: /créer une partie/i }));
    const url: string = mockPush.mock.calls[0][0];
    const pin = new URLSearchParams(url.split('?')[1]).get('pin');
    expect(pin).toMatch(/^\d{6}$/);
  });
});
