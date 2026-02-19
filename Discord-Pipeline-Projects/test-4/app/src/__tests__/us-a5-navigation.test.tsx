/**
 * US-A5: En tant que joueur, je veux naviguer vers Playlists et Profil
 * depuis l'accueil.
 *
 * Acceptance Criteria:
 * - Bottom navigation bar with 3 items: Accueil, Playlists, Profil
 * - Each nav item has an icon and label
 * - Active item is highlighted (Accueil by default on home page)
 * - Nav items are links to /playlists and /profil
 * - Playlists page renders with title
 * - Profil page renders with title
 */
import { render, screen } from '@testing-library/react';
import BottomNav from '@/components/navigation/BottomNav';
import PlaylistsPage from '@/app/playlists/page';
import ProfilPage from '@/app/profil/page';

describe('US-A5: Navigation Bottom Bar', () => {
  it('renders 3 navigation items', () => {
    render(<BottomNav currentPath="/" />);
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
  });

  it('displays Accueil nav item', () => {
    render(<BottomNav currentPath="/" />);
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });

  it('displays Playlists nav item', () => {
    render(<BottomNav currentPath="/" />);
    expect(screen.getByText('Playlists')).toBeInTheDocument();
  });

  it('displays Profil nav item', () => {
    render(<BottomNav currentPath="/" />);
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('highlights the active nav item', () => {
    render(<BottomNav currentPath="/" />);
    const accueilLink = screen.getByText('Accueil').closest('a');
    expect(accueilLink).toHaveAttribute('data-active', 'true');
  });

  it('links Playlists to /playlists', () => {
    render(<BottomNav currentPath="/" />);
    const playlistsLink = screen.getByText('Playlists').closest('a');
    expect(playlistsLink).toHaveAttribute('href', '/playlists');
  });

  it('links Profil to /profil', () => {
    render(<BottomNav currentPath="/" />);
    const profilLink = screen.getByText('Profil').closest('a');
    expect(profilLink).toHaveAttribute('href', '/profil');
  });
});

describe('US-A5: Playlists Page', () => {
  it('renders with title', () => {
    render(<PlaylistsPage />);
    expect(screen.getByRole('heading', { name: 'Playlists' })).toBeInTheDocument();
  });
});

describe('US-A5: Profil Page', () => {
  it('renders with title', () => {
    render(<ProfilPage />);
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
  });
});
