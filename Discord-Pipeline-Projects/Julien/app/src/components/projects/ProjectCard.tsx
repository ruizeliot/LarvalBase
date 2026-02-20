import type { Project } from '@/types/project';
import './ProjectCard.css';

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const formattedDate = new Date(project.updatedAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="project-card" onClick={() => onOpen(project.id)}>
      <div className="project-card__header">
        <h3 className="project-card__name">{project.name}</h3>
        <button
          className="project-card__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project.id);
          }}
          aria-label={`Supprimer ${project.name}`}
        >
          Supprimer
        </button>
      </div>
      <p className="project-card__date">Modifie le {formattedDate}</p>
      <div className="project-card__stats">
        <span className="project-card__stat">{project.datasetsCount} datasets</span>
        <span className="project-card__stat">{project.architecturesCount} architectures</span>
        <span className="project-card__stat">{project.runsCount} runs</span>
      </div>
    </div>
  );
}
