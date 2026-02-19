/** BuzzPlay design system tokens — extracted from mockup accueil.html */

export const colors = {
  bg: {
    primary: '#1a0533',
    secondary: '#2d1b69',
    accent: '#6c2bd9',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 40%, #6c2bd9 100%)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    dimmed: 'rgba(255, 255, 255, 0.4)',
  },
  brand: {
    purple: '#a855f7',
    red: '#ff6b6b',
    orange: '#ee5a24',
    yellow: '#ffd93d',
    green: '#6bcb77',
    blue: '#4d96ff',
  },
  nav: {
    bg: 'rgba(26, 5, 51, 0.95)',
    border: 'rgba(255, 255, 255, 0.1)',
    active: '#a855f7',
    inactive: 'rgba(255, 255, 255, 0.4)',
  },
  button: {
    createGradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
    createShadow: '0 8px 32px rgba(238, 90, 36, 0.4)',
    joinBg: 'rgba(255, 255, 255, 0.12)',
    joinBorder: 'rgba(255, 255, 255, 0.25)',
  },
} as const;
