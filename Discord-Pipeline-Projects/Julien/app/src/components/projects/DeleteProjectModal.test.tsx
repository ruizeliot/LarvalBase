import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteProjectModal } from './DeleteProjectModal';

describe('US-P3: Suppression projet avec confirmation', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows confirmation message with project name', () => {
    render(
      <DeleteProjectModal
        isOpen={true}
        projectName="Mon Projet"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText('Mon Projet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /supprimer le projet/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <DeleteProjectModal
        isOpen={false}
        projectName="Mon Projet"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.queryByText(/supprimer le projet/i)).not.toBeInTheDocument();
  });

  it('calls onConfirm when delete is confirmed', async () => {
    const user = userEvent.setup();
    render(
      <DeleteProjectModal
        isOpen={true}
        projectName="Mon Projet"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: /confirmer/i }));

    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DeleteProjectModal
        isOpen={true}
        projectName="Mon Projet"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: /annuler/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
