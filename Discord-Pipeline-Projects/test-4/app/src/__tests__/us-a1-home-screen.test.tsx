/**
 * US-A1: En tant que joueur, je veux voir un écran d'accueil attractif
 * pour comprendre immédiatement le concept de l'app.
 *
 * Acceptance Criteria:
 * - Logo animé "BuzzPlay" visible
 * - Tagline "Le blindtest entre potes" visible
 * - Music wave animation (7 bars) visible
 * - "Créer une partie" button visible
 * - "Rejoindre" button visible
 */
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('US-A1: Attractive Home Screen', () => {
  beforeEach(() => {
    render(<HomePage />);
  });

  it('displays the BuzzPlay logo icon', () => {
    expect(screen.getByTestId('logo-icon')).toBeInTheDocument();
  });

  it('displays the app name "BuzzPlay"', () => {
    expect(screen.getByText('BuzzPlay')).toBeInTheDocument();
  });

  it('displays the tagline "Le blindtest entre potes"', () => {
    expect(screen.getByText('Le blindtest entre potes')).toBeInTheDocument();
  });

  it('displays the music wave animation with 7 bars', () => {
    const wave = screen.getByTestId('music-wave');
    expect(wave).toBeInTheDocument();
    expect(wave.children).toHaveLength(7);
  });

  it('displays the "Créer une partie" button', () => {
    expect(screen.getByRole('button', { name: /créer une partie/i })).toBeInTheDocument();
  });

  it('displays the "Rejoindre" button', () => {
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
  });
});
