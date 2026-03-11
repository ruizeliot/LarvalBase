# GanttFlow -- Product Requirements Document

## Product Vision

### Concept
GanttFlow is a web-based visual project planning tool built around interactive Gantt chart diagrams. It provides teams with an intuitive way to plan, track, and share project timelines through hierarchical tasks, automatic dependency management, and multi-format exports.

### Positioning
A lightweight, modern alternative to enterprise tools like Microsoft Project or Smartsheet. GanttFlow focuses on **visual clarity** and **ease of use** over feature bloat, targeting small-to-medium project teams who need Gantt charts without the complexity overhead.

### Target Audience
- **Project managers** planning and tracking multi-phase projects
- **Team leads** organizing tasks and assigning work
- **Freelancers/consultants** sharing project timelines with clients
- **Small teams** (up to 20 members per project) needing collaborative planning

### Key Value Propositions
1. **Visual-first**: Interactive Gantt chart with drag-and-drop, not spreadsheet-first
2. **Automatic dependency management**: Finish-to-Start cascading recalculation
3. **Client sharing**: Read-only links for external stakeholders
4. **Multi-format export**: PDF, PNG, CSV, Excel with date range filtering

---

## Technical Constraints

| Constraint | Value |
|---|---|
| Platform | Web application (browser-based) |
| UI Language | French |
| Max users per project | 20 |
| Dependency model | Finish-to-Start only |
| Export formats | PDF, PNG, CSV, Excel |
| Theme | Dark theme (single theme in V1) |
| Offline support | Not required in V1 |
| Authentication | Email-based invitation (specific auth provider TBD) |

### Recommended Tech Stack
Based on mockup complexity and requirements:
- **Frontend**: React + TypeScript (or Next.js for SSR)
- **Styling**: Tailwind CSS (dark theme, responsive)
- **Gantt rendering**: Custom canvas/SVG or library (e.g., frappe-gantt, dhtmlxGantt)
- **State management**: Zustand or Redux
- **Backend**: Node.js API or Next.js API routes
- **Database**: PostgreSQL (relational data: projects, tasks, dependencies, users)
- **Real-time**: WebSocket or SSE for collaboration updates
- **Export**: Server-side PDF/PNG generation (puppeteer or similar), CSV/Excel via streaming

---

## Functional Specifications

### Module 1: Gestion des Projets (Project Management)

**Screen**: Dashboard view showing all user projects as cards in a responsive grid.

**Features**:
- **Project cards**: Display status badge, project name, team member avatars, deadline, progress bar (%)
- **Create project**: Inline expandable form with fields: Name, Status (En cours/En pause/Termine), Start date, End date
- **Status filter**: Pill buttons to filter by status (All / In progress / Paused / Completed)
- **Context menu**: Three-dot menu per card with actions: Edit, Duplicate, Archive
- **Archive**: Hides project from main view (restorable)

**Interactions**:
| Action | Behavior |
|---|---|
| Click "+ Nouveau projet" | Expands inline creation form |
| Click filter pill | Filters visible cards by status |
| Click card context menu | Opens Edit/Duplicate/Archive dropdown |
| Click "Archiver" | Moves project to archived state, hides from grid |

### Module 2: Structure des Taches (Task Structure)

**Screen**: Task tree view within a project, showing collapsible phase groups with sub-tasks.

**Features**:
- **Phase groups**: Collapsible sections with name, task count, date range
- **Task rows**: Show task name, dependency label, dates, assigned user avatar
- **Dependencies**: Finish-to-Start links between tasks with "Apres: [task]" labels
- **Cascade recalculation**: Moving a predecessor automatically shifts all downstream tasks
- **Add task**: Button at bottom of each phase to add a new task
- **Task selection**: Click to highlight with accent left border

**Interactions**:
| Action | Behavior |
|---|---|
| Click phase arrow | Toggle expand/collapse of task group |
| Click task row | Select and highlight task |
| Click "+ Ajouter une tache" | Creates new task in the phase |
| Modify task dates | Triggers cascade recalculation of dependent tasks |

### Module 3: Vue Gantt Interactive (Interactive Gantt View)

**Screen**: Full Gantt chart visualization with horizontal timeline, task bars, and zoom controls.

**Features**:
- **Task bars**: Colored horizontal bars representing task duration, positioned by start date
- **Drag-and-drop**: Bars are draggable to reposition tasks on the timeline (touch supported)
- **Zoom levels**: Three levels -- Semaine (42px/day, 21 days), Mois (16px/day, 90 days), Trimestre (8px/day, 180 days)
- **Today line**: Red vertical line marking the current date with "Auj." label
- **Grid lines**: Subtle vertical grid lines at regular date intervals
- **Left column**: Task/phase names with completion percentages
- **Phase color coding**: Each phase uses its assigned color for the bar

