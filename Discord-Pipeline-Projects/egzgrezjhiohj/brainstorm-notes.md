# GanttFlow -- Brainstorm Notes

## Concept Summary

**GanttFlow** is a visual project planning web application centered around interactive Gantt chart diagrams. It enables users to create projects, organize hierarchical tasks with Finish-to-Start dependencies (automatic cascade recalculation), visualize timelines with drag-and-drop, collaborate with team members via role-based access, and export plans in multiple formats.

**Positioning**: Lightweight, modern alternative to heavy project management tools (MS Project, Smartsheet). Focuses on visual planning with a clean dark-themed UI, targeting small-to-medium teams (up to 20 users per project).

**One-liner**: "Planifiez vite, livrez mieux." (Plan fast, deliver better.)

## References & Inspirations

- **Gantt chart paradigm**: Standard Finish-to-Start dependency model with automatic date propagation
- **Modern SaaS dashboards**: Card-based project overview with status filtering
- **Collaborative tools**: Role-based access (Editor/Reader) similar to Google Workspace sharing model
- **Export-first approach**: Multi-format export (PDF/PNG/CSV/Excel) with live preview -- inspired by Notion/Figma export patterns

## Clarifications

- **Platform**: Web application (browser-based)
- **Language**: French UI (all labels, status badges, and user-facing text in French)
- **Max team size**: 20 users per project
- **Authentication**: Email-based invitation system (no OAuth/SSO specified)
- **Offline**: Not specified -- assumes online-first
- **Dependency model**: Finish-to-Start only (no Start-to-Start, Finish-to-Finish, or Start-to-Finish)
- **Date scope**: Calendar-based planning (dates, not sprints)

## Design Decisions

### Visual Theme
- **Dark theme**: Background `#0a0c12`, surfaces `#131620` / `#1a1d2a` / `#22263a`
- **Color palette per module**:
  - Module 1 (Projects): `#6c63ff` (purple)
  - Module 2 (Tasks): `#4fd1c5` (teal)
  - Module 3 (Gantt): `#f6ad55` (orange)
  - Module 4 (Collaboration): `#fc8181` (coral)
  - Module 5 (Export): `#68d391` (green)
- **Typography**: Segoe UI / system-ui / sans-serif, bold weights (800-900 for headings)
- **Border radius**: 10px default (`--r:10px`)
- **Cards**: Elevated surface with 3px color accent bar at top

### Layout Architecture
- **Navigation**: Fixed top nav bar (52px) with pill-based module selector + progress bar
- **Module slides**: Full-screen slide transitions with left panel (specs/stories) + right panel (interactive demo)
- **Home page**: Hero section with stats grid + module card grid
- **Responsive**: Mobile breakpoint at 680px -- sidebar collapses, grid adapts

## Section-by-Section Decisions

### Module 1: Gestion des Projets (Project Management)

**Purpose**: Central dashboard to create, filter, and track all projects at a glance.

**Decisions made**:
- Projects displayed as cards in a responsive grid (`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`)
- Each card shows: status badge, project name, team members, deadline, progress bar with percentage
- Status filter pills: "Tous" (All), "En cours" (In progress), "En pause" (Paused), "Termine" (Completed)
- Filter is dynamic -- cards hide/show without page reload
- New project form: inline expandable form (not a modal) with fields: Name, Status, Start date, End date
- Context menu (three-dot "...") on each card: Modify, Duplicate, Archive
- Archive hides the project from the dashboard (can be restored)
- Status-based color coding on cards: In progress = purple/teal, Paused = orange, Completed = green

**Rejected alternatives**:
- Table/list view: Rejected in favor of card grid for visual appeal and quick scanning
- Modal for project creation: Rejected -- inline form is faster and doesn't interrupt workflow
- Drag-and-drop reordering of projects: Not included in V1 scope

**Key interactions**:
1. Click "+ Nouveau projet" -> expands inline form
2. Filter pills -> dynamic card filtering
3. Context menu (three-dot) -> Archive or Duplicate

**User Stories**:
- US-1.1: Create a project with name, start date, end date
- US-1.2: View all projects in a dashboard with progress overview
- US-1.3: Archive a completed project to keep workspace clean

