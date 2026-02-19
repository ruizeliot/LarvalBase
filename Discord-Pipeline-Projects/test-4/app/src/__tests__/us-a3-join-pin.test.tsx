/**
 * US-A3: En tant que joueur, je veux saisir un code PIN
 * pour rejoindre la partie d'un ami.
 *
 * Acceptance Criteria:
 * - 6 individual digit inputs rendered
 * - Auto-advance: typing a digit moves focus to next input
 * - Backspace: on empty input, moves focus to previous input
 * - When all 6 digits filled, navigates to /lobby?pin=XXXXXX&host=false
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PinInput from '@/components/home/PinInput';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('US-A3: Join with PIN code', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders 6 digit inputs', () => {
    render(<PinInput />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('auto-advances focus to next input on digit entry', async () => {
    const user = userEvent.setup();
    render(<PinInput />);
    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('4');
    expect(inputs[1]).toHaveFocus();
  });

  it('moves focus back on backspace from empty input', async () => {
    const user = userEvent.setup();
    render(<PinInput />);
    const inputs = screen.getAllByRole('textbox');
    // Type a digit in first input, advance to second
    await user.click(inputs[0]);
    await user.keyboard('4');
    // Now on second input (empty), press backspace
    await user.keyboard('{Backspace}');
    expect(inputs[0]).toHaveFocus();
  });

  it('navigates to /lobby when all 6 digits are entered', async () => {
    const user = userEvent.setup();
    render(<PinInput />);
    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('472935');
    expect(mockPush).toHaveBeenCalledWith('/lobby?pin=472935&host=false');
  });

  it('only accepts numeric input', async () => {
    const user = userEvent.setup();
    render(<PinInput />);
    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('a');
    expect(inputs[0]).toHaveValue('');
  });
});
