# User Stories — GanttFlow

## Summary
- User stories (🟢): 15
- Edge cases (⚠️): 45
- Completeness pairs (🔄): 8
- UI coverage (🖼️): 10
- Accessibility (♿): 4
- **TOTAL: 82**

## Epic Dependency Graph

```
Epic 1 (Foundations)
  |
  +---> Epic 2 (Gantt) --+
  |                       +--> Epic 4 (Export)
  +---> Epic 3 (Collab)
```

Build order: **E1 → E2 + E3 (parallel) → E4**

---

## Epic 1 — Projets & Structure des Tâches (Foundations)

### US-E1-001 🟢 User
**As a** user, **I want to** create a project with a name, start date, and end date **so that** I have a clear time frame for planning.

**Acceptance Criteria:**
- [ ] Clicking "+ Nouveau projet" opens an inline creation form
- [ ] Form contains fields: Name (text), Status (select), Start date (date), End date (date)
- [ ] Clicking "Créer le projet" saves the project and adds a card to the dashboard
- [ ] The new project appears in the grid without page reload
- [ ] Start date must be before or equal to end date

---

### US-E1-002 ⚠️ Edge
**As a** user, **I want to** see a validation error when I submit a project with an empty name **so that** I don't create unnamed projects.

**Acceptance Criteria:**
- [ ] Submitting the form with an empty name field shows an inline error message
- [ ] The project is not created
- [ ] Focus moves to the name input field

---

### US-E1-003 ⚠️ Edge
**As a** user, **I want to** see a validation error when start date is after end date **so that** I don't create a project with impossible dates.

**Acceptance Criteria:**
- [ ] Submitting the form with start > end date shows an inline error
- [ ] The project is not created
- [ ] The date fields are highlighted as invalid

---

### US-E1-004 ⚠️ Edge
**As a** user, **I want to** cancel project creation mid-form **so that** I can abandon without saving incomplete data.

**Acceptance Criteria:**
- [ ] Clicking "Annuler" collapses the creation form
- [ ] No project is created
- [ ] Form fields are reset to defaults on next open

---

### US-E1-005 🟢 User
**As a** user, **I want to** see all my projects in a dashboard **so that** I can track overall progress at a glance.

**Acceptance Criteria:**
- [ ] Dashboard displays project cards in a responsive grid
- [ ] Each card shows: status badge, project name, team avatars, deadline, progress bar (%)
- [ ] Dashboard loads within 2 seconds for up to 50 projects
- [ ] Cards are ordered by most recent activity

---

### US-E1-006 ⚠️ Edge
**As a** user, **I want to** see an empty state message when I have no projects **so that** I know how to get started.

**Acceptance Criteria:**
- [ ] When 0 projects exist, a placeholder message is shown (e.g., "Aucun projet — créez votre premier projet")
- [ ] A call-to-action button or link to create a project is visible
- [ ] The empty state disappears once a project is created

---

### US-E1-007 ⚠️ Edge
**As a** user, **I want to** see a loading skeleton while the dashboard loads **so that** I know the app is working.

**Acceptance Criteria:**
- [ ] While projects are loading, placeholder skeleton cards are displayed
- [ ] Skeletons are replaced by real cards once data arrives
- [ ] If loading fails, an error message with retry option is shown

---

### US-E1-008 ⚠️ Edge
**As a** user, **I want to** see the dashboard correctly when all projects share the same status **so that** filters still work with uniform data.

**Acceptance Criteria:**
- [ ] Filtering by a status that matches all projects shows all cards
- [ ] Filtering by a status with zero matches shows an empty state
- [ ] The "Tous" filter always shows all projects

---

### US-E1-009 🟢 User
**As a** user, **I want to** archive a completed project **so that** my workspace stays clean.

**Acceptance Criteria:**
- [ ] Three-dot menu on each card contains an "Archiver" option
- [ ] Clicking "Archiver" removes the card from the main dashboard grid
- [ ] The archived project is not deleted — it persists in storage
- [ ] A confirmation prompt or undo toast is shown before/after archiving

---

