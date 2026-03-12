# AZERE — Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-12
**Project:** AZERE — Application web de creation et gestion de diagrammes de Gantt en temps reel

---

## Story Count Summary

| Category | Count |
|----------|-------|
| User-defined stories | 15 |
| Edge case stories | 45 |
| Completeness pair stories | 10 |
| UI element coverage stories | 8 |
| Accessibility (A11Y) stories | 4 |
| **Total** | **82** |

---

## 1. Product Vision

### Concept
AZERE is a web application for creating and managing Gantt charts in real time. It enables users to plan projects visually, define task dependencies, track progress, and collaborate with others through shared links with role-based permissions.

### Target Users
- Project managers and team leads who need visual project planning
- Small-to-medium teams coordinating tasks with dependencies
- Students and professionals managing academic or professional projects
- Anyone needing a lightweight, modern Gantt chart tool without the overhead of enterprise software

### Core Value Proposition
- **Simple project creation** with dates and progress tracking
- **Interactive Gantt chart** with drag-and-drop, zoom levels (day/week/month), and real-time progress
- **Task dependencies** (finish-to-start) with visual arrows
- **Milestones** as distinct visual markers for key dates
- **Collaboration** via shareable links with Viewer/Editor roles
- **Modern UI** — dark theme for project management, light theme for task/Gantt views

### Language
The application UI is in **French**. All labels, buttons, messages, and placeholders use French text.

---

## 2. Modules

### Module 1: Authentification & Compte

**Purpose:** User registration, login, session management, and account settings.

**Key Specs:**
- Login with email/password
- Registration with name, email, password (min 8 chars)
- Google OAuth ("Continuer avec Google")
- Password strength indicator (5-level: Tres faible / Faible / Moyen / Fort / Tres fort)
- Password visibility toggle (eye icon)
- "Mot de passe oublie?" — forgot password via email
- Login/Register tab switcher within a single card
- Account settings page:
  - Avatar with initials (gradient background), hover overlay for photo change
  - Edit first name, last name, email
  - Change password (current + new, with strength indicator)
  - Danger zone: Logout button, Delete account button
- Delete account: confirmation modal requiring user to type "SUPPRIMER"
- Field validation with inline error messages (red border + error text)
- Success banner (green) for successful actions
- Toast notifications for all actions

**Decisions:**
- Auth card centered on page, max-width 400px
- Scene switcher bar at top to toggle Login vs Account Settings views
- Password strength evaluated on: length >=8, length >=12, uppercase, digit, special char
- No email verification flow in MVP (simulated success)

**Mockup:** `mockups/authentification-compte.html`

---

### Module 2: Gestion des Projets

**Purpose:** CRUD operations on Gantt projects, with dashboard, search, filtering, and archiving.

**Key Specs:**
- Dashboard with project cards (grid or list view toggle)
- Project card shows: name, description, status badge, start/end dates, progress bar, team avatars, action buttons (edit, archive, delete)
- Create project modal: name (max 60 chars with counter), description (max 300 chars with counter), start date, end date, status dropdown (Planifie/En cours/En pause/Termine), progress slider (0-100%)
- Edit project: same modal, pre-filled
- Archive project: confirmation modal, moves to "Archived" tab
- Restore archived project: moves back to active
- Delete project: confirmation modal ("irréversible"), permanent deletion
- Search bar: filters by name and description
- Status filter pills: Tous / En cours / Planifie / Termine / En pause
- Sidebar navigation: Dashboard, Archived, quick filters by status, "Nouveau projet" button
- Detail drawer (slide-in panel): shows project details with description, dates, progress bar, edit/archive buttons
- Archived projects page with search
- Notifications area (toast-style, auto-dismiss 3s)
- Empty state when no projects match filters

