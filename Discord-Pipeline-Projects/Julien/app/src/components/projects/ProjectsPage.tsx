import { useState } from 'react';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/types/project';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { DeleteProjectModal } from './DeleteProjectModal';
import { SearchBar } from './SearchBar';
import './ProjectsPage.css';

export function ProjectsPage() {
  const projects = useFilteredProjects();
  const addProject = useProjectStore((s) => s.addProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <h1 className="projects-page__logo">NeuralForge</h1>
        <button
          className="projects-page__create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          + Nouveau projet
        </button>
      </header>

      <main className="projects-page__content">
        <SearchBar />
        {projects.length === 0 ? (
          <div className="projects-page__empty">
            <p>Aucun projet</p>
            <p className="projects-page__empty-hint">
              Creez votre premier projet pour commencer
            </p>
          </div>
        ) : (
          <div className="projects-page__grid">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => {}}
                onDelete={() => setProjectToDelete(project)}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={addProject}
      />

      <DeleteProjectModal
        isOpen={projectToDelete !== null}
        projectName={projectToDelete?.name ?? ''}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) deleteProject(projectToDelete.id);
        }}
      />
    </div>
  );
}