### US-E1-010 ⚠️ Edge
**As a** user, **I want to** be prevented from archiving a project that has active collaborators editing it **so that** I don't disrupt their work unexpectedly.

**Acceptance Criteria:**
- [ ] If active editors are detected, a warning dialog is shown
- [ ] The user can choose to proceed or cancel
- [ ] Proceeding archives the project and notifies collaborators

---

### US-E1-011 ⚠️ Edge
**As a** user, **I want to** see a count of archived projects somewhere **so that** I know I have archived work I can retrieve.

**Acceptance Criteria:**
- [ ] A subtle indicator (e.g., "3 projets archivés") appears on the dashboard
- [ ] Clicking it reveals the archived projects list

---

### US-E1-012 ⚠️ Edge
**As a** user, **I want to** archive the last remaining project **so that** the dashboard returns to the empty state cleanly.

**Acceptance Criteria:**
- [ ] After archiving the last project, the empty state is displayed
- [ ] The archived project count indicator still shows
- [ ] No UI glitches occur during the transition

---

### US-E1-013 🔄 Pair
**As a** user, **I want to** restore an archived project **so that** I can resume work on it.

**Acceptance Criteria:**
- [ ] Archived projects are accessible from an "Archived" section or filter
- [ ] A "Restaurer" action moves the project back to the main dashboard
- [ ] The restored project retains all its data (tasks, members, dependencies)
- [ ] The project status is preserved as it was before archiving

---

### US-E1-014 🔄 Pair
**As a** user, **I want to** delete a project permanently **so that** I can remove projects I no longer need.

**Acceptance Criteria:**
- [ ] A "Supprimer" option is available (in context menu or archive view)
- [ ] A confirmation dialog warns that deletion is irreversible
- [ ] Confirming deletes all project data (tasks, dependencies, members)
- [ ] The project is removed from the dashboard and archive

---

### US-E1-015 🖼️ UI
**As a** user, **I want to** edit an existing project's name, dates, and status **so that** I can update project details as plans change.

**Acceptance Criteria:**
- [ ] Clicking "Modifier" in the three-dot context menu opens an edit form
- [ ] The form is pre-filled with existing project data
- [ ] Saving updates the project card immediately
- [ ] Canceling discards changes

---

### US-E1-016 🖼️ UI
**As a** user, **I want to** duplicate a project **so that** I can reuse a project structure as a template.

**Acceptance Criteria:**
- [ ] Clicking "Dupliquer" in the context menu creates a copy of the project
- [ ] The copy has the same tasks, phases, and structure but a new name (e.g., "Projet X (copie)")
- [ ] The copy has no collaborators (only the creator)
- [ ] The new project card appears in the dashboard

---

### US-E1-017 🖼️ UI
**As a** user, **I want to** filter projects by status (Tous / En cours / En pause / Terminé) **so that** I can focus on relevant projects.

**Acceptance Criteria:**
- [ ] Status filter pills are displayed above the project grid
- [ ] Clicking a pill filters the grid to show only matching projects
- [ ] The active pill is visually highlighted
- [ ] "Tous" shows all non-archived projects
- [ ] Filter state is preserved during the session

---

### US-E1-018 🟢 User
**As a** user, **I want to** create sub-tasks attached to a parent phase **so that** I can break down work into steps.

**Acceptance Criteria:**
- [ ] Each phase group has an "+ Ajouter une tâche" button at the bottom
- [ ] Clicking it creates a new task row within that phase
- [ ] The new task has default empty fields (name, dates, no dependency)
- [ ] The phase task count updates automatically

---

### US-E1-019 ⚠️ Edge
**As a** user, **I want to** see a validation error when I create a task with no name **so that** all tasks are identifiable.

**Acceptance Criteria:**
- [ ] Attempting to save a task with an empty name shows an inline error
- [ ] The task is not saved until a name is provided
- [ ] Focus moves to the name field

---

### US-E1-020 ⚠️ Edge
**As a** user, **I want to** see a warning when I create a task with dates outside the project's date range **so that** I'm aware of scheduling conflicts.

