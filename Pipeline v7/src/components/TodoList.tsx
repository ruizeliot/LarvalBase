import React from 'react';
import { Box, Text } from 'ink';
import type { Todo } from '../types/index.js';

interface TodoListProps {
  todos: Todo[];
  maxVisible?: number;
}

export const TodoList: React.FC<TodoListProps> = ({ todos, maxVisible = 6 }) => {
  // SKELETON: Renders todos but they're not connected to real worker data
  const visibleTodos = todos.slice(0, maxVisible);
  const hasMore = todos.length > maxVisible;

  const getStatusIcon = (status: Todo['status']): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '●';
      case 'pending':
        return '○';
      default:
        return '?';
    }
  };

  const getStatusColor = (status: Todo['status']): string => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'yellow';
      case 'pending':
        return 'gray';
      default:
        return 'white';
    }
  };

  if (todos.length === 0) {
    return (
      <Box>
        <Text dimColor>No todos</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold dimColor>
        Todos:
      </Text>
      {visibleTodos.map((todo, index) => (
        <Box key={index}>
          <Text color={getStatusColor(todo.status)}>
            {getStatusIcon(todo.status)}{' '}
          </Text>
          <Text color={todo.status === 'in_progress' ? 'white' : 'gray'}>
            {todo.content}
          </Text>
        </Box>
      ))}
      {hasMore && (
        <Text dimColor>... and {todos.length - maxVisible} more</Text>
      )}
    </Box>
  );
};