### Module 2: Structure des Taches (Task Structure)

**Purpose**: Hierarchical task management with parent phases, sub-tasks, dependencies, and automatic date recalculation.

**Decisions made**:
- Tasks organized in collapsible groups (phases) with arrow toggle
- Each phase shows: name, task count badge, date range
- Each task row shows: name, dependency label ("Apres: X"), dates, assigned user avatar (initials)
- Dependencies are Finish-to-Start ONLY -- a task cannot start until its predecessor finishes
- Cascade recalculation: moving a predecessor automatically shifts all dependent tasks
- Task selection: clicking a row highlights it with a left border accent
- Adding tasks: "+ Ajouter une tache" button at the bottom of each phase group
- User assignment shown as circular avatar with initials and color-coded background

**Rejected alternatives**:
- Kanban board view: Rejected -- Gantt-focused app, not a general PM tool
- Multiple dependency types (SS, FF, SF): Rejected for V1 simplicity -- only FS
- Drag-and-drop task reordering within phases: Not included in V1
- Task priority levels: Not included in V1

**Key interactions**:
1. Click phase arrow -> expand/collapse task group
2. Click task row -> select and highlight
3. Click "+ Ajouter" -> add new task to the phase

**User Stories**:
- US-2.1: Create sub-tasks attached to a parent phase
- US-2.2: Define Finish-to-Start dependency between two tasks
- US-2.3: Assign duration and dates to each task

### Module 3: Vue Gantt Interactive (Interactive Gantt View)

**Purpose**: The core visual -- an interactive Gantt chart with draggable bars, zoom levels, and a "today" marker.

