import React from 'react';
import { Box, Text } from 'ink';
import type { Todo } from '../types/index.js';

interface TodoListProps {
  todos: Todo[];
  maxItems?: number;
}

const statusIcons: Record<string, string> = {
  completed: '✓',
  in_progress: '⟳',
  pending: '○',
};

const statusColors: Record<string, string> = {
  completed: 'green',
  in_progress: 'yellow',
  pending: 'gray',
};

export const TodoList: React.FC<TodoListProps> = ({ todos, maxItems = 10 }) => {
  const displayTodos = todos.slice(0, maxItems);
  const remaining = todos.length - maxItems;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Tasks</Text>
      <Box flexDirection="column" marginTop={1}>
        {displayTodos.length === 0 ? (
          <Text dimColor>No tasks</Text>
        ) : (
          displayTodos.map((todo, index) => (
            <Box key={index} gap={1}>
              <Text color={statusColors[todo.status]}>
                {statusIcons[todo.status] || '?'}
              </Text>
              <Text
                color={todo.status === 'in_progress' ? 'yellow' : undefined}
                dimColor={todo.status === 'pending'}
              >
                {todo.status === 'in_progress' ? todo.activeForm : todo.content}
              </Text>
            </Box>
          ))
        )}
        {remaining > 0 && (
          <Text dimColor>... and {remaining} more</Text>
        )}
      </Box>
    </Box>
  );
};
