import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types/project';

const project: Project = {
  id: '1',
  name: 'Test Project',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-15T12:00:00Z',
  datasetsCount: 5,
  architecturesCount: 3,
  runsCount: 12,
};

describe('US-P5: Stats par projet', () => {
  it('displays datasets count', () => {
    render(<ProjectCard project={project} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('5 datasets')).toBeInTheDocument();
  });

  it('displays architectures count', () => {
    render(<ProjectCard project={project} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('3 architectures')).toBeInTheDocument();
  });

  it('displays runs count', () => {
    render(<ProjectCard project={project} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('12 runs')).toBeInTheDocument();
  });

  it('shows zero counts for empty project', () => {
    const emptyProject: Project = {
      ...project,
      datasetsCount: 0,
      architecturesCount: 0,
      runsCount: 0,
    };
    render(<ProjectCard project={emptyProject} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('0 datasets')).toBeInTheDocument();
    expect(screen.getByText('0 architectures')).toBeInTheDocument();
    expect(screen.getByText('0 runs')).toBeInTheDocument();
  });

  it('calls onOpen when card is clicked', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<ProjectCard project={project} onOpen={onOpen} onDelete={vi.fn()} />);

    await user.click(screen.getByText('Test Project'));

    expect(onOpen).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked without triggering onOpen', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(<ProjectCard project={project} onOpen={onOpen} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /supprimer/i }));

    expect(onDelete).toHaveBeenCalledWith('1');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