**Acceptance Criteria:**
- [ ] A warning indicator appears on the task row
- [ ] The task is still created (warning, not blocking)
- [ ] The warning disappears if dates are corrected

---

### US-E1-021 ⚠️ Edge
**As a** user, **I want to** handle creating a task in an empty phase **so that** phases without tasks work correctly.

**Acceptance Criteria:**
- [ ] An empty phase shows a placeholder message
- [ ] The "+ Ajouter une tâche" button is still visible and functional
- [ ] After adding the first task, the placeholder disappears

---

### US-E1-022 🔄 Pair
**As a** user, **I want to** delete a task **so that** I can remove tasks that are no longer relevant.

**Acceptance Criteria:**
- [ ] Each task row has a delete option (context menu or button)
- [ ] Deleting a task removes it from the phase and Gantt chart
- [ ] If the task had dependents, dependents lose their dependency link
- [ ] The phase task count updates automatically

---

### US-E1-023 🟢 User
**As a** user, **I want to** define a Finish-to-Start dependency between two tasks **so that** the schedule recalculates automatically.

**Acceptance Criteria:**
- [ ] A dependency picker allows selecting a predecessor task
- [ ] The dependent task shows an "Après: [task name]" label
- [ ] Moving the predecessor automatically shifts the dependent task's start date
- [ ] Cascade recalculation propagates through the full dependency chain

---

### US-E1-024 ⚠️ Edge
**As a** user, **I want to** be prevented from creating a circular dependency **so that** the schedule doesn't loop infinitely.

**Acceptance Criteria:**
- [ ] Attempting to create A→B→A shows an error message
- [ ] The dependency is not created
- [ ] Deep cycles (A→B→C→A) are also detected and blocked

---

### US-E1-025 ⚠️ Edge
**As a** user, **I want to** see clear feedback when cascade recalculation shifts multiple tasks **so that** I understand the impact of my change.

**Acceptance Criteria:**
- [ ] After a dependency shift, affected tasks are briefly highlighted
- [ ] A notification or toast shows how many tasks were shifted
- [ ] The shifted dates are immediately reflected in the task list and Gantt

---

### US-E1-026 ⚠️ Edge
**As a** user, **I want to** handle a dependency on a task that gets deleted **so that** orphaned dependencies don't break the schedule.

**Acceptance Criteria:**
- [ ] When a predecessor task is deleted, the "Après: [task]" label is removed from dependents
- [ ] Dependent tasks retain their current dates (no shift)
- [ ] No errors occur in the dependency engine

---

### US-E1-027 🔄 Pair
**As a** user, **I want to** remove a dependency between two tasks **so that** they become independently scheduled.

**Acceptance Criteria:**
- [ ] A remove/unlink option is available on the dependency label
- [ ] Removing the dependency does not change the dependent task's dates
- [ ] The "Après: [task]" label disappears from the task row
- [ ] The Gantt chart updates to remove the dependency arrow

---

### US-E1-028 🟢 User
**As a** user, **I want to** assign a duration and dates to each task **so that** the Gantt chart reflects reality.

**Acceptance Criteria:**
- [ ] Each task has editable start date and end date fields
- [ ] Duration is calculated automatically from the date range
- [ ] Changing dates updates the Gantt bar position and length
- [ ] Dates are validated (start ≤ end)

---

### US-E1-029 ⚠️ Edge
**As a** user, **I want to** handle setting a task duration of zero days **so that** milestones are visually distinct.

**Acceptance Criteria:**
- [ ] A task with start = end date is displayed as a milestone diamond (or minimal bar)
- [ ] The milestone is still draggable on the Gantt chart
- [ ] Zero-duration tasks participate in dependency chains normally

---

### US-E1-030 ⚠️ Edge
**As a** user, **I want to** see a warning when a task's dates overlap with a predecessor's dates given the dependency **so that** I know the schedule is inconsistent.

**Acceptance Criteria:**
- [ ] A visual warning (icon/color) appears on the conflicting task
- [ ] The warning explains the scheduling conflict
- [ ] The user can resolve by adjusting dates

---

### US-E1-031 ⚠️ Edge
**As a** user, **I want to** handle editing dates of a task that has many downstream dependents (>10) **so that** performance remains acceptable.

