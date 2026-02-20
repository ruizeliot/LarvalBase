import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProjectModal } from './CreateProjectModal';

describe('US-P2: Creation nouveau projet', () => {
  const onClose = vi.fn();
  const onCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with name input and create button', () => {
    render(<CreateProjectModal isOpen={true} onClose={onClose} onCreate={onCreate} />);
    expect(screen.getByLabelText(/nom du projet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creer/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<CreateProjectModal isOpen={false} onClose={onClose} onCreate={onCreate} />);
    expect(screen.queryByLabelText(/nom du projet/i)).not.toBeInTheDocument();
  });

  it('calls onCreate with project name on submit', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen={true} onClose={onClose} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/nom du projet/i), 'Mon Projet ML');
    await user.click(screen.getByRole('button', { name: /creer/i }));

    expect(onCreate).toHaveBeenCalledWith('Mon Projet ML');
    expect(onClose).toHaveBeenCalled();
  });

  it('does not submit with empty name', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen={true} onClose={onClose} onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: /creer/i }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('clears input after successful creation', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen={true} onClose={onClose} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/nom du projet/i), 'Test');
    await user.click(screen.getByRole('button', { name: /creer/i }));

    expect(screen.getByLabelText(/nom du projet/i)).toHaveValue('');
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen={true} onClose={onClose} onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: /annuler/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
