# Non-Functional Requirements

**Project:** PipelineWebGUI
**Date:** 2025-11-28
**Updated:** Feature Addition (Split Terminal, Drag-Drop, Delete Pipeline, Pipeline Analytics)

## Performance

| Metric | Target |
|--------|--------|
| Initial page load | < 2s |
| API response time | < 500ms |
| WebSocket latency | < 100ms |
| Terminal input latency | < 50ms |
| Concurrent users | 10 (admin dashboard) |
| Pipeline list render | 100+ pipelines without lag |
| File upload | < 5s for 1MB file |

### Terminal Performance
- Terminal should render 60fps for smooth scrolling
- Buffer size: 10,000 lines scrollback
- No noticeable delay when typing in terminal
- **Split view:** Both terminals must maintain 60fps independently
- **Fixed input bars:** Must stay visible while scrolling terminal content

### Drag-and-Drop Performance
- File preview should appear immediately (< 100ms)
- Upload progress indicator for files > 100KB
- No UI blocking during upload

---

## Security

### Authentication
- Single password stored as env var (`DASHBOARD_PASSWORD`)
- Password verified server-side only
- JWT token for session management
- JWT expiry: 7 days
- Token stored in localStorage (acceptable for admin tool)

### Authorization
- All API endpoints require valid JWT
- WebSocket connections authenticated on connect
- No public endpoints except `/api/auth`

### Transport
- HTTPS only (Caddy handles TLS)
- WebSocket over WSS

### Input Validation
- All API inputs validated server-side
- Path inputs sanitized (prevent directory traversal)
- Terminal input escaped appropriately
- **File uploads:** .md extension only, max 10MB
- **Delete operations:** Confirm project path matches expected pattern

### Delete Operations Security
- **Path validation:** Only allow deletion within expected directories
- **Prevent traversal:** Reject paths containing `..`
- **Confirmation required:** Modal with explicit confirmation
- **Audit logging:** Log all delete operations with timestamp, user, path

### Secrets Management
- No secrets in source code
- Password in env var: `DASHBOARD_PASSWORD`
- JWT secret in env var: `JWT_SECRET`
- Worker tokens stored in SQLite (hashed)

---

## Reliability

### Connection Handling
- WebSocket auto-reconnect on disconnect
- Exponential backoff: 1s, 2s, 4s, 8s, max 30s
- Visual indicator when disconnected
- Graceful degradation (view-only mode when WS down)
- **Split terminal:** Each terminal reconnects independently

### Data Persistence
- Pipeline state survives coordinator restart
- SQLite for persistent storage
- Worker tokens persist across restarts
- **Uploaded files:** Persist in project's docs/ folder

### Error Handling
- All errors logged server-side
- User-friendly error messages in UI
- Toast notifications for transient errors
- Error boundaries for component failures
- **Delete errors:** Clear message if folder deletion fails (permissions, in-use)
- **Upload errors:** Retry option for failed uploads

---

## Accessibility

| Requirement | Target |
|-------------|--------|
| WCAG Level | AA |
| Keyboard navigation | Full support |
| Color contrast | 4.5:1 minimum |
| Focus indicators | Visible on all interactive elements |
| Screen reader | Basic support (terminal limited) |

### Terminal Accessibility
- Terminal is inherently challenging for accessibility
- Provide "Copy Output" for screen reader users
- Keyboard navigation for all non-terminal UI
- **Split view:** Tab navigation between Supervisor and Worker panes

### Drag-and-Drop Accessibility
- Click-to-browse fallback for keyboard users
- ARIA labels for drop zone states
- Focus management after file selection

### Modal Accessibility
- Focus trap within modals
- Escape key closes modal
- Confirmation buttons have clear destructive/safe styling

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |

### Desktop Only
- Admin dashboard optimized for desktop
- Minimum viewport: 1024px width
- Mobile not prioritized (admin tool)
- **Split terminal:** Requires minimum 1280px for comfortable viewing

---

## Scalability

### Current Scope
- Single coordinator instance
- 10 concurrent workers max
- 100 pipeline history max
- Single admin user
- **Split terminals:** 2 concurrent terminal sessions per pipeline view

### Future Considerations (out of scope)
- Multi-coordinator deployment
- User roles/permissions
- Horizontal scaling

---

## Monitoring

### Logging
- All API requests logged (method, path, status, duration)
- WebSocket events logged (connect, disconnect, errors)
- Terminal sessions logged (start, end, duration)
- Errors logged with stack traces
- **Delete operations:** Full audit trail (timestamp, path, folder_deleted)
- **File uploads:** Log filename, size, destination

### Health Check
- `/api/health` endpoint returns coordinator status
- Includes: uptime, connected workers, active pipelines

---

## Development

### Code Quality
- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
- No `any` types (except external libraries)

### Testing
- Unit tests for utility functions (Jest)
- E2E tests for user flows (Cypress)
- Target: 80% code coverage
- **New feature tests:** Split terminal, drag-drop, delete pipeline

### Documentation
- API endpoints documented
- WebSocket protocol documented
- Setup instructions in README

---

## New Feature Requirements Summary

### Split Terminal View (US-022)
- Performance: Both terminals at 60fps
- Accessibility: Tab navigation between panes
- Minimum viewport: 1280px recommended
- Error handling: Independent reconnection per terminal

### Drag-and-Drop Upload (US-006)
- Security: .md files only, 10MB max
- Performance: < 5s upload for 1MB
- Accessibility: Click-to-browse fallback

### Delete Pipeline (US-021)
- Security: Path validation, traversal prevention
- Logging: Full audit trail
- UX: Confirmation modal with explicit path display

### Pipeline Analytics (US-023, US-024, US-025)
- Performance: Analytics view loads < 500ms
- Performance: 30-second polling for running pipelines (not faster to avoid server load)
- Performance: Decision log handles 500+ entries without lag (virtual scrolling if needed)
- Performance: History tab handles 100+ runs without performance degradation
- Data freshness: Metrics update every 30s for running pipelines
- Export: JSON export downloads immediately (< 1s for typical data)
- Error handling: Graceful degradation if manifest/log files missing
- Accessibility: Tab navigation between Metrics/Decisions/History tabs
- Accessibility: Filter buttons keyboard accessible