**Acceptance Criteria:**
- [ ] Cascade recalculation completes within 1 second for chains up to 100 tasks
- [ ] A progress indicator appears for long recalculations
- [ ] All affected tasks are updated correctly

---

### US-E1-032 🖼️ UI
**As a** user, **I want to** assign a team member to a task **so that** responsibilities are clear.

**Acceptance Criteria:**
- [ ] Each task row has an assignee field showing a user avatar
- [ ] Clicking the field opens a dropdown of project members
- [ ] Selecting a member assigns them and shows their avatar on the task row
- [ ] A task can have one assignee (V1)

---

### US-E1-033 🖼️ UI
**As a** user, **I want to** collapse and expand phase groups **so that** I can focus on specific phases.

**Acceptance Criteria:**
- [ ] Clicking the phase header arrow toggles the group between expanded/collapsed
- [ ] Collapsed phases show only the header with task count and date range
- [ ] Expanded phases show all task rows
- [ ] Collapse state is preserved within the session

---

---

## Epic 2 — Vue Gantt Interactive (Visualization)

### US-E2-001 🟢 User
**As a** user, **I want to** see a vertical "today" line on the Gantt chart **so that** I can instantly see where I am in the timeline.

**Acceptance Criteria:**
- [ ] A red vertical line is drawn at the current date's position
- [ ] The line has an "Auj." label at the top
- [ ] The line updates if the chart is open across midnight
- [ ] The line is visible at all zoom levels

---

### US-E2-002 ⚠️ Edge
**As a** user, **I want to** see the today line positioned correctly when today is outside the visible date range **so that** I know I'm viewing past or future tasks.

**Acceptance Criteria:**
- [ ] If today is before the visible range, the line does not appear but a left-edge indicator shows "← Aujourd'hui"
- [ ] If today is after the visible range, a right-edge indicator shows "Aujourd'hui →"
- [ ] The indicator helps the user scroll to today

---

### US-E2-003 ⚠️ Edge
**As a** user, **I want to** see the today line correctly on the first day of a project **so that** the chart renders properly at the start.

**Acceptance Criteria:**
- [ ] The today line appears at the leftmost position if today equals the project start date
- [ ] No rendering issues occur with the line at the chart edge
- [ ] The label "Auj." does not overlap with the chart header

---

### US-E2-004 ⚠️ Edge
**As a** user, **I want to** see the today line in the correct position across timezones **so that** the chart is accurate for all team members.

**Acceptance Criteria:**
- [ ] The today line uses the user's local timezone
- [ ] The date calculation handles UTC offset correctly
- [ ] Daylight saving time transitions do not shift the line incorrectly

---

### US-E2-005 🟢 User
**As a** user, **I want to** switch between zoom levels (Semaine / Mois / Trimestre) **so that** I get the right level of detail.

**Acceptance Criteria:**
- [ ] Three zoom buttons are displayed above the Gantt chart
- [ ] Semaine: 42px/day, ~21-day visible range
- [ ] Mois: 16px/day, ~90-day visible range
- [ ] Trimestre: 8px/day, ~180-day visible range
- [ ] The active zoom button is visually highlighted

---

### US-E2-006 ⚠️ Edge
**As a** user, **I want to** maintain my scroll position when switching zoom levels **so that** I don't lose context.

**Acceptance Criteria:**
- [ ] Switching zoom keeps the center date approximately in view
- [ ] Task bars rescale smoothly without visual jumps
- [ ] The today line remains correctly positioned

---

### US-E2-007 ⚠️ Edge
**As a** user, **I want to** see the Gantt chart render correctly with zero tasks **so that** an empty project doesn't crash the view.

**Acceptance Criteria:**
- [ ] An empty Gantt chart shows the timeline grid and today line
- [ ] A message or placeholder indicates "Aucune tâche à afficher"
- [ ] Zoom controls still function

---

### US-E2-008 ⚠️ Edge
**As a** user, **I want to** see the Gantt chart perform smoothly with 100 tasks **so that** large projects remain usable.