**Decisions:**
- Dark theme (bg: #0f1117, surface: #1a1d27, accent: #6c63ff)
- Grid view: cards with colored top border, responsive grid (min 300px)
- List view: compact rows
- 6 accent colors for project cards
- Team avatars shown as 2-letter initials in circles

**Mockup:** `mockups/gestion-projets.html`

---

### Module 3: Gestion des Taches

**Purpose:** Create and manage tasks and milestones within projects, with finish-to-start dependencies.

**Key Specs:**
- Task table with columns: Type icon, Name, Start date, End date, Timeline (mini Gantt bar), Dependency (FTS), Actions
- Create task modal: name, start date, end date, project dropdown
- Create milestone modal: name, date, project dropdown (milestones have single date, no duration)
- Task displayed as blue bar in mini timeline; milestone as amber diamond
- Finish-to-start (FTS) dependency linking:
  - Click link button on source task
  - Blue banner appears: "Mode liaison actif — cliquez sur une tâche pour la lier apres [source]"
  - Click target task to create dependency
  - Cancel button to exit link mode
  - Dependency shown as green badge with predecessor name
- Delete task/milestone with cascading dependency cleanup
- Project filter pills: Tous / per-project filters
- Stats bar: task count, milestone count, dependency count
- Validation: name required, dates required, end date >= start date
- Empty state when no items
- Toast notifications for all CRUD actions
- Responsive: mobile shows stacked layout, actions always visible

**Decisions:**
- Light theme (bg: #f0f4f8, surface: white)
- Tasks identified by blue square icon, milestones by amber diamond icon
- Duration displayed in days (e.g., "7j")
- Date format: DD/MM/YY
- Mini Gantt bars are proportional to the overall project timeline
- Link mode highlights valid targets with blue outline

**Mockup:** `mockups/gestion-taches.html`

---

### Module 4: Vue Gantt Interactive

**Purpose:** Full interactive Gantt chart visualization with drag-and-drop, zoom, progress tracking, and dependency arrows.

**Key Specs:**
- Split layout: sidebar (task list with names + progress %) + scrollable Gantt area
- Three zoom levels: Jour (day), Semaine (week), Mois (month) — toggle buttons in header
- Header: two rows — top row (month/year groups), bottom row (day/week/month cells)
- Today line (vertical blue line with "Auj." label)
- Task bars:
  - Colored by category (Core=blue, UI=purple, API=green)
  - Progress shown as darker overlay portion
  - Label with task name + percentage inside bar
  - Drag-and-drop to move tasks (horizontal only)
  - Hover: shadow + brightness boost
  - Dragging: grabbing cursor + elevated shadow
- Milestone diamonds: amber, rotated 45deg, with tooltip on hover
- Dependency arrows: horizontal grey lines with arrow heads between predecessor end and successor start
- Progress popup:
  - Click task bar or sidebar % to open
  - Shows: task name, big percentage, progress bar, slider (0-100), dates
  - Positioned near cursor
  - Close button
  - Live update of bar, sidebar, and popup as slider moves
- Sidebar scroll synced with Gantt scroll (vertical)
- Auto-center on today when loading
- Weekend columns styled differently (day zoom)
- Current week/month highlighted (week/month zoom)
- Toast notifications for drag moves and progress changes

**Decisions:**
- Pixels per day: day=38px, week=13px, month=4.2px
- Row height: 44px
- Sidebar width: 230px (130px on mobile)
- Bar height: 26px with 5px border-radius
- Pointer events for drag (not mouse events) — better touch support
- Close popup on outside click or Escape key
- Progress % hidden on mobile sidebar

**Mockup:** `mockups/vue-gantt.html`

---

### Module 5: Partage & Collaboration

**Purpose:** Generate shareable links with role-based access (Viewer or Editor) and manage active links.

**Key Specs:**
- Stats strip: total active links, Viewer count, Editor count
- Generate link card:
  - Project dropdown
  - Role toggle (Viewer / Editor) with colored indicators (Viewer=sky blue, Editor=purple)
  - "Generer un lien de partage" button
  - On generation: shows preview with URL, auto-copies to clipboard, "Copier" button
- Active links list:
  - Each row: project name, role badge (Viewer/Editor), short URL, creation date, last access indicator (green dot if accessed, grey if never)
  - Copy button per link (with "Copie" feedback)
  - Revoke button with inline confirmation ("Revoquer ? Oui / Non")
  - Revoke animation (slide out)
- Link URL format: `https://azere.app/share/{token}` where token = `azr-v-` (viewer) or `azr-e-` (editor) + 6 random chars
- Clipboard: navigator.clipboard with textarea fallback
- Toast notifications for all actions
- Empty state when no active links

**Decisions:**
- Light theme consistent with task/Gantt modules
- Viewer color: #0ea5e9 (sky blue), Editor color: #8b5cf6 (purple)
- Max link URL display width: 200px (truncated with ellipsis)
- Revoke is two-step: button -> inline confirmation -> remove with animation
- Stats update in real-time after link creation/revocation

**Mockup:** `mockups/partage-collaboration.html`

---

## 3. Roadmap

### Epic 1: Fondations — Auth & Projets
- **Modules:** Authentification & compte, Gestion des projets
- **Dependencies:** None (first epic)
- **Demo:** Create an account, login with email or Google OAuth, reset password, then create Gantt projects, archive them, and navigate a multi-project dashboard.

### Epic 2: Taches & Jalons
- **Modules:** Gestion des taches
- **Dependencies:** Epic 1 (tasks belong to projects)
- **Demo:** Within a project, create tasks with duration and dates, define finish-to-start dependencies between tasks, and add visually distinct milestones on the timeline.

### Epic 3: Vue Gantt Interactive
- **Modules:** Vue Gantt interactive
- **Dependencies:** Epic 2 (Gantt displays tasks and milestones from E2)
- **Demo:** Visualize tasks and milestones in a Gantt chart, zoom (week/month/quarter), drag-and-drop tasks, and see progress in real time.

### Epic 4: Partage & Collaboration
- **Modules:** Partage & collaboration
- **Dependencies:** Epic 1 (sharing is linked to projects)
- **Demo:** Generate a share link with Viewer or Editor role, invite someone to view or edit a Gantt project, and see collaborative changes in real time.

---

## 4. User Stories

### Epic 1: Fondations — Auth & Projets (22 stories)

#### US-E1-001 — Create account with email/password (User)
As a user, I want to create an account with email and password so that I can access the application.

**Acceptance Criteria:**
1. Registration form has name, email, and password fields
2. Password minimum 8 characters with strength indicator
3. Validation errors shown inline (red border + message)
4. Success banner displayed after registration
5. Google OAuth button available as alternative

#### US-E1-002 — Login via Google OAuth (User)
As a user, I want to log in via Google OAuth so that I can access the app quickly without creating a password.

**Acceptance Criteria:**
1. "Continuer avec Google" button visible on login and register forms
2. Clicking triggers Google OAuth redirect
3. On success, user is authenticated and redirected to dashboard

#### US-E1-003 — Reset password by email (User)
As a user, I want to reset my password by email if I forget it.

**Acceptance Criteria:**
1. "Mot de passe oublie ?" link visible on login form
2. Clicking with valid email shows success banner with confirmation
3. Clicking without valid email shows error on email field
4. Toast notification confirms email sent

#### US-E1-004 — Create a Gantt project (User)
As a user, I want to create a Gantt project with name and dates so that I can organize my work.

**Acceptance Criteria:**
1. Create project modal has: name (max 60 chars), description (max 300 chars), start date, end date, status dropdown, progress slider
2. Name and dates are required — validation prevents empty submission
3. Character counters update in real time
4. New project appears in dashboard after creation
5. Toast notification confirms creation

#### US-E1-005 — View all projects in dashboard (User)
As a user, I want to see all my projects in a dashboard so that I can navigate quickly.

**Acceptance Criteria:**
1. Dashboard shows project cards with name, status badge, dates, progress bar, team avatars
2. Grid and list view toggle available
3. Project count and last update shown in subtitle
4. Clicking a card opens the detail drawer

#### US-E1-006 — Archive a completed project (User)
As a user, I want to archive a completed project to keep the dashboard clean.

**Acceptance Criteria:**
1. Archive button available on each project card
2. Confirmation modal explains the action is reversible
3. Archived project moves to "Archived" tab
4. Dashboard count updates
5. Toast notification confirms archival

#### US-E1-007 — Registration with invalid email format (Edge)
As a user, I want to see a clear error when I enter an invalid email during registration so that I can correct it.

**Acceptance Criteria:**
1. Email field shows red border and "Adresse e-mail invalide" message
2. Submit button does not proceed
3. Error clears when valid email is entered

#### US-E1-008 — Registration with short password (Edge)
As a user, I want to see a clear error when my password is too short so that I know the minimum requirement.

**Acceptance Criteria:**
1. Password field shows red border and "Minimum 8 caracteres" message
2. Password strength indicator shows "Tres faible"
3. Submit blocked until password meets minimum length

#### US-E1-009 — Login with wrong credentials (Edge)
As a user, I want to see an error when I enter wrong credentials so that I know to try again.

**Acceptance Criteria:**
1. Password field shows red border with "Mot de passe incorrect" message
2. Email field is not cleared
3. No success banner is shown

#### US-E1-010 — Create project with end date before start date (Edge)
As a user, I want to see an error when I set an end date before the start date so that I can fix it.

**Acceptance Criteria:**
1. End date field shows error state
2. Toast notification explains the constraint
3. Project is not created

#### US-E1-011 — Create project with empty required fields (Edge)
As a user, I want to see validation errors when I try to create a project without filling required fields.

**Acceptance Criteria:**
1. Empty name field shows error state
2. Empty date fields show error state
3. Toast notification prompts to fill required fields

#### US-E1-012 — Search projects with no matches (Edge)
As a user, I want to see an empty state when my search returns no results so that I know to modify my search.

**Acceptance Criteria:**
1. Empty state shows with icon and message "Aucun projet trouve"
2. Subtitle suggests modifying the search
3. Clearing search restores all projects

#### US-E1-013 — Restore archived project (Pair)
As a user, I want to restore an archived project so that it reappears in my active dashboard.

**Acceptance Criteria:**
1. Restore button available on archived project cards
2. Project moves back to active dashboard
3. Archived project count updates
4. Toast notification confirms restoration

#### US-E1-014 — Delete a project permanently (Pair)
As a user, I want to permanently delete a project so that it is removed from both active and archived lists.

**Acceptance Criteria:**
1. Delete button available on project cards
2. Confirmation modal warns action is irreversible
3. Project is removed from all views
4. Toast notification confirms deletion

#### US-E1-015 — Edit an existing project (Pair)
As a user, I want to edit an existing project's details so that I can update its information.

**Acceptance Criteria:**
1. Edit button opens the create modal pre-filled with current values
2. Modal title changes to "Modifier le projet"
3. Save updates the project in place
4. Toast notification confirms update

#### US-E1-016 — Toggle password visibility (UI)
As a user, I want to toggle password visibility so that I can verify what I typed.

**Acceptance Criteria:**
1. Eye icon toggles input type between password and text
2. Icon changes to indicate current state
3. Works on all password fields (login, register, account settings)

#### US-E1-017 — Switch dashboard view mode (UI)
As a user, I want to switch between grid and list views on the dashboard so that I can choose my preferred layout.

**Acceptance Criteria:**
1. Grid button shows card layout (responsive grid)
2. List button shows compact row layout
3. Active view button is visually highlighted
4. View persists during the session

#### US-E1-018 — Edit account profile (UI)
As a user, I want to edit my first name, last name, and email in account settings.

**Acceptance Criteria:**
1. Profile card shows avatar, name, and email
2. Input fields are editable
3. "Enregistrer les modifications" button saves and shows "Enregistre !" feedback
4. Display name and email update in header

#### US-E1-019 — Change password from account settings (UI)
As a user, I want to change my password from the account settings page.

**Acceptance Criteria:**
1. "Modifier le mot de passe" toggle reveals the form
2. Form requires current password and new password (min 8 chars)
3. New password has strength indicator
4. Cancel button hides the form and clears fields
5. Success toast on password change

#### US-E1-020 — Delete account (UI)
As a user, I want to delete my account permanently.

**Acceptance Criteria:**
1. "Supprimer mon compte" button in danger zone
2. Modal requires typing "SUPPRIMER" to confirm
3. Confirm button stays disabled until exact text is entered
4. Account deletion confirmed via toast

#### US-E1-021 — Logout (UI)
As a user, I want to log out so that my session ends.

**Acceptance Criteria:**
1. "Se deconnecter" button in danger zone
2. Clicking shows toast and redirects to login page

#### US-E1-022 — Filter projects by status (UI)
As a user, I want to filter projects by status (En cours, Planifie, Termine, En pause) so that I can focus on relevant projects.

**Acceptance Criteria:**
1. Filter pills toggle active/inactive state
2. "Tous" shows all projects
3. Filtering updates the project grid immediately
4. Sidebar quick filters trigger the same filtering

---

### Epic 2: Taches & Jalons (16 stories)

#### US-E2-001 — Create a task with dates (User)
As a user, I want to create a task with a name, start date, end date, and project assignment so that I can plan my work.

**Acceptance Criteria:**
1. "Nouvelle tache" button opens task creation modal
2. Name, start date, end date are required
3. Project dropdown defaults to first project
4. Task appears in the table after creation
5. Stats bar updates task count

#### US-E2-002 — Define FTS dependencies (User)
As a user, I want to define finish-to-start dependencies between tasks so that I can model constraints.

**Acceptance Criteria:**
1. Link button on each task row activates link mode
2. Blue banner shows source task name
3. Valid target tasks get blue outline and become clickable
4. Clicking target creates the dependency
5. Dependency badge shows predecessor name
6. Stats bar updates dependency count

#### US-E2-003 — Create milestones (User)
As a user, I want to create milestones that are visually distinct from tasks to mark key dates.

**Acceptance Criteria:**
1. "Nouveau jalon" button opens milestone creation modal
2. Name and date are required (single date, no duration)
3. Milestone appears in table with amber diamond icon
4. Milestone shows "jalon" label in timeline column
5. Stats bar updates milestone count

#### US-E2-004 — Delete a task with cascade (Edge)
As a user, I want deleted tasks to have their dependencies cleaned up so that no orphan references remain.

**Acceptance Criteria:**
1. Deleting a task removes it from the list
2. Any task that depended on the deleted task has its dependency cleared (set to null)
3. If the deleted task was the link mode source, link mode is cancelled
4. Stats bar updates all counts

#### US-E2-005 — Create task with invalid dates (Edge)
As a user, I want to see an error when I set an end date before the start date on a task.

**Acceptance Criteria:**
1. End date field shows error state
2. Toast message: "La date de fin doit etre apres la date de debut"
3. Task is not created

#### US-E2-006 — Create task with empty name (Edge)
As a user, I want to see an error when I try to create a task without a name.

**Acceptance Criteria:**
1. Name field shows error state
2. Toast message: "Veuillez remplir tous les champs requis"
3. Task is not created

#### US-E2-007 — Cancel link mode (Pair)
As a user, I want to cancel dependency link mode so that I can abort the operation.

**Acceptance Criteria:**
1. Cancel button in the blue banner exits link mode
2. Escape key also cancels link mode
3. All task rows return to normal state
4. Banner hides

#### US-E2-008 — Remove a dependency (Pair)
As a user, I want to remove an existing dependency from a task so that I can change the constraint.

**Acceptance Criteria:**
1. A mechanism exists to clear/remove an existing dependency
2. Dependency badge disappears after removal
3. Stats bar updates dependency count

#### US-E2-009 — Delete a milestone (Pair)
As a user, I want to delete a milestone so that I can remove an outdated key date.

**Acceptance Criteria:**
1. Delete button on milestone row removes it
2. Dependent items have their dependency cleared
3. Stats bar updates milestone count
4. Toast confirms deletion

#### US-E2-010 — Filter tasks by project (UI)
As a user, I want to filter the task list by project so that I can focus on one project at a time.

**Acceptance Criteria:**
1. Project filter pills at top (Tous + per-project)
2. Active pill is highlighted
3. Filtering updates the visible task list immediately
4. Stats bar reflects unfiltered totals

#### US-E2-011 — Create circular dependency (Edge)
As a user, I want the system to prevent circular dependencies so that the schedule remains valid.

**Acceptance Criteria:**
1. If task A depends on task B, then B cannot be set to depend on A
2. An error message or prevention mechanism blocks the circular link
3. The dependency is not created

#### US-E2-012 — Empty task list state (Edge)
As a user, I want to see an empty state message when there are no tasks so that I know to create one.

**Acceptance Criteria:**
1. Empty state shows icon and "Aucun element" message
2. Subtitle: "Creez une tache ou un jalon pour commencer"

#### US-E2-013 — Edit an existing task (UI)
As a user, I want to edit a task's name, dates, and project assignment so that I can update it.

**Acceptance Criteria:**
1. An edit mechanism is available for each task
2. Fields are pre-filled with current values
3. Changes save and reflect immediately in the table

#### US-E2-014 — Self-dependency prevention (Edge)
As a user, I want the system to prevent a task from depending on itself.

**Acceptance Criteria:**
1. In link mode, the source task is not clickable as a target
2. The source task does not get the blue outline

#### US-E2-015 — Escape closes task modal (Edge)
As a user, I want to press Escape to close task/milestone creation modals.

**Acceptance Criteria:**
1. Pressing Escape closes any open modal
2. Pressing Escape also cancels link mode
3. Both actions work independently

#### US-E2-016 — Backdrop click closes modal (Edge)
As a user, I want to click outside the modal to close it.

**Acceptance Criteria:**
1. Clicking the overlay backdrop closes the modal
2. Clicking inside the modal does not close it

---

### Epic 3: Vue Gantt Interactive (20 stories)

#### US-E3-001 — Visualize tasks in Gantt chart (User)
As a user, I want to visualize my tasks in a Gantt chart so that I have an overview of the project timeline.

**Acceptance Criteria:**
1. Each task shows as a colored bar proportional to its duration
2. Milestones show as diamond markers
3. Sidebar lists task names with progress percentages
4. Today line is displayed as a vertical blue line
5. Chart auto-centers on today when loading

#### US-E3-002 — Zoom levels (User)
As a user, I want to zoom the Gantt chart (day/week/month) to adapt the granularity.

**Acceptance Criteria:**
1. Three zoom buttons in the header: Jour, Semaine, Mois
2. Active zoom button is highlighted
3. Day zoom: 38px per day, shows individual dates
4. Week zoom: 13px per day, shows week start dates
5. Month zoom: 4.2px per day, shows month names
6. Zoom change shows toast confirmation

#### US-E3-003 — Drag and drop tasks (User)
As a user, I want to drag and drop tasks on the Gantt to update the schedule easily.

**Acceptance Criteria:**
1. Task bars have grab cursor
2. Pointer drag moves the bar horizontally
3. Start and end dates update based on drag distance
4. Bar visual updates in real-time during drag
5. Toast shows new date range after drop
6. Full re-render after drop to update dependencies

#### US-E3-004 — Update task progress (Edge)
As a user, I want to click a task to update its progress percentage so that the chart reflects current status.

**Acceptance Criteria:**
1. Clicking a task bar (without dragging) opens the progress popup
2. Clicking % in sidebar also opens the popup
3. Slider adjusts progress from 0 to 100
4. Bar, sidebar %, and popup all update live
5. Closing popup shows toast with new percentage

#### US-E3-005 — Dependency arrows visualization (Edge)
As a user, I want to see dependency arrows between tasks so that I understand the constraints visually.

**Acceptance Criteria:**
1. Grey horizontal line connects predecessor end to successor start
2. Arrow head points to the successor
3. Arrows update positions when tasks are dragged
4. Arrows are drawn for all defined dependencies

#### US-E3-006 — Weekend highlighting in day zoom (Edge)
As a user, I want weekends to be visually different in day zoom so that I can identify working days.

**Acceptance Criteria:**
1. Saturday and Sunday columns have muted text color and different background
2. Weekday columns have normal styling
3. Only applies in day zoom mode

#### US-E3-007 — Sidebar scroll sync (Edge)
As a user, I want the sidebar and Gantt chart to scroll vertically in sync.

**Acceptance Criteria:**
1. Scrolling the Gantt area scrolls the sidebar
2. Scrolling the sidebar scrolls the Gantt area
3. No infinite scroll loop (sync lock mechanism)

#### US-E3-008 — Close progress popup on outside click (Edge)
As a user, I want the progress popup to close when I click outside it.

**Acceptance Criteria:**
1. Clicking outside popup, task bars, and sidebar % closes it
2. Pressing Escape also closes it
3. Progress is saved even if closed by outside click

#### US-E3-009 — Drag threshold to distinguish click from drag (Edge)
As a user, I want small mouse movements to not trigger a drag so that I can click to open the popup.

**Acceptance Criteria:**
1. Movement less than 3px does not count as drag
2. Click without significant movement opens progress popup
3. Movement beyond 3px initiates drag behavior

#### US-E3-010 — Task bar hover feedback (Edge)
As a user, I want task bars to highlight on hover so that I know they are interactive.

**Acceptance Criteria:**
1. Hover adds shadow and brightness boost to bar
2. Cursor changes to grab on hover
3. Milestone diamonds scale up on hover

#### US-E3-011 — Gantt with no tasks (Edge)
As a user, I want the Gantt to handle an empty task list gracefully.

**Acceptance Criteria:**
1. Empty sidebar shows no rows
2. Gantt area shows empty timeline
3. No JavaScript errors thrown

#### US-E3-012 — Today highlighted in header (Edge)
As a user, I want today's column/week/month to be highlighted in the header.

**Acceptance Criteria:**
1. In day zoom: today's column has blue background and bold text
2. In week zoom: current week has highlight
3. In month zoom: current month has highlight

#### US-E3-013 — Drag task beyond view range (Edge)
As a user, I want the Gantt to handle tasks dragged beyond the visible range.

**Acceptance Criteria:**
1. After drop, the view range recalculates to include all tasks
2. Full re-render adjusts the timeline to fit

#### US-E3-014 — Milestone tooltip on hover (Pair — Show/Hide)
As a user, I want to see a milestone name tooltip on hover.

**Acceptance Criteria:**
1. Hovering over milestone diamond shows tooltip with name
2. Tooltip disappears on mouse leave
3. Tooltip positioned above the diamond

#### US-E3-015 — Close progress popup (Pair — Open/Close)
As a user, I want to close the progress popup with the close button.

**Acceptance Criteria:**
1. "Fermer" button closes the popup
2. Toast shows the task name and final percentage
3. Popup disappears with no residual state

#### US-E3-016 — Task progress bar overlay (UI)
As a user, I want to see task progress visually on the Gantt bar.

**Acceptance Criteria:**
1. Completed portion has normal color
2. Remaining portion has darker overlay (rgba(0,0,0,0.18))
3. Percentage text shown inside the bar
4. Progress updates in real-time when slider changes

#### US-E3-017 — Task bar label with name and percentage (UI)
As a user, I want each task bar to show the task name and progress percentage.

**Acceptance Criteria:**
1. Task name is left-aligned in the bar
2. Percentage shown with reduced opacity
3. Text truncated with ellipsis if bar is too narrow

#### US-E3-018 — Popup shows task date range (UI)
As a user, I want the progress popup to show the task's date range.

**Acceptance Criteria:**
1. Dates displayed in DD/MM/YY format
2. Format: "start -> end"

#### US-E3-019 — Color-coded tasks by category (UI)
As a user, I want tasks colored by category (Core, UI, API) for visual distinction.

**Acceptance Criteria:**
1. Core tasks are blue (#4f8ef7)
2. UI tasks are purple (#8b5cf6)
3. API tasks are green (#10b981)
4. Milestones are amber (#f59e0b)

#### US-E3-020 — Responsive sidebar width (UI)
As a user, I want the sidebar to adapt on mobile for better usability.

**Acceptance Criteria:**
1. Desktop: sidebar 230px wide
2. Mobile (<600px): sidebar 130px wide
3. Progress % hidden on mobile

---

### Epic 4: Partage & Collaboration (20 stories)

#### US-E4-001 — Share project via link (User)
As a user, I want to share a project via a generated link so that others can access it.

**Acceptance Criteria:**
1. Share link card has project dropdown and role toggle
2. "Generer un lien de partage" button creates the link
3. Link URL shown in green preview box
4. Link auto-copied to clipboard
5. Toast confirms generation and copy

#### US-E4-002 — Set Viewer or Editor role per link (User)
As a user, I want to set a Viewer or Editor role for each shared link to control permissions.

**Acceptance Criteria:**
1. Role toggle with two options: Viewer (sky blue) and Editor (purple)
2. Active role visually highlighted
3. Generated link token prefix matches role (azr-v- or azr-e-)
4. Role badge shown in active links list

#### US-E4-003 — Real-time collaborative editing (User)
As a user, I want to see collaborators' changes in real time so that we can work together.

**Acceptance Criteria:**
1. Changes made by an Editor are reflected for all viewers
2. Updates appear without page refresh
3. Conflict resolution handles simultaneous edits

#### US-E4-004 — Copy share link to clipboard (Edge)
As a user, I want to copy a share link from the active links list.

**Acceptance Criteria:**
1. "Copier" button on each link row
2. Button changes to "Copie" with checkmark for 2 seconds
3. Toast confirms clipboard copy
4. Fallback to textarea copy if clipboard API unavailable

#### US-E4-005 — Revoke a share link (Edge)
As a user, I want to revoke a share link so that access is removed.

**Acceptance Criteria:**
1. "Revoquer" button on each link row
2. Inline confirmation appears: "Revoquer ? Oui / Non"
3. Confirming removes the link with slide-out animation
4. Stats update after revocation
5. Toast confirms revocation with project name

#### US-E4-006 — Revoke last link shows empty state (Edge)
As a user, I want to see an empty state when all share links have been revoked.

**Acceptance Criteria:**
1. Empty state shows lock icon and message
2. "Aucun lien actif. Creez votre premier lien de partage ci-dessus."

#### US-E4-007 — Cancel revoke confirmation (Pair)
As a user, I want to cancel the revoke confirmation so that the link stays active.

**Acceptance Criteria:**
1. "Non" button hides the confirmation
2. "Revoquer" button reappears
3. Link remains in the list

#### US-E4-008 — Generate multiple links for same project (Edge)
As a user, I want to generate multiple links for the same project with different roles.

**Acceptance Criteria:**
1. Multiple links can exist for the same project
2. Each link has a unique token
3. Stats correctly count all active links

#### US-E4-009 — Copy link from preview (Pair)
As a user, I want to copy the newly generated link from the preview box.

**Acceptance Criteria:**
1. "Copier" button in preview box
2. Changes to checkmark + "Copie" for 2 seconds
3. Reverts to clipboard icon after timeout

#### US-E4-010 — Link access indicator (UI)
As a user, I want to see whether a share link has been accessed.

**Acceptance Criteria:**
1. Green dot + "Dernier acces : [time]" if accessed
2. Grey dot + "Jamais utilise" if never accessed

#### US-E4-011 — Stats strip real-time update (UI)
As a user, I want the stats (total links, Viewer count, Editor count) to update in real time.

**Acceptance Criteria:**
1. Creating a link increments the relevant counters
2. Revoking a link decrements the relevant counters
3. Counters always reflect the current state

#### US-E4-012 — Viewer cannot edit (Edge)
As a Viewer, I want to be prevented from making changes so that the project data is protected.

**Acceptance Criteria:**
1. Viewer role disables all edit controls (drag, progress, create task)
2. View-only mode clearly indicated
3. No accidental mutations possible

#### US-E4-013 — Editor can edit all project data (Edge)
As an Editor, I want to be able to create, edit, and delete tasks and milestones.

**Acceptance Criteria:**
1. Editor has full CRUD access on the shared project
2. Changes are persisted and visible to all collaborators

#### US-E4-014 — Invalid share link (Edge)
As a user, I want to see an error when I visit an invalid or revoked share link.

**Acceptance Criteria:**
1. Error page or message displayed
2. No access to project data
3. Suggestion to request a new link from the owner

#### US-E4-015 — Share link without selecting project (Edge)
As a user, I want the system to handle generating a link when no projects exist.

**Acceptance Criteria:**
1. If no projects exist, the dropdown is empty or disabled
2. Generate button is disabled or shows error
3. Clear guidance to create a project first

#### US-E4-016 — Enable collaboration on project (Pair — Enable/Disable)
As a user, I want to enable sharing for a project.

**Acceptance Criteria:**
1. Share link generation is available for any project
2. Multiple links can coexist
3. Stats track all active links

#### US-E4-017 — Disable collaboration by revoking all links (Pair — Enable/Disable)
As a user, I want to revoke all links to disable sharing entirely.

**Acceptance Criteria:**
1. All links can be individually revoked
2. Empty state confirms no active sharing
3. Project returns to owner-only access

#### US-E4-018 — Select project for sharing (UI)
As a user, I want to select which project to share from a dropdown.

**Acceptance Criteria:**
1. Dropdown lists all active (non-archived) projects
2. Default selection is the first project
3. Selection changes the context for link generation

#### US-E4-019 — Role toggle visual feedback (UI)
As a user, I want the role toggle to clearly indicate which role is selected.

**Acceptance Criteria:**
1. Selected Viewer has light blue background
2. Selected Editor has light purple background
3. Non-selected option has neutral styling
4. Switching roles updates the visual state immediately

#### US-E4-020 — Share link URL display (UI)
As a user, I want to see the shortened link URL in the active links list.

**Acceptance Criteria:**
1. URL displayed in monospace font
2. Truncated with ellipsis if too long
3. Full URL available in title attribute on hover

---

### Accessibility Standards (4 stories)

#### US-A11Y-001 — Keyboard navigation (A11Y)
As a user, I want to navigate all interactive elements using Tab, Enter, and Space so that the app is accessible without a mouse.

**Acceptance Criteria:**
1. All buttons, links, inputs, and toggles are reachable via Tab
2. Enter/Space activates focused elements
3. Tab order follows visual layout
4. No keyboard traps

#### US-A11Y-002 — Focus indicators (A11Y)
As a user, I want visible focus indicators on all focusable elements so that I know where I am on the page.

**Acceptance Criteria:**
1. Focus ring visible on all interactive elements
2. Focus ring has sufficient contrast (3:1 minimum)
3. Focus ring style consistent across the app

#### US-A11Y-003 — Escape closes modals/dialogs (A11Y)
As a user, I want to press Escape to close any open modal or dialog so that I can dismiss overlays quickly.

**Acceptance Criteria:**
1. All modals close on Escape keypress
2. Progress popup closes on Escape
3. Link mode cancels on Escape
4. Focus returns to the trigger element after close

#### US-A11Y-004 — Screen reader support (A11Y)
As a user, I want all interactive elements to have aria-labels so that screen readers can describe them.

**Acceptance Criteria:**
1. All buttons have aria-label or visible text
2. Modal close buttons have aria-label="Fermer"
3. Form inputs have associated labels
4. Status changes announced via aria-live regions

---

## 5. Technical Constraints

### Platform & Stack Decisions
- **Type:** Web application (SPA)
- **Language:** French UI
- **Frontend framework:** To be decided during implementation (React or Next.js recommended given mockup complexity)
- **Styling:** CSS custom properties extensively used in mockups; Tailwind CSS or vanilla CSS
- **Backend:** Required for auth, data persistence, and real-time collaboration
- **Database:** Required for users, projects, tasks, milestones, dependencies, share links
- **Real-time:** WebSocket or Server-Sent Events for collaborative editing (Epic 4)
- **Auth:** Email/password + Google OAuth

### Known Limitations
- MVP does not include email verification (simulated success)
- No mobile app — web-only, responsive design
- Real-time collaboration scope limited to task/milestone CRUD and progress updates
- No file attachments or comments on tasks
- No notification system beyond in-app toasts
- No undo/redo for drag operations

### Design Tokens (from mockups)
**Dark theme** (Project management module):
- Background: #0f1117, Surface: #1a1d27, Accent: #6c63ff/#a78bfa

**Light theme** (Task, Gantt, Sharing modules):
- Background: #f0f4f8, Surface: #ffffff, Primary: #4f8ef7

**Auth module**:
- Same light theme with centered card layout

---

## 6. Pre-flight Requirements

### 1. Hosting / Deployment Target
- **What:** A hosting platform for the web application (Vercel, Netlify, or VPS)
- **Why:** The app needs to be accessible via browser
- **Verify:** Deployment URL resolves and serves content

### 2. Domain Name
- **What:** Domain `azere.app` (referenced in share link URLs in mockups)
- **Why:** Share links use `https://azere.app/share/{token}` format
- **Verify:** DNS resolves to hosting platform

### 3. Database
- **What:** PostgreSQL, MySQL, or managed database (e.g., Supabase, PlanetScale)
- **Why:** Persistent storage for users, projects, tasks, milestones, dependencies, share links
- **Verify:** Database connection string available, migrations can run

### 4. Google OAuth Credentials
- **What:** Google Cloud project with OAuth 2.0 client ID and secret
- **Why:** Google login feature requires OAuth credentials
- **Verify:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables set

### 5. Email Service (optional for MVP)
- **What:** SMTP service or transactional email provider (e.g., Resend, SendGrid)
- **Why:** Password reset emails and account confirmation
- **Verify:** Email sends successfully to test address

### 6. Node.js Runtime
- **What:** Node.js >= 18.0.0
- **Why:** Required for the web framework and build tools
- **Verify:** `node --version` returns >= 18

### 7. Package Manager
- **What:** npm or pnpm
- **Why:** Dependency installation
- **Verify:** `npm --version` or `pnpm --version` available

---

## 7. Mockup References

| Module | File Path |
|--------|-----------|
| Full app overview | `mockups/app-mockup.html` |
| Full app overview v2 | `mockups/app-mockup-v2.html` |
| Authentification & compte | `mockups/authentification-compte.html` |
| Gestion des projets | `mockups/gestion-projets.html` |
| Gestion des taches | `mockups/gestion-taches.html` |
| Vue Gantt interactive | `mockups/vue-gantt.html` |
| Partage & collaboration | `mockups/partage-collaboration.html` |
| Roadmap | `mockups/roadmap.html` |

---

## 8. Epic Breakdown

### Epic 1: Fondations — Auth & Projets
- **Modules:** Authentification & compte, Gestion des projets
- **Stories:** US-E1-001 through US-E1-022 (22 stories: 6 User, 6 Edge, 3 Pair, 7 UI)
- **Dependencies:** None
- **Demo criteria:** Create account, login (email + Google), reset password, create/edit/archive/delete projects, search and filter dashboard, switch grid/list view, manage account settings

### Epic 2: Taches & Jalons
- **Modules:** Gestion des taches
- **Stories:** US-E2-001 through US-E2-016 (16 stories: 3 User, 7 Edge, 3 Pair, 3 UI)
- **Dependencies:** Epic 1 (tasks belong to projects created in E1)
- **Demo criteria:** Create tasks with dates, create milestones, define FTS dependencies via link mode, delete with cascade, filter by project, see stats

### Epic 3: Vue Gantt Interactive
- **Modules:** Vue Gantt interactive
- **Stories:** US-E3-001 through US-E3-020 (20 stories: 3 User, 10 Edge, 2 Pair, 5 UI)
- **Dependencies:** Epic 2 (Gantt displays tasks and milestones from E2)
- **Demo criteria:** Visualize Gantt chart, zoom day/week/month, drag-and-drop tasks, update progress via popup, see dependency arrows, today line, scroll sync

### Epic 4: Partage & Collaboration
- **Modules:** Partage & collaboration
- **Stories:** US-E4-001 through US-E4-020 (20 stories: 3 User, 7 Edge, 4 Pair, 6 UI)
- **Dependencies:** Epic 1 (sharing linked to projects from E1)
- **Demo criteria:** Generate share link with Viewer/Editor role, copy link, revoke with confirmation, see access indicators, stats strip, empty state

### Accessibility (cross-cutting)
- **Stories:** US-A11Y-001 through US-A11Y-004 (4 stories)
- **Dependencies:** Applied across all epics during implementation
- **Demo criteria:** Tab navigation works, focus visible, Escape closes modals, screen readers can describe all elements