**Interactions**:
| Action | Behavior |
|---|---|
| Drag task bar | Updates task start position (visual + data) |
| Click zoom button | Switches between week/month/quarter view |
| Today line | Auto-positioned at current date |

### Module 4: Collaboration

**Screen**: Team management panel with member list and activity log within a project.

**Features**:
- **Member list**: Shows avatar (initials), name, role badge, online status indicator
- **Roles**: Two roles -- Editeur (full edit access), Lecteur (view-only)
- **Invite form**: Email input + role dropdown to invite collaborators
- **Role toggle**: Click role badge to switch between Editor and Reader
- **Activity log**: Chronological list of all changes with actor, description, and timestamp
- **Activity types**: Task modifications, additions, comments, dependency changes, completions
- **Online status**: Green (online), yellow (away), gray (offline) dots on avatars

**Interactions**:
| Action | Behavior |
|---|---|
| Click "+ Inviter" | Shows email invitation form |
| Submit invitation | Adds member to list with selected role |
| Click role badge | Toggles between Editeur/Lecteur |
| Scroll activity log | View full audit trail of changes |

### Module 5: Export & Partage (Export & Share)

**Screen**: Export configuration panel with format selection, options, preview, and share link.

**Features**:
- **Format tabs**: PDF, PNG, CSV, Excel with icon buttons
- **Date range picker**: From/To date inputs to filter exported content
- **Orientation**: Landscape (recommended) or Portrait
- **Content filter**: Gantt + task list / Gantt only / Task list only
- **Live preview**: Shows format icon and readiness status
- **Download**: Button with loading state simulation
- **Share link**: Generates unique read-only URL with encoded date range
- **Copy to clipboard**: One-click copy of share link with confirmation

**Interactions**:
| Action | Behavior |
|---|---|
| Click format tab | Updates preview with format-specific info |
| Set date range | Filters exported Gantt content |
| Click "Telecharger" | Generates and downloads file in selected format |
| Click "Generer un lien" | Creates unique read-only share URL |
| Click "Copier" | Copies URL to clipboard with "Copie !" feedback |

---

## User Stories

### Module 1: Gestion des Projets

| ID | Story | Priority |
|---|---|---|
| US-1.1 | En tant qu'utilisateur, je veux **creer un projet avec un nom, une date de debut et une date de fin** afin d'avoir un cadre temporel clair. | Must |
| US-1.2 | En tant qu'utilisateur, je veux **voir tous mes projets dans un tableau de bord** afin de suivre l'avancement global en un coup d'oeil. | Must |
| US-1.3 | En tant qu'utilisateur, je veux **archiver un projet termine** afin de garder mon espace de travail propre. | Should |

### Module 2: Structure des Taches

| ID | Story | Priority |
|---|---|---|
| US-2.1 | En tant qu'utilisateur, je veux **creer des sous-taches rattachees a une tache parente** afin de decomposer le travail en etapes. | Must |
| US-2.2 | En tant qu'utilisateur, je veux **definir une dependance Fin->Debut entre deux taches** afin que le planning se recale automatiquement. | Must |
| US-2.3 | En tant qu'utilisateur, je veux **assigner une duree et des dates a chaque tache** afin que le diagramme reflete la realite. | Must |

### Module 3: Vue Gantt Interactive

| ID | Story | Priority |
|---|---|---|
| US-3.1 | En tant qu'utilisateur, je veux **deplacer une barre de tache par glisser-deposer** afin de reajuster le planning sans formulaire. | Must |
| US-3.2 | En tant qu'utilisateur, je veux **changer le zoom (semaine / mois / trimestre)** afin d'avoir la granularite adaptee a ma phase. | Must |
| US-3.3 | En tant qu'utilisateur, je veux **voir une ligne verticale "aujourd'hui"** afin de situer instantanement l'avancement reel. | Must |

### Module 4: Collaboration

| ID | Story | Priority |
|---|---|---|
| US-4.1 | En tant que chef de projet, je veux **inviter un collaborateur par email** afin qu'il accede au projet sans inscription complexe. | Must |
| US-4.2 | En tant que chef de projet, je veux **definir un role Lecteur pour un client** afin qu'il voie le planning sans le modifier. | Must |
| US-4.3 | En tant qu'utilisateur, je veux **voir qui a modifie une tache et quand** afin de suivre les changements sans reunion. | Should |

### Module 5: Export & Partage

| ID | Story | Priority |
|---|---|---|
| US-5.1 | En tant qu'utilisateur, je veux **exporter le Gantt en PDF** afin de l'integrer dans une presentation. | Must |
| US-5.2 | En tant qu'utilisateur, je veux **generer un lien de partage en lecture seule** afin d'envoyer une vue live a un client. | Should |
| US-5.3 | En tant qu'utilisateur, je veux **choisir la plage de dates a exporter** afin de ne montrer que la phase pertinente. | Should |