**Acceptance Criteria:**
- [ ] Rendering 100 task bars maintains 60fps scrolling
- [ ] Drag-and-drop response time stays under 16ms
- [ ] Zoom transitions complete within 300ms

---

### US-E2-009 🟢 User
**As a** user, **I want to** drag-and-drop a task bar to reposition it on the timeline **so that** I can adjust the schedule visually.

**Acceptance Criteria:**
- [ ] Task bars are draggable horizontally with mouse
- [ ] Task bars are draggable with touch gestures on mobile/tablet
- [ ] Dropping a bar updates the task's start and end dates
- [ ] Dependent tasks cascade-recalculate when a predecessor is moved
- [ ] The bar snaps to day boundaries

---

### US-E2-010 ⚠️ Edge
**As a** user, **I want to** be prevented from dragging a task bar before the project start date **so that** tasks stay within the project bounds.

**Acceptance Criteria:**
- [ ] Dragging stops at the project start date boundary
- [ ] A visual indicator (snap/resistance) shows the boundary
- [ ] The bar cannot be dropped outside the project date range

---

### US-E2-011 ⚠️ Edge
**As a** user, **I want to** see the dependency arrows update in real-time while dragging a task **so that** I understand the impact.

**Acceptance Criteria:**
- [ ] Dependency lines between bars update position during drag
- [ ] Dependent task bars shift visually during drag preview
- [ ] Releasing the drag commits all changes atomically

---

### US-E2-012 ⚠️ Edge
**As a** user, **I want to** undo an accidental drag-and-drop **so that** I can reverse mistakes.

**Acceptance Criteria:**
- [ ] Ctrl+Z (or Cmd+Z on Mac) undoes the last drag operation
- [ ] The task bar and all cascaded dependents return to their previous positions
- [ ] The undo history supports at least the last 5 operations

---

---

## Epic 3 — Multi-utilisateurs & Rôles (Collaboration)

### US-E3-001 🟢 User
**As a** project manager, **I want to** invite a collaborator by email **so that** they can access the project without complex registration.

**Acceptance Criteria:**
- [ ] Clicking "+ Inviter" shows an email invitation form
- [ ] The form has an email input and a role dropdown (Éditeur / Lecteur)
- [ ] Submitting sends an invitation email with a project access link
- [ ] The invited member appears in the member list with "pending" status until they accept

---

### US-E3-002 ⚠️ Edge
**As a** project manager, **I want to** see an error when I invite an invalid email address **so that** invitations go to real addresses.

**Acceptance Criteria:**
- [ ] Submitting with an invalid email format shows an inline error
- [ ] The invitation is not sent
- [ ] Valid formats: user@domain.tld

---

### US-E3-003 ⚠️ Edge
**As a** project manager, **I want to** see a warning when I invite someone who is already a member **so that** I don't send duplicate invitations.

**Acceptance Criteria:**
- [ ] Submitting an email of an existing member shows a "déjà membre" warning
- [ ] No duplicate invitation is sent
- [ ] The existing member's role is not changed

---

### US-E3-004 ⚠️ Edge
**As a** project manager, **I want to** invite up to the 20-member limit **so that** the team size constraint is enforced.

**Acceptance Criteria:**
- [ ] When a project has 20 members, the invite form is disabled
- [ ] A message explains the limit: "Nombre maximum de membres atteint (20)"
- [ ] The "+ Inviter" button is grayed out

---

### US-E3-005 🟢 User
**As a** project manager, **I want to** assign a Reader role to a client **so that** they can view the schedule without modifying it.

**Acceptance Criteria:**
- [ ] The role dropdown in the invite form includes "Lecteur"
- [ ] A Lecteur cannot edit tasks, dates, or dependencies
- [ ] A Lecteur can view the dashboard, task list, Gantt chart, and activity log
- [ ] Edit buttons and drag handles are hidden for Lecteur users

---

### US-E3-006 ⚠️ Edge
**As a** user with Lecteur role, **I want to** see disabled edit controls **so that** I understand I have read-only access.

