import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { ProjectCard } from './ProjectCard';
import './ProjectsPage.css';

export function ProjectsPage() {
  const projects = useFilteredProjects();

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <h1 className="projects-page__logo">NeuralForge</h1>
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
    </div>
  );
}
