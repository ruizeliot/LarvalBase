import React from 'react';
import { Text } from 'ink';
import type { BadgeProps } from '../types/index.js';

const variantColors: Record<string, string> = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
};

export const Badge: React.FC<BadgeProps> = ({ variant, children }) => {
  const color = variantColors[variant] || 'white';

  return (
    <Text color={color} inverse>
      {` ${children.toUpperCase()} `}
    </Text>
  );
};