**Acceptance Criteria:**
- [ ] Task names, dates, and dependencies are displayed but not editable
- [ ] Gantt task bars are not draggable
- [ ] The "+ Ajouter une tâche" and "+ Nouveau projet" buttons are hidden
- [ ] A badge or banner indicates "Mode lecture seule"

---

### US-E3-007 ⚠️ Edge
**As a** project manager, **I want to** toggle a member's role between Éditeur and Lecteur **so that** I can adjust permissions as needed.

**Acceptance Criteria:**
- [ ] Clicking the role badge on a member toggles between Éditeur and Lecteur
- [ ] The role change takes effect immediately
- [ ] The member's UI updates on their next action or page refresh
- [ ] The role change is logged in the activity log

---

### US-E3-008 ⚠️ Edge
**As a** project manager, **I want to** be prevented from demoting myself from Éditeur **so that** the project always has at least one editor.

**Acceptance Criteria:**
- [ ] The project creator cannot change their own role to Lecteur
- [ ] If only one Éditeur remains, their role badge is not clickable
- [ ] A tooltip explains "Au moins un éditeur requis"

---

### US-E3-009 🟢 User
**As a** user, **I want to** see who modified a task and when **so that** I can track changes without meetings.

**Acceptance Criteria:**
- [ ] An activity log panel shows a chronological list of changes
- [ ] Each entry shows: actor name, action description, timestamp
- [ ] Activity types include: task creation, modification, deletion, dependency changes, member additions
- [ ] The log is scrollable and shows the most recent entries first

---

### US-E3-010 ⚠️ Edge
**As a** user, **I want to** see the activity log when no changes have been made yet **so that** the empty log doesn't look broken.

**Acceptance Criteria:**
- [ ] An empty activity log shows "Aucune activité pour le moment"
- [ ] The log section is still visible and properly styled
- [ ] The first logged action appears as soon as a change is made

---

### US-E3-011 ⚠️ Edge
**As a** user, **I want to** see grouped activity entries when many rapid changes occur **so that** the log stays readable.

**Acceptance Criteria:**
- [ ] Multiple changes by the same user within 5 minutes are grouped
- [ ] Grouped entries show a count (e.g., "A modifié 5 tâches")
- [ ] Expanding the group shows individual change details

---

### US-E3-012 ⚠️ Edge
**As a** user, **I want to** see the activity log load efficiently with 500+ entries **so that** the panel doesn't slow down the app.

**Acceptance Criteria:**
- [ ] The log uses pagination or virtual scrolling (loads 50 entries at a time)
- [ ] Scrolling to the bottom loads older entries
- [ ] Total entry count is displayed at the top

---

### US-E3-013 🔄 Pair
**As a** project manager, **I want to** remove a team member from the project **so that** former collaborators lose access.

**Acceptance Criteria:**
- [ ] Each member row has a remove option (icon or context menu)
- [ ] The project creator cannot be removed
- [ ] Removing a member revokes their access immediately
- [ ] Tasks assigned to the removed member become unassigned

---

### US-E3-014 🖼️ UI
**As a** user, **I want to** see online status indicators (online / away / offline) for team members **so that** I know who is available.

**Acceptance Criteria:**
- [ ] Each member avatar has a colored dot: green (online), yellow (away), gray (offline)
- [ ] Status updates in near-real-time via WebSocket
- [ ] Status is visible in the member list panel

---

### US-E3-015 🖼️ UI
**As a** user, **I want to** filter the activity log by type **so that** I can find specific changes.

**Acceptance Criteria:**
- [ ] A "Filtrer" button opens a filter dropdown
- [ ] Filter options include: All, Task modifications, Additions, Deletions, Dependency changes
- [ ] The selected filter persists during the session
- [ ] The log updates immediately when a filter is applied

---

---

## Epic 4 — Export & Partage (Export & Share)

### US-E4-001 🟢 User
**As a** user, **I want to** choose a date range to export **so that** I only show the relevant phase.

**Acceptance Criteria:**
- [ ] Date range picker has From and To date inputs
- [ ] The preview updates to reflect the selected date range
- [ ] Tasks outside the range are excluded from the export
- [ ] Default range is the full project date range

---

