# User Stories: CascadeSim V2.1

**Source:** `brainstorm-notes-v2.1.md` (Finalized 2026-02-11)
**Generated:** 2026-02-11
**Stack:** Web (Desktop browser target)
**Base:** V2 complete (Epics 1-10, 240 tests passing)
**New Epics:** 2 | **New Stories:** 12

---

## Summary Table

| # | Epic | Stories | Priority | Depends On |
|---|------|---------|----------|------------|
| E11 | Progressive Tutorial System | 7 | P1 | E8, E9, E10 (V2) |
| E12 | VPS Deployment | 5 | P0 | E9 (y-websocket) |

**Priority key:** P0 = must-ship (production deploy), P1 = high value (onboarding overhaul)

**Parallelization:** E11 and E12 have no cross-dependency and can be built concurrently.

---

## Dependency Graph

```
V2 (E1-E10) ─── Complete ───┐
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
    E11 (Progressive Tutorial)   E12 (VPS Deployment)
         depends on E8               depends on E9
         (Driver.js, ELK)          (y-websocket server)
```

---

## New Libraries

| Package | Version | Purpose | Epic |
|---------|---------|---------|------|
| — | — | No new libraries — E11 uses existing Driver.js + ELK from V2 | E11 |
| `pm2` | ^5 | Process manager for y-websocket production server | E12 |

---

## E11: Progressive Tutorial System

Replaces the current 7-step single walkthrough (E8) with a progressive 4-phase tutorial system. Each phase teaches a category of features, unlocks sequentially, and uses action-based steps so users learn by doing. Reuses existing Driver.js integration.

**Depends on:** E8 (Driver.js, ELK), E9-E10 (collaboration features taught in Phase 4)

---

### US-11.1: Tutorial Phase System & Progress UI

**As a** user,
**I want to** see a tutorial menu with 4 unlockable phases,
**so that** I can learn CascadeSim progressively from basics to advanced features.

**Acceptance Criteria:**
- [ ] The existing "?" help button opens a tutorial menu (replaces the current single "Replay Tutorial" option)
- [ ] Tutorial menu shows 4 phase cards in a vertical list:
  - Phase 1: Solo Basics
  - Phase 2: Advanced Modeling
  - Phase 3: Reading Results
  - Phase 4: Collaboration
- [ ] Each card shows: phase title, short description, step count, and completion status (locked / available / in-progress / complete)
- [ ] Phase 1 is always unlocked. Phases 2-4 unlock when the previous phase is completed
- [ ] Locked phases show a lock icon and are non-clickable
- [ ] Completed phases show a checkmark and can be replayed
- [ ] A progress bar at the top shows overall tutorial completion (e.g., "2 of 4 phases complete")
- [ ] Progress is persisted in localStorage under key `cascadesim-tutorial-progress`
- [ ] On first visit (no localStorage key), the tutorial menu auto-opens with Phase 1 highlighted

**E2E Test:** `epic11-tutorial-phase-system.spec.ts` — Open tutorial menu, verify 4 phases shown. Verify Phase 1 is unlocked, Phases 2-4 are locked. Complete Phase 1 (mock via localStorage), reopen menu, verify Phase 2 is now unlocked. Verify progress bar updates.

---

### US-11.2: Phase 1 — Solo Basics

**As a** new user,
**I want to** follow a guided tutorial that teaches me to drag components, configure them, create chains, build a scenario, and run a simulation,
**so that** I can build and simulate my first model from scratch.

