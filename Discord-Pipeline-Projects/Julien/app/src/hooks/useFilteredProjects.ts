import { useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';

export function useFilteredProjects() {
  const projects = useProjectStore((s) => s.projects);
  const searchQuery = useProjectStore((s) => s.searchQuery);
  const sortBy = useProjectStore((s) => s.sortBy);
  const sortOrder = useProjectStore((s) => s.sortOrder);

  return useMemo(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return sortOrder === 'asc'
        ? a.updatedAt.localeCompare(b.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [projects, searchQuery, sortBy, sortOrder]);
}