### US-E4-002 ⚠️ Edge
**As a** user, **I want to** see a warning when the selected export range contains no tasks **so that** I don't generate an empty export.

**Acceptance Criteria:**
- [ ] If no tasks fall within the selected range, a warning message appears
- [ ] The download button is disabled until a valid range is selected
- [ ] The preview panel shows "Aucune tâche dans cette plage"

---

### US-E4-003 ⚠️ Edge
**As a** user, **I want to** handle an export date range where From equals To **so that** single-day exports work.

**Acceptance Criteria:**
- [ ] A single-day range exports only tasks active on that date
- [ ] The export is generated without errors
- [ ] The Gantt shows a single-day view if applicable

---

### US-E4-004 ⚠️ Edge
**As a** user, **I want to** see a validation error when From date is after To date **so that** invalid ranges are prevented.

**Acceptance Criteria:**
- [ ] Setting From > To shows an inline error
- [ ] The export and preview are disabled
- [ ] Correcting the dates clears the error

---

### US-E4-005 🟢 User
**As a** user, **I want to** export the Gantt chart as PDF **so that** I can include it in presentations.

**Acceptance Criteria:**
- [ ] Clicking the PDF format tab selects PDF export
- [ ] The preview shows a PDF icon and readiness status
- [ ] Clicking "Télécharger" generates and downloads a PDF file
- [ ] The PDF contains the Gantt chart with task bars, labels, and timeline
- [ ] Export completes within 5 seconds

---

### US-E4-006 ⚠️ Edge
**As a** user, **I want to** see a loading state while the export is being generated **so that** I know the process is working.

**Acceptance Criteria:**
- [ ] The "Télécharger" button shows a spinner while generating
- [ ] The button is disabled during generation to prevent double-clicks
- [ ] If generation fails, an error message is shown with retry option

---

### US-E4-007 ⚠️ Edge
**As a** user, **I want to** export a project with 100 tasks without timeout **so that** large exports succeed.

**Acceptance Criteria:**
- [ ] PDF/PNG export of 100 tasks completes within 5 seconds
- [ ] CSV/Excel export completes within 2 seconds
- [ ] No browser timeout occurs during generation

---

### US-E4-008 ⚠️ Edge
**As a** user, **I want to** export a project that has no tasks **so that** I get a clear empty-state document.

**Acceptance Criteria:**
- [ ] Exporting an empty project generates a valid file
- [ ] The export contains the project header but no task data
- [ ] A note "Aucune tâche" is included in the output

---

### US-E4-009 🖼️ UI
**As a** user, **I want to** export the Gantt chart as PNG, CSV, or Excel **so that** I can use different formats for different needs.

**Acceptance Criteria:**
- [ ] Format tabs include PNG, CSV, and Excel alongside PDF
- [ ] PNG export generates a high-resolution image of the Gantt chart
- [ ] CSV export contains a table of tasks with columns: Name, Phase, Start, End, Duration, Dependency, Assignee, Status
- [ ] Excel export contains the same data as CSV with formatted cells
- [ ] Each format is downloadable via the "Télécharger" button

---

### US-E4-010 🖼️ UI
**As a** user, **I want to** choose the export orientation (Paysage / Portrait) **so that** the layout fits my needs.

**Acceptance Criteria:**
- [ ] An orientation dropdown offers Paysage (recommended) and Portrait
- [ ] Paysage is selected by default
- [ ] The preview reflects the selected orientation
- [ ] Orientation applies to PDF and PNG exports

---

### US-E4-011 🖼️ UI
**As a** user, **I want to** choose the export content (Gantt + task list / Gantt only / Task list only) **so that** I include only what's relevant.

**Acceptance Criteria:**
- [ ] A content dropdown offers three options
- [ ] "Gantt + liste des tâches" is selected by default
- [ ] The preview updates to reflect the content selection
- [ ] Content filter applies to PDF and PNG exports

---

### US-E4-012 🟢 User
**As a** user, **I want to** generate a read-only share link **so that** I can send a live view to a client.

