import React from 'react';
import { Text } from 'ink';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info' }) => {
  const colors: Record<BadgeVariant, string> = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  };

  const bgColors: Record<BadgeVariant, string> = {
    success: 'bgGreen',
    error: 'bgRed',
    warning: 'bgYellow',
    info: 'bgBlue',
  };

  return (
    <Text color="white" backgroundColor={colors[variant]}>
      {' '}
      {children}{' '}
    </Text>
  );
};