---

## Epic Breakdown

### Epic 1: Projets & Structure des Taches (Foundations)

| Field | Value |
|---|---|
| **Source sections** | Module 1 (Gestion des Projets) + Module 2 (Structure des Taches) |
| **User Stories** | US-1.1, US-1.2, US-1.3, US-2.1, US-2.2, US-2.3 |
| **Dependencies** | None -- this is the foundation |
| **Complexity** | L (Large) |

**Scope**: Database schema (projects, tasks, dependencies, users), API routes for CRUD operations, project dashboard UI with filtering and card grid, task tree UI with collapsible phases, dependency engine with cascade recalculation, basic routing and auth scaffolding.

**Demo outcome**: Create a project, add phases and sub-tasks, define a Finish-to-Start dependency, and observe automatic date recalculation.

**Mockup reference**: `app-mockup.html` -- Slides 1 (Projets) and 2 (Taches)

---

### Epic 2: Vue Gantt Interactive (Visualization)

| Field | Value |
|---|---|
| **Source section** | Module 3 (Vue Gantt Interactive) |
| **User Stories** | US-3.1, US-3.2, US-3.3 |
| **Dependencies** | Epic 1 (tasks must exist to be visualized) |
| **Complexity** | M (Medium) |

**Scope**: Gantt chart component with timeline rendering, draggable task bars (mouse + touch), zoom level switching (week/month/quarter), "today" marker line, grid lines, task labels with completion %, responsive layout.

**Demo outcome**: Open a project, drag a task bar to shift its date, switch between week/month/quarter zoom, and see the "today" line positioned dynamically.

**Mockup reference**: `app-mockup.html` -- Slide 3 (Gantt)

---

### Epic 3: Multi-utilisateurs & Roles (Collaboration)

| Field | Value |
|---|---|
| **Source section** | Module 4 (Collaboration) |
| **User Stories** | US-4.1, US-4.2, US-4.3 |
| **Dependencies** | Epic 1 (projects and tasks must exist) |
| **Complexity** | M (Medium) |

**Scope**: Email invitation system, role management (Editor/Reader), permission enforcement (Reader cannot edit), team member list with online status, activity log with change tracking, role toggle UI.

**Demo outcome**: Invite a client by email with Reader role, show them the read-only planning view, then consult the activity log to see who modified which task.

**Mockup reference**: `app-mockup.html` -- Slide 4 (Collab)

---

### Epic 4: Export & Partage (Export & Share)

| Field | Value |
|---|---|
| **Source section** | Module 5 (Export & Partage) |
| **User Stories** | US-5.1, US-5.2, US-5.3 |
| **Dependencies** | Epic 1 + Epic 2 (tasks and Gantt view must be functional) |
| **Complexity** | M (Medium) |

**Scope**: Multi-format export engine (PDF, PNG, CSV, Excel), date range filtering for exports, orientation and content options, live preview panel, share link generation with unique URLs, read-only share view, clipboard copy functionality.

**Demo outcome**: Select a date range "Phase 2 -> Phase 3", preview the filtered Gantt, export as PDF, then generate a read-only share link to send to a client.

**Mockup reference**: `app-mockup.html` -- Slide 5 (Export)

---

## Epic Dependency Graph

```
Epic 1 (Foundations)
  |
  +---> Epic 2 (Gantt) --+
  |                       +--> Epic 4 (Export)
  +---> Epic 3 (Collab)
```

Build order: **E1 -> E2 + E3 (parallel) -> E4**

---

## Non-Functional Requirements

### Performance
- Dashboard should load in < 2 seconds with up to 50 projects
- Gantt chart should render smoothly with up to 100 tasks
- Drag-and-drop must feel instant (< 16ms frame time)
- Export generation: < 5 seconds for PDF/PNG, < 2 seconds for CSV/Excel

### Accessibility
- Keyboard navigation: arrow keys for slide navigation, number keys for direct module access
- Focus management on form fields and interactive elements
- Color contrast: text meets WCAG AA on dark background
- Touch targets: minimum 44px for mobile

### Responsive Design
- Mobile breakpoint at 680px
- Sidebar collapses to full-width on mobile
- Module grid adapts from multi-column to 2-column
- Hero stats section hidden on mobile
- Gantt chart supports touch drag on mobile/tablet

### Security
- Email invitation tokens with expiration
- Role-based access enforcement server-side (not just UI)
- Share links with unique tokens, optional expiration
- No sensitive data in export URLs

---

## Visual References

| Asset | Path |
|---|---|
| Complete interactive mockup | `app-mockup.html` |
| Epic roadmap | `roadmap.html` |

All mockups were created by Storm as standalone HTML with embedded CSS and JavaScript. No external dependencies required.
