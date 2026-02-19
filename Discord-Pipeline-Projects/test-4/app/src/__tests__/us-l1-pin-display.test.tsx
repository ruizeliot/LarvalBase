/**
 * US-L1: En tant que créateur, je veux voir un code PIN clair
 * et le partager facilement à mes amis.
 *
 * Acceptance Criteria:
 * - PIN code displayed in large text
 * - Label "Code de la partie" visible
 * - Copy button ("Copier le code") visible
 * - Clicking copy writes PIN to clipboard
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PinDisplay from '@/components/lobby/PinDisplay';

describe('US-L1: Clear PIN display + share', () => {
  it('displays the PIN code in large text', () => {
    render(<PinDisplay pin="472935" />);
    expect(screen.getByText('472935')).toBeInTheDocument();
  });

  it('displays "Code de la partie" label', () => {
    render(<PinDisplay pin="472935" />);
    expect(screen.getByText(/code de la partie/i)).toBeInTheDocument();
  });

  it('displays copy button', () => {
    render(<PinDisplay pin="472935" />);
    expect(screen.getByRole('button', { name: /copier le code/i })).toBeInTheDocument();
  });

  it('copies PIN to clipboard when clicking copy', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<PinDisplay pin="472935" />);
    await user.click(screen.getByRole('button', { name: /copier le code/i }));
    expect(writeText).toHaveBeenCalledWith('472935');
  });
});
