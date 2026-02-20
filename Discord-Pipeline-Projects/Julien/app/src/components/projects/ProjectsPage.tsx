import { useState } from 'react';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import './ProjectsPage.css';

export function ProjectsPage() {
  const projects = useFilteredProjects();
  const addProject = useProjectStore((s) => s.addProject);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
                onDelete={() => {}}
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
    </div>
  );
}
