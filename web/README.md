# Pipeline Web GUI

A web-based supervisor dashboard for monitoring and controlling the Claude Code pipeline system. Provides real-time visibility into pipeline execution, worker management, and terminal access.

## Features

- **Pipeline Management**: View, start, stop, and restart pipelines with real-time status updates
- **Visual Pipeline Graph**: See pipeline phases and their current status at a glance
- **Worker Management**: Monitor connected workers, view their status, and manage connection tokens
- **Terminal Views**: Access worker terminals and supervisor sidebar with real-time output
- **Split Terminal**: View multiple worker terminals side-by-side
- **Pipeline Analytics**: View metrics (duration, cost, test pass rate), decision logs, and historical runs
- **Drag & Drop Upload**: Upload project manifests directly via drag-and-drop
- **Authentication**: Password-protected access with JWT-based session management
- **Real-time Updates**: WebSocket-based live updates for all dashboard components

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express 5 + TypeScript
- **Database**: SQLite (via better-sqlite3)
- **State Management**: Zustand
- **Real-time**: Native WebSockets
- **Testing**: Cypress E2E tests (103 tests)

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone [repo]
cd Pipeline-Office/web
npm install
```

### Development

```bash
# Start both client and server in dev mode
npm run dev
```

This starts:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3025 (Express API)

### Testing

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
cd client && npx cypress run --spec "cypress/e2e/epic1-auth.cy.ts"
```

### Deployment

```bash
# Deploy to dev environment
./deploy-dev.sh
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Backend server port | 3025 |
| DASHBOARD_PASSWORD | Admin login password | admin |
| JWT_SECRET | JWT signing secret | (generated) |

## Project Structure

```
web/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   └── services/       # API and WebSocket services
│   └── cypress/            # E2E tests
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth middleware
│   │   └── db/             # Database schema
│   └── db/                 # SQLite database file
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth` - Login with password
- `POST /api/auth/logout` - Logout (client-side token removal)

### Pipelines
- `GET /api/pipelines` - List all pipelines with phases
- `GET /api/pipelines/:id` - Get pipeline details
- `POST /api/pipelines` - Start new pipeline
- `POST /api/pipelines/:id/stop` - Stop running pipeline
- `POST /api/pipelines/:id/signal` - Signal phase completion
- `POST /api/pipelines/:id` - Restart from specific phase
- `DELETE /api/pipelines/:id` - Delete pipeline

### Pipeline Analytics
- `GET /api/pipelines/:id/analytics` - Get pipeline metrics (duration, cost, test pass rate)
- `GET /api/pipelines/:id/decisions` - Get supervisor decision log
- `GET /api/pipelines/:id/history` - Get historical runs for project
- `GET /api/pipelines/:id/runs/:runId` - Get metrics for a specific historical run

### Workers
- `GET /api/workers` - List all workers
- `GET /api/workers/:id` - Get worker details
- `DELETE /api/workers/:id` - Remove worker

### Tokens
- `GET /api/tokens` - List connection tokens
- `POST /api/tokens` - Generate new token
- `DELETE /api/tokens/:id` - Revoke token

### Supervisor & Coordinator
- `POST /api/supervisor/send` - Send message to supervisor
- `POST /api/supervisor/nudge` - Nudge supervisor
- `POST /api/coordinator/restart` - Restart coordinator

### Agent
- `GET /api/agent/:os` - Download agent binary (linux/macos/windows)

## WebSocket Events

### Client -> Server
- `terminal_attach` - Attach to worker/supervisor terminal
- `terminal_detach` - Detach from terminal
- `terminal_data` - Send data to terminal

### Server -> Client
- `pipelines` - Pipeline list updates
- `workers` - Worker list updates
- `terminal_output` - Terminal output stream
- `connection_status` - Connection state changes

## User Stories Implemented

### Epic 1: Authentication
1. **US-001**: Login with password authentication
2. **US-002**: Session persistence across page refreshes
3. **US-003**: Logout with session clearing

### Epic 2: Pipeline Management
4. **US-004**: View all pipelines with real-time updates
5. **US-005**: Visual pipeline graph showing phases
6. **US-006**: Start new pipeline with project path
7. **US-007**: Stop running pipeline
8. **US-008**: Signal phase completion with test counts
9. **US-009**: Restart pipeline from specific phase

### Epic 3: Worker Management
10. **US-010**: View workers list with status
11. **US-011**: Generate and manage connection tokens
12. **US-012**: Download agent binary for each OS
13. **US-013**: Remove workers from system

### Epic 4: Terminal Views
14. **US-014**: View worker terminal output
15. **US-015**: Send messages to worker terminal
16. **US-016**: View supervisor sidebar overlay
17. **US-017**: Send messages and quick actions to supervisor
18. **US-018**: Copy terminal buffer to clipboard
19. **US-019**: Kill worker session
20. **US-020**: Restart coordinator

### Epic 5: New Features
21. **US-021**: Split terminal view for multiple workers
22. **US-022**: Visual pipeline graph with clickable phases
23. **E2E-006-DND**: Drag-and-drop project manifest upload
24. **Delete Pipeline**: Remove pipelines from the system

### Epic 6: Pipeline Analytics
25. **US-023**: View pipeline metrics (duration, cost, test pass rate)
26. **US-024**: View supervisor decision log with filtering
27. **US-025**: View pipeline history and historical runs

## Security

- JWT-based authentication with 7-day expiry
- Password stored in environment variable (not hardcoded)
- Parameterized SQL queries (no SQL injection)
- No innerHTML/dangerouslySetInnerHTML (XSS protected)
- CORS enabled for API access
- Protected routes require valid JWT

## License

MIT
