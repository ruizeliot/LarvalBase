import { create } from 'zustand';
import type { Project } from '@/types/project';

interface ProjectState {
  projects: Project[];
  searchQuery: string;
  sortBy: 'name' | 'date';
  sortOrder: 'asc' | 'desc';
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'name' | 'date') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  loadProjects: (projects: Project[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),

  addProject: (name) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      datasetsCount: 0,
      architecturesCount: 0,
      runsCount: 0,
    };
    set((state) => ({ projects: [...state.projects, project] }));
  },

  deleteProject: (id) => {
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
  },

  loadProjects: (projects) => set({ projects }),
}));
