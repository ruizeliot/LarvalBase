import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsPage } from './ProjectsPage';
import { useProjectStore } from '@/stores/projectStore';

function renderPage() {
  return render(
    <BrowserRouter>
      <ProjectsPage />
    </BrowserRouter>,
  );
}

describe('US-P1: Liste des projets au lancement', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      searchQuery: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  });

  it('displays the NeuralForge header with app name', () => {
    renderPage();
    expect(screen.getByText('NeuralForge')).toBeInTheDocument();
  });

  it('shows empty state when no projects exist', () => {
    renderPage();
    expect(screen.getByText(/aucun projet/i)).toBeInTheDocument();
  });

  it('displays project cards when projects exist', () => {
    useProjectStore.setState({
      projects: [
        {
          id: '1',
          name: 'Projet Alpha',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-15T00:00:00Z',
          datasetsCount: 3,
          architecturesCount: 2,
          runsCount: 5,
        },
        {
          id: '2',
          name: 'Projet Beta',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-10T00:00:00Z',
          datasetsCount: 1,
          architecturesCount: 0,
          runsCount: 0,
        },
      ],
    });

    renderPage();
    expect(screen.getByText('Projet Alpha')).toBeInTheDocument();
    expect(screen.getByText('Projet Beta')).toBeInTheDocument();
  });

  it('shows last modified date on each card', () => {
    useProjectStore.setState({
      projects: [
        {
          id: '1',
          name: 'Mon Projet',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-15T00:00:00Z',
          datasetsCount: 0,
          architecturesCount: 0,
          runsCount: 0,
        },
      ],
    });

    renderPage();
    expect(screen.getByText(/15\/01\/2026/)).toBeInTheDocument();
  });
});