**Decisions made**:
- Gantt chart with horizontal bars representing task durations
- Three zoom levels: Semaine (Week, 42px/day, 21-day view), Mois (Month, 16px/day, 90-day view), Trimestre (Quarter, 8px/day, 180-day view)
- Bars are drag-and-drop enabled (mousedown + mousemove + mouseup)
- Touch support included for mobile/tablet
- "Today" line: Red vertical line (`#ef4444`) with "Auj." (Aujourd'hui) label
- Grid lines at regular intervals (subtle, `rgba(255,255,255,.04)`)
- Left column shows task/phase name + completion percentage
- Bars color-coded by phase (same palette as module colors)
- Grabbing cursor on drag (`cursor: grab` / `cursor: grabbing`)

**Rejected alternatives**:
- Scroll-based zoom (pinch/wheel): Rejected -- explicit button zoom is clearer
- Bar resizing from edges: Not included in V1 (only position drag, not duration change)
- Dependency arrows between bars: Not included in V1 mockup
- Resource/workload view: Not in scope

**Key interactions**:
1. Drag a bar -> changes task start date (visual position update)
2. Click zoom buttons (Semaine/Mois/Trimestre) -> changes granularity
3. Red "today" line -> positions dynamically based on current date

**User Stories**:
- US-3.1: Drag-and-drop a task bar to adjust dates without a form
- US-3.2: Switch zoom level (week/month/quarter) for appropriate granularity
- US-3.3: See a vertical "today" line to instantly assess schedule status

### Module 4: Collaboration

**Purpose**: Team management with email invitations, role-based access control, and an auditable activity log.

**Decisions made**:
- Two roles only: Editeur (Editor, full access) and Lecteur (Reader, view-only)
- Team member list shows: avatar (colored circle with initials), name, role badge, online status dot
- Online status dots: green (online), yellow (away), gray (offline)
- Invitation via email with role selection (Editor or Reader dropdown)
- Role toggle: clicking a role badge toggles between Editor and Lecteur
- Activity log: chronological list of all changes with: action icon, actor name, description, relative timestamp
- Activity types tracked: task modification, task addition, comments, dependency creation, task completion
- Log is filterable (filter button present but filter UI not detailed in V1)

**Rejected alternatives**:
- Admin role: Rejected for V1 -- only Editor and Reader
- Real-time cursor tracking (like Figma): Not in V1 scope
- Comments thread per task: Only activity log mentions in V1
- Notifications system: Not specified in V1

**Key interactions**:
1. Click "+ Inviter" -> shows email invitation form
2. Click role badge -> toggles Editor/Reader
3. Activity log scrollable and filterable by member/action

**User Stories**:
- US-4.1: Invite a collaborator by email with no complex signup
- US-4.2: Define a Reader role for a client (view-only access)
- US-4.3: See who modified a task, when, and what changed

### Module 5: Export & Partage (Export & Share)

**Purpose**: Multi-format export with live preview and read-only share link generation.

**Decisions made**:
- Four export formats: PDF, PNG, CSV, Excel
- Format selection via tab buttons with icons
- Export options: Date range (from/to date pickers), Orientation (Landscape recommended / Portrait), Content included (Gantt + task list / Gantt only / Task list only)
- Live preview panel shows format icon and readiness status
- Download button with loading simulation ("Generation..." -> "Downloaded!")
- Share link generation: creates a unique URL with date range encoded
- Copy-to-clipboard button on share link with "Copied!" confirmation
- Share links are read-only (no editing from shared view)

**Rejected alternatives**:
- Email-based sharing (send PDF directly): Not in V1 -- link sharing only
- Watermarking exports: Not included
- Schedule/recurring exports: Not in scope
- Custom branding on exports: Not in V1

**Key interactions**:
1. Click format tabs -> updates preview with format-specific info
2. Select date range -> filters exported content
3. Click "Telecharger" -> generates and downloads file
4. Click "Generer un lien" -> creates read-only share URL
5. Click "Copier" -> copies share link to clipboard

**User Stories**:
- US-5.1: Export the Gantt chart as PDF for a presentation
- US-5.2: Generate a read-only share link to send to a client
- US-5.3: Select a specific date range to export (sprint, phase, or full project)

## Cross-Section Impacts & Dependencies

| Dependency | Reason |
|---|---|
| E1 (Projects + Tasks) must be built first | All other modules depend on project and task data existing |
| E2 (Gantt) depends on E1 | Tasks must exist to be visualized as bars |
| E3 (Collaboration) depends on E1 | Projects and tasks must exist for role-based access and activity tracking |
| E4 (Export) depends on E1 + E2 | Needs both task data and Gantt visualization to export |

## Epic Structure (from Roadmap)

| Epic | Name | Modules | User Stories | Dependencies |
|---|---|---|---|---|
| E1 | Projets & Structure des taches | 1, 2 | 6 (US-1.1 to US-2.3) | None |
| E2 | Vue Gantt interactive | 3 | 3 (US-3.1 to US-3.3) | E1 |
| E3 | Multi-utilisateurs & Roles | 4 | 3 (US-4.1 to US-4.3) | E1 |
| E4 | Export & Partage | 5 | 3 (US-5.1 to US-5.3) | E1 + E2 |

## Open Questions / Deferred Decisions

1. **Authentication method**: Email invitation is specified, but no auth provider (magic link? password? OAuth?) is decided
2. **Database/storage**: No backend stack specified -- local storage vs cloud DB vs file-based
3. **Real-time collaboration**: Activity log is mentioned but real-time sync (WebSocket) vs polling is not decided
4. **Mobile app**: Web only for V1 -- native app deferred
5. **Bar resizing**: Only bar dragging (position) is in V1 -- resizing (duration change via edges) deferred
6. **Dependency arrows**: Visual arrows between bars in the Gantt view are not in V1
7. **Undo/redo**: Not specified for V1
8. **Dark/light theme toggle**: Only dark theme in V1
9. **Localization**: French only in V1 -- multi-language deferred
10. **Pricing/billing**: Not discussed -- free tier vs premium not decided

## Mockup Validation

The complete interactive mockup was produced by Storm as a single standalone HTML file (`app-mockup.html`) containing all 5 modules with working interactions:
- Project creation, filtering, context menus
- Task tree with collapsible phases and selection
- Gantt chart with draggable bars, zoom, and today line
- Collaboration with invitation form and role toggling
- Export with format tabs, date range, and share link generation

A separate roadmap HTML (`roadmap.html`) was also produced showing the epic breakdown with 4 epics and 15 user stories.