**Acceptance Criteria:**
- [ ] Phase 1 consists of 5 action-based steps (refined from V2's 7-step tutorial):
  1. **Drag a component** — spotlight palette, user must drag an Internal component onto the canvas
  2. **Configure it** — spotlight properties panel, user must rename the component and add a parameter
  3. **Create a chain** — spotlight context menu, user must right-click and create a causal chain (guided through the chain builder)
  4. **Build a scenario** — spotlight Scenarios tab, user must switch to Scenarios and add a forced event
  5. **Run simulation** — spotlight Simulate tab, user must click Run and see results
- [ ] Each step uses Driver.js to spotlight the target element with a dimmed backdrop
- [ ] Each step shows a popover with: step title, instruction text, step counter (e.g., "Step 2 of 5"), and progress dots
- [ ] The "Next" button is disabled until the required action is performed
- [ ] A "Skip Step" link is available as fallback on each step
- [ ] Completing an action shows a brief checkmark animation before advancing
- [ ] Arrow keys (Left/Right) navigate between steps; Esc dismisses the tutorial
- [ ] On completion, a success overlay shows "Phase 1 Complete!" with a "Continue to Phase 2" button
- [ ] Phase 1 completion is saved to localStorage; Phase 2 becomes unlocked

**E2E Test:** `epic11-phase1-solo-basics.spec.ts` — Start Phase 1, verify step 1 spotlights component palette. Drag component, verify step advances. Complete all 5 steps via required actions. Verify completion overlay appears with "Phase 1 Complete!" message. Verify Phase 2 is now unlocked in the tutorial menu.

---

### US-11.3: Phase 2 — Advanced Modeling

**As a** user who completed Phase 1,
**I want to** learn about branching chains, parameter editing, ELK auto-layout, and the re-layout button,
**so that** I can build more complex and well-organized models.

**Acceptance Criteria:**
- [ ] Phase 2 consists of 4 action-based steps:
  1. **Branching chains** — user is guided to create a second chain that branches from the same source component, learning how one component can trigger multiple cascades
  2. **Edit parameters** — user is guided to add multiple parameters to a component and edit their values, learning how parameters interact with conditions
  3. **Auto-layout** — spotlight the "Re-Layout" button, user must click it to see ELK arrange the canvas
  4. **Re-layout options** — user must open the layout dropdown and select a different direction (e.g., TB), observing how the graph rearranges
- [ ] Phase 2 starts with a pre-loaded model (2 components, 1 chain from Phase 1 state, or a fresh simple model if Phase 1 work was cleared)
- [ ] Each step follows the same Driver.js popover pattern as Phase 1 (spotlight, instruction, progress dots, action required)
- [ ] On completion, success overlay with "Phase 2 Complete!" and "Continue to Phase 3" button
- [ ] Phase 2 completion saved to localStorage; Phase 3 unlocked

**E2E Test:** `epic11-phase2-advanced-modeling.spec.ts` — Start Phase 2, verify step 1 guides user to create a branching chain. Complete all 4 steps. Verify "Re-Layout" step triggers ELK layout. Verify completion unlocks Phase 3.

---

### US-11.4: Phase 3 — Reading Results

**As a** user who completed Phase 2,
**I want to** learn how to interpret simulation results using the side panel, bottleneck analysis, cascade event log, and metrics,
**so that** I can extract meaningful insights from my simulations.

**Acceptance Criteria:**
- [ ] Phase 3 consists of 4 guided steps:
  1. **Results side panel** — spotlight the results panel, guide user to run a simulation and observe results appearing in the docked right panel. User must click a component in the results to see its detail view
  2. **Bottleneck analysis** — spotlight the bottleneck section in results, explain what bottleneck indicators mean (components with highest cascade impact). User must identify and click the top bottleneck component
  3. **Cascade event log** — spotlight the event log in the bottom panel, guide user to scrub to a specific event. User must click an event log entry to jump to that time step
  4. **Metrics interpretation** — spotlight the summary metrics (total cascades triggered, affected components, simulation duration). Explain what each metric means. User must hover a metric to see its tooltip explanation
- [ ] Phase 3 pre-loads a scenario with enough complexity to produce meaningful results (e.g., "Supply Chain Disruption" from the scenario library)
- [ ] Each step follows the same Driver.js pattern
- [ ] On completion, success overlay with "Phase 3 Complete!" and "Continue to Phase 4" button
- [ ] Phase 3 completion saved to localStorage; Phase 4 unlocked

**E2E Test:** `epic11-phase3-reading-results.spec.ts` — Start Phase 3, verify scenario is pre-loaded. Complete step 1 by running simulation and clicking a result. Verify bottleneck step highlights the correct UI section. Complete all 4 steps. Verify Phase 4 unlocked.

---

### US-11.5: Phase 4 — Collaboration

**As a** user who completed Phase 3,
**I want to** learn how to create a room, share a link, see live cursors, use the presence bar, and co-edit,
**so that** I can collaborate with others in real time.

**Acceptance Criteria:**
- [ ] Phase 4 consists of 5 guided steps:
  1. **Create a room** — spotlight the "Collaborate" button, user must click it and enter a display name to create a room
  2. **Share a link** — spotlight the Share modal, explain the room URL. User must click "Copy Link"
  3. **Live cursors** — a simulated "ghost" cursor appears on the canvas (no real second user needed), explaining that collaborators' cursors appear in real time. User must move their own cursor to see the explanation
  4. **Presence bar** — spotlight the presence bar showing the user's avatar. Explain how join/leave works. Display a simulated second avatar briefly to demonstrate
  5. **Co-editing** — spotlight a component and show a simulated edit indicator (colored glow + "[Other User] is editing" label). Explain conflict-free editing. User must select a component to see how their own edit indicator would appear to others
- [ ] Phase 4 creates a real collaboration room for steps 1-2, then uses simulated presence data for steps 3-5 (no real second user required)
- [ ] On completion, a final success overlay shows "Tutorial Complete! You've mastered CascadeSim." with a confetti animation
- [ ] Full tutorial completion is saved to localStorage
- [ ] The help menu now shows all 4 phases as complete with a "Replay any phase" option

**E2E Test:** `epic11-phase4-collaboration.spec.ts` — Start Phase 4, verify Collaborate button is spotlighted. Create room, verify step advances. Verify simulated cursor appears in step 3. Complete all 5 steps. Verify "Tutorial Complete!" overlay with all phases marked complete in the menu.

---

### US-11.6: Tutorial State Persistence & Resume

**As a** user who started but didn't finish a tutorial phase,
**I want to** resume from where I left off when I return,
**so that** I don't have to repeat completed steps.

**Acceptance Criteria:**
- [ ] Each completed step within a phase is tracked in localStorage under `cascadesim-tutorial-progress`
- [ ] If a user leaves mid-phase (closes browser, navigates away, presses Esc), their step progress is saved
- [ ] Returning to the tutorial menu shows the in-progress phase with a "Resume" button (instead of "Start")
- [ ] Clicking "Resume" starts from the next incomplete step, skipping already-completed steps
- [ ] Completed phases show a "Replay" button that restarts from step 1
- [ ] A "Reset Tutorial" option at the bottom of the tutorial menu clears all progress (with confirmation dialog)

**E2E Test:** `epic11-tutorial-persistence.spec.ts` — Start Phase 1, complete steps 1-3, dismiss tutorial (Esc). Reopen tutorial menu, verify Phase 1 shows "Resume (Step 4 of 5)". Click Resume, verify step 4 is shown. Complete Phase 1, verify "Replay" button appears. Click "Reset Tutorial", confirm dialog, verify all phases reset to initial state.

---

### US-11.7: First-Visit Auto-Launch & Migration

**As a** first-time visitor,
**I want to** be greeted with the new progressive tutorial,
**so that** I'm guided into the phased learning experience from the start.

**As a** returning user from V2,
**I want to** my previous tutorial completion to be recognized,
**so that** I'm not forced to redo the basics.

**Acceptance Criteria:**
- [ ] On first visit (no `cascadesim-tutorial-progress` in localStorage), a welcome overlay auto-appears after 1 second
- [ ] Welcome overlay shows: app name, brief description, "Start Tutorial" button, "Skip" button
- [ ] "Start Tutorial" opens the tutorial menu with Phase 1 highlighted
- [ ] "Skip" dismisses the overlay and marks the welcome as seen (but does NOT complete any phases)
- [ ] **Migration:** If the old V2 key `cascadesim-tutorial-complete` exists in localStorage, Phase 1 is auto-completed (user already knows basics) and Phase 2 is unlocked
- [ ] The old V2 key is removed after migration to prevent re-triggering

**E2E Test:** `epic11-first-visit-migration.spec.ts` — Clear localStorage, load app, verify welcome overlay appears. Click "Start Tutorial", verify tutorial menu opens at Phase 1. Test migration: set old `cascadesim-tutorial-complete` key, reload, verify Phase 1 is auto-completed and Phase 2 is unlocked. Verify old key is removed.

---

## E12: VPS Deployment

Production deployment of CascadeSim to server `69.62.106.38` with domain `cascadesim.ingevision.cloud`. Includes Vite production build, y-websocket server for collaboration, nginx reverse proxy, SSL/HTTPS, and an automated deploy script.

**Depends on:** E9 (y-websocket server required for production collaboration)

---

### US-12.1: Production Build Configuration

**As a** developer,
**I want to** build CascadeSim for production with optimized assets,
**so that** the app loads fast and runs efficiently on the VPS.

**Acceptance Criteria:**
- [ ] `npm run build` produces a production-ready `dist/` directory with minified JS, CSS, and assets
- [ ] Vite config sets `base: '/'` for root-level deployment
- [ ] Environment variables are handled via `.env.production`:
  - `VITE_WS_URL` — WebSocket URL for y-websocket (e.g., `wss://cascadesim.ingevision.cloud/ws`)
  - `VITE_APP_URL` — Public app URL (e.g., `https://cascadesim.ingevision.cloud`)
- [ ] The app reads `VITE_WS_URL` at runtime to connect to the y-websocket server (replacing hardcoded `localhost`)
- [ ] Build output is < 2MB gzipped (excluding source maps)
- [ ] Source maps are generated but excluded from production serving (placed in a separate directory or `.map` files excluded via nginx)

**E2E Test:** `epic12-production-build.spec.ts` — Run `npm run build`, verify `dist/` is created. Verify `dist/index.html` exists. Verify no hardcoded `localhost` references in built JS files. Verify `.env.production` variables are embedded.

---

### US-12.2: y-websocket Production Server

**As a** collaborator on the production site,
**I want to** the y-websocket server to run reliably in production,
**so that** real-time collaboration works for all users.

**Acceptance Criteria:**
- [ ] A y-websocket server configuration is created at `server/y-websocket.config.js`
- [ ] The server listens on port 1234 (internal only, proxied by nginx)
- [ ] The server uses `pm2` for process management (auto-restart on crash, log rotation)
- [ ] A `pm2` ecosystem config file (`server/ecosystem.config.cjs`) defines the y-websocket process
- [ ] Room cleanup: empty rooms are garbage-collected after 5 minutes of inactivity
- [ ] Server logs to `~/.pm2/logs/y-websocket-*.log` (managed by pm2)
- [ ] Health check endpoint at `/health` returns `200 OK` with `{"status":"ok","rooms":<count>}`
- [ ] Connection limit: max 50 concurrent WebSocket connections (prevents resource exhaustion)

**E2E Test:** `epic12-y-websocket-server.spec.ts` — Start y-websocket server locally, verify health endpoint responds with `{"status":"ok"}`. Create a room, verify health endpoint shows `rooms: 1`. Disconnect all clients, wait 5 minutes, verify room count returns to 0.

---

### US-12.3: Nginx Reverse Proxy & Domain Configuration

**As a** user visiting `cascadesim.ingevision.cloud`,
**I want to** the app to load correctly with WebSocket support,
**so that** I can use CascadeSim including real-time collaboration.

**Acceptance Criteria:**
- [ ] An nginx config file is provided at `server/nginx/cascadesim.conf`
- [ ] Nginx serves the static `dist/` directory for the main app on port 80/443
- [ ] WebSocket connections at path `/ws` are proxied to the y-websocket server on port 1234
- [ ] Proxy config includes proper WebSocket upgrade headers (`Upgrade`, `Connection`)
- [ ] Gzip compression is enabled for HTML, CSS, JS, and JSON
- [ ] Cache headers: static assets (JS/CSS with hash) get `Cache-Control: max-age=31536000`, `index.html` gets `no-cache`
- [ ] 404 fallback: all non-file routes return `index.html` (SPA routing support)
- [ ] Server header is hidden (`server_tokens off`)

**Nginx config structure:**
```
server {
    server_name cascadesim.ingevision.cloud;
    root /var/www/cascadesim/dist;

    location / { try_files $uri $uri/ /index.html; }
    location /ws { proxy_pass http://127.0.0.1:1234; /* WS upgrade headers */ }
    location ~* \.(js|css|png|jpg|svg|woff2?)$ { expires 1y; add_header Cache-Control "public, immutable"; }
}
```

**E2E Test:** `epic12-nginx-proxy.spec.ts` — (Integration test, run on VPS) Verify `curl https://cascadesim.ingevision.cloud` returns HTML. Verify WebSocket connection to `wss://cascadesim.ingevision.cloud/ws` succeeds. Verify non-existent route `/foo/bar` returns `index.html` (SPA fallback). Verify gzip response header present.

---

### US-12.4: SSL/HTTPS via Let's Encrypt

**As a** user,
**I want to** access CascadeSim over HTTPS with a valid certificate,
**so that** my connection is secure and browsers don't show warnings.

**Acceptance Criteria:**
- [ ] SSL certificate is provisioned via Let's Encrypt using `certbot`
- [ ] Certificate covers `cascadesim.ingevision.cloud`
- [ ] HTTP (port 80) redirects to HTTPS (port 443) automatically
- [ ] Nginx config includes SSL directives: `ssl_certificate`, `ssl_certificate_key`, modern TLS protocols (TLSv1.2+)
- [ ] Auto-renewal is configured via `certbot` cron/systemd timer
- [ ] WebSocket connections use `wss://` (not `ws://`) in production
- [ ] HSTS header is set: `Strict-Transport-Security: max-age=31536000`

**E2E Test:** `epic12-ssl-https.spec.ts` — (Integration test, run on VPS) Verify `curl -I http://cascadesim.ingevision.cloud` returns 301 redirect to HTTPS. Verify `curl https://cascadesim.ingevision.cloud` succeeds with valid certificate. Verify HSTS header present. Verify `wss://cascadesim.ingevision.cloud/ws` connection succeeds.

---

### US-12.5: Automated Deploy Script

**As a** developer,
**I want to** deploy CascadeSim to the VPS with a single command,
**so that** deployments are fast, repeatable, and error-proof.

**Acceptance Criteria:**
- [ ] A deploy script is provided at `scripts/deploy.sh`
- [ ] Script performs the following steps in order:
  1. Run `npm run build` locally
  2. Run `npm test` — abort deploy if tests fail
  3. `rsync` the `dist/` directory to VPS at `/var/www/cascadesim/dist/`
  4. `rsync` the `server/` directory to VPS at `/var/www/cascadesim/server/`
  5. SSH into VPS and run: `pm2 restart y-websocket` (or `pm2 start` if first deploy)
  6. SSH into VPS and run: `sudo nginx -t && sudo systemctl reload nginx`
  7. Verify deployment by curling the health endpoint
- [ ] Script accepts flags: `--skip-tests` (bypass test step), `--dry-run` (show commands without executing)
- [ ] Script outputs colored status messages for each step (green = success, red = failure)
- [ ] On failure at any step, the script aborts with a clear error message and does NOT proceed to subsequent steps
- [ ] SSH connection uses key-based auth (no password prompts)
- [ ] A convenience npm script is added: `npm run deploy` runs `scripts/deploy.sh`

**E2E Test:** `epic12-deploy-script.spec.ts` — Run `scripts/deploy.sh --dry-run`, verify all 7 steps are printed without execution. Verify `--skip-tests` flag skips the test step in dry-run output. Verify script exits with error code on simulated build failure.

---

## Notes

- **V2 numbering preserved.** V2.1 epics continue from E11 to avoid confusion with existing E1-E10.
- **Tutorial replaces E8 walkthrough.** The V2 single-walkthrough (US-8.1 through US-8.4) is superseded by the E11 progressive system. The V2 tutorial code (Driver.js integration, help button) is refactored, not rewritten from scratch.
- **ELK and results panel already exist.** E11 teaches these features (built in E8) — it does not re-implement them.
- **Simulated collaboration in Phase 4.** Tutorial Phase 4 uses synthetic presence data (fake cursors, fake avatars) so users can learn collaboration features without needing a real second user. The real Yjs infrastructure (E9) is used only for room creation.
- **y-websocket in production.** V2 used `npx y-websocket` for local dev. E12 replaces this with a pm2-managed server for production reliability.
- **DNS is out of scope.** DNS configuration for `cascadesim.ingevision.cloud` pointing to `69.62.106.38` is handled separately (manager responsibility). E12 stories assume DNS is already configured.
- **VPS access assumed.** SSH access to `69.62.106.38` with key-based auth is assumed to be pre-configured.
- **localStorage keys.** V2.1 tutorial uses `cascadesim-tutorial-progress` (JSON object with per-phase state). Migrates from V2's `cascadesim-tutorial-complete` boolean key.
- **No CI/CD platform.** The deploy script (US-12.5) is a shell script, not a GitHub Actions / GitLab CI pipeline. CI can be added later if needed.

---

## Out of Scope (V2.1)

- CI/CD pipeline (GitHub Actions, GitLab CI) — manual deploy script is sufficient for now
- Docker containerization — direct VPS deploy is simpler for this project size
- CDN / edge caching — single-server deployment
- Monitoring / alerting (Datadog, Sentry) — can be added in a future version
- Database persistence — rooms remain ephemeral (in-memory y-websocket)
- Custom domain email / DNS management
- Load balancing / horizontal scaling

---

*Generated from brainstorm-notes-v2.1.md (2026-02-11)*
*Ready for implementation planning.*
