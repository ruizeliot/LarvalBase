import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectsPage } from './ProjectsPage';

function renderPage() {
  return render(
    <BrowserRouter>
      <ProjectsPage />
    </BrowserRouter>,
  );
}

describe('US-P4: Recherche et filtres projets', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [
        {
          id: '1',
          name: 'Alpha Model',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-15T00:00:00Z',
          datasetsCount: 3,
          architecturesCount: 2,
          runsCount: 5,
        },
        {
          id: '2',
          name: 'Beta Forecast',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-10T00:00:00Z',
          datasetsCount: 1,
          architecturesCount: 0,
          runsCount: 0,
        },
        {
          id: '3',
          name: 'Gamma Model',
          createdAt: '2026-01-20T00:00:00Z',
          updatedAt: '2026-01-25T00:00:00Z',
          datasetsCount: 0,
          architecturesCount: 1,
          runsCount: 2,
        },
      ],
      searchQuery: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  });

  it('renders a search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument();
  });

  it('filters projects by search query', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText(/rechercher/i), 'Model');

    expect(screen.getByText('Alpha Model')).toBeInTheDocument();
    expect(screen.getByText('Gamma Model')).toBeInTheDocument();
    expect(screen.queryByText('Beta Forecast')).not.toBeInTheDocument();
  });

  it('shows sort controls', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /date/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nom/i })).toBeInTheDocument();
  });

  it('sorts projects by name when name sort is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /nom/i }));

    const cards = screen.getAllByText(/Model|Forecast/);
    expect(cards[0]!.textContent).toBe('Alpha Model');
  });
});
