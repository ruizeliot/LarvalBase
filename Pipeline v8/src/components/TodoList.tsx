/**
 * TodoList Component
 * Pipeline v8
 *
 * US-120: Dashboard todo list
 */
import React from 'react';
import { Box, Text } from 'ink';
import type { TodoItem } from '../types/index.js';

interface TodoListProps {
  todos: TodoItem[];
  title?: string;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  title = 'Current Todos',
}) => {
  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '▶';
      default:
        return ' ';
    }
  };

  const getStatusColor = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>─ {title} ─</Text>
      {todos.length === 0 ? (
        <Text dimColor>No todos</Text>
      ) : (
        todos.map((todo, i) => (
          <Box key={i}>
            <Text color={getStatusColor(todo.status)}>
              [{getStatusIcon(todo.status)}]
            </Text>
            <Text
              color={todo.status === 'in_progress' ? 'white' : 'gray'}
              bold={todo.status === 'in_progress'}
            >
              {' '}
              {todo.content}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
};