**Acceptance Criteria:**
- [ ] Clicking "Générer un lien" creates a unique URL
- [ ] The URL grants read-only access to the Gantt view
- [ ] The link includes the currently selected date range
- [ ] The shared view does not require login

---

### US-E4-013 ⚠️ Edge
**As a** user, **I want to** share a link that remains valid even if the project is updated **so that** clients always see the latest version.

**Acceptance Criteria:**
- [ ] The share link shows the live project state (not a snapshot)
- [ ] Task changes by editors are reflected in real-time for link viewers
- [ ] The link does not expire by default (optional expiration in future versions)

---

### US-E4-014 ⚠️ Edge
**As a** user, **I want to** handle opening a share link for a deleted project **so that** the viewer sees a meaningful message.

**Acceptance Criteria:**
- [ ] If the project no longer exists, the share link page shows "Ce projet n'existe plus"
- [ ] No sensitive data is leaked
- [ ] The page offers a link back to GanttFlow home

---

### US-E4-015 ⚠️ Edge
**As a** user, **I want to** generate a new share link (invalidating the old one) **so that** I can revoke previous access.

**Acceptance Criteria:**
- [ ] Generating a new link replaces the previous link token
- [ ] The old URL returns "Lien expiré ou invalide"
- [ ] The new link is immediately copyable

---

### US-E4-016 🔄 Pair
**As a** user, **I want to** revoke a share link **so that** external viewers can no longer access the project.

**Acceptance Criteria:**
- [ ] A "Révoquer" option is available next to the active share link
- [ ] Revoking immediately invalidates the URL
- [ ] Viewers accessing the revoked link see "Lien expiré ou invalide"
- [ ] A new link can be generated afterwards

---

### US-E4-017 🖼️ UI
**As a** user, **I want to** copy the share link to my clipboard with one click **so that** I can paste it quickly.

**Acceptance Criteria:**
- [ ] A "Copier" button is displayed next to the share URL
- [ ] Clicking it copies the URL to the clipboard
- [ ] The button text changes to "Copié !" for 2 seconds as confirmation
- [ ] The button reverts to "Copier" after the confirmation period

---

---

## Accessibility

### US-A11Y-001 ♿ A11Y
**As a** user, **I want to** navigate the entire app with keyboard (Tab / Enter / Space) **so that** I can use the app without a mouse.

**Acceptance Criteria:**
- [ ] All interactive elements (buttons, inputs, links, cards) are reachable via Tab
- [ ] Enter or Space activates buttons and links
- [ ] Tab order follows the visual layout (left-to-right, top-to-bottom)
- [ ] No keyboard traps exist (user can always Tab out of any component)
- [ ] Gantt chart task bars can be moved with arrow keys when focused

---

### US-A11Y-002 ♿ A11Y
**As a** user, **I want to** see a visible focus indicator on all focusable elements **so that** I can track my position when navigating by keyboard.

**Acceptance Criteria:**
- [ ] Every focusable element has a visible outline or ring when focused
- [ ] The focus indicator has sufficient contrast against the dark background (WCAG AA)
- [ ] Focus indicators are consistent in style across the application
- [ ] Custom components (Gantt bars, filter pills) have focus indicators too

---

### US-A11Y-003 ♿ A11Y
**As a** user, **I want to** close any modal or dialog by pressing Escape **so that** I can dismiss them quickly.

**Acceptance Criteria:**
- [ ] Pressing Escape closes any open modal, dropdown, or dialog
- [ ] Focus returns to the element that triggered the modal
- [ ] The Escape key works regardless of focus position within the modal
- [ ] Context menus (three-dot menu) close on Escape as well

---

### US-A11Y-004 ♿ A11Y
**As a** user, **I want to** have all interactive elements with aria-labels **so that** screen readers can describe them to me.

**Acceptance Criteria:**
- [ ] All buttons have descriptive aria-labels (e.g., aria-label="Créer un nouveau projet")
- [ ] Icon-only buttons have aria-labels describing their action
- [ ] Form inputs have associated labels or aria-labelledby
- [ ] Status badges and progress bars have aria roles and aria-valuetext
- [ ] Gantt task bars have aria-labels with task name, dates, and completion %
