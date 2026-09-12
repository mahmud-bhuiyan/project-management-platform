# Project Management Platform

## Goal

Build a small to medium-sized Project Management and Team Collaboration Platform as a CV showcase project.

The main goal is to demonstrate practical Angular, TypeScript, NestJS and PostgreSQL skills through a realistic application.

The first version should be focused and polished. Do not build a full Jira clone.

The project can be expanded later after the CV showcase version is complete.

---

## Why This Plan Was Updated

The original plan was strong on scope and features, but had gaps that would cause rework or deployment failures during implementation. The updates below fix those issues early.

| Update | Why |
|--------|-----|
| Backend on Railway/Render, not Vercel | Vercel serverless cannot reliably host NestJS WebSockets/Socket.IO. REST-only on Vercel is possible, but this project needs real-time updates. |
| Monorepo (`client` + `server`) + split deploy | One GitHub repo for the CV; Vercel and Railway/Render each deploy only their app folder — monorepo does not mean single-host deploy. |
| Data model section added | Features were defined without shared schema rules, which leads to inconsistent relations and migrations. |
| API conventions added | One error/pagination format prevents each module inventing its own response shape. |
| Auth strategy clarified | Stateless JWT logout is misleading without token blocklists. Refresh tokens in httpOnly cookies are a stronger CV story. |
| Permissions enforced early | Defining roles in Phase 3 but enforcing in Phase 13 causes expensive refactors. Guard patterns start in Phase 3. |
| Dashboard moved earlier | Users need a landing page after login; building it last delays the product feel. |
| Swagger + tests per phase | Documentation and tests added late are often skipped. Auth and core modules get them immediately. |
| Demo seed before deploy | Production is hard to demo without seed data. Seeding moves before final deployment. |
| CV packaging checklist | Recruiters need live URL, demo login, README, and screenshots — not just working local code. |
| B2B user provisioning (no public signup) | Flowdesk is multi-tenant for companies — users are created by admins, not self-registration. Superadmin seeds once; superadmin creates company admins; company admins add team members. |

---

# 1. Technology Stack

## Versions (use latest stable at project init)

Always scaffold with the latest stable releases — do not start on older majors.

| Tool | Target | Notes |
|------|--------|-------|
| Node.js | **22.12+** (or 20.19+) | Required by NestJS 12; prefer Node 22 LTS |
| Angular | **22.x** (latest stable, e.g. 22.1.4) | Standalone components, Signals, Signal Forms |
| NestJS | **12.x** (latest stable, e.g. 12.0.0) | ESM-ready packages; CommonJS still works |
| Prisma | Latest stable | |
| PostgreSQL | Neon | |

### Init commands (run at Phase 1)

```bash
# Verify Node version first
node -v   # must be 20.19+ or 22.12+

# Latest CLIs
npm install -g @angular/cli@latest @nestjs/cli@latest

# Scaffold (creates projects on latest stable)
ng new client --directory client
nest new server --directory server
```

Re-check `@angular/*` and `@nestjs/*` package versions after scaffold and align any mismatches to latest stable before continuing.

## Frontend

- Angular
- TypeScript
- Tailwind CSS
- Angular Signals
- RxJS (where async streams fit better than Signals)
- Angular Router
- Reactive Forms
- Angular HTTP Client
- Angular Guards
- HTTP Interceptors
- Angular CDK for drag and drop
- Chart.js (via ng2-charts or direct wrapper) for dashboard charts

## Backend

- NestJS
- TypeScript
- Prisma
- REST API
- JWT access token + refresh token
- WebSocket / Socket.IO for selected real-time features
- class-validator / DTO validation
- Swagger / OpenAPI from Phase 2 onward

## Database

- PostgreSQL
- Neon (dev + production databases)

## Repository Layout

Use a monorepo so one GitHub repo powers the CV. Name apps **`client`** (Angular) and **`server`** (NestJS):

```
project-management-platform/
  client/       # Angular frontend — deployed to Vercel
  server/       # NestJS backend — deployed to Railway or Render
  packages/       # optional shared types later
  docs/
  README.md
```

Each app has its **own `package.json`**. Deploy platforms point at the correct subfolder — the monorepo does not deploy as one unit.

There is **no root `package.json`** — run each app from its own folder. **Vercel and Railway/Render must use the app root directory** (`client` or `server`), not the repo root.

## Deployment

| App folder | Platform | Why |
|------------|----------|-----|
| `client` | Vercel | Static SPA hosting, fast CDN |
| `server` | Railway or Render | Long-lived NestJS process + WebSockets |
| Neon | Database | External Postgres — works from any backend host |

Architecture:

```
client (Angular)  →  Vercel
        |
        | HTTPS REST + WSS (cross-origin in production)
        v
server (NestJS)  →  Railway or Render
        |
        v
Prisma → Neon PostgreSQL
```

### Monorepo split deploy (does not break)

Same Git repo, **two separate deploy targets**. Each platform builds only its app folder.

#### Vercel — `client`

| Setting | Value |
|---------|-------|
| Root Directory | `client` |
| Framework Preset | Angular |
| Build Command | `npm run build` (runs inside `client`) |
| Output Directory | `dist/client/browser` (match `angular.json` output path) |
| Install Command | `npm install` |

Environment variables (Vercel project):

```
API_URL=https://<your-server-host>
WS_URL=wss://<your-server-host>
```

Add `client/vercel.json` for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

#### Railway or Render — `server`

| Setting | Value |
|---------|-------|
| Root Directory | `server` |
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npm run start:prod` (or `node dist/main.js`) |

Environment variables (Railway/Render project):

```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://<your-vercel-client-url>
NODE_ENV=production
PORT=3000
```

Optional `server/railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npx prisma generate && npm run build"

[deploy]
startCommand = "npm run start:prod"
restartPolicyType = "ON_FAILURE"
```

Optional `server/render.yaml`:

```yaml
services:
  - type: web
    name: project-management-server
    rootDir: server
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
```

#### Cross-origin rules (required for split deploy)

Monorepo layout does **not** cause CORS or auth issues — **different domains** do. Configure these so production does not break:

1. **CORS on server** — allow only `FRONTEND_URL` (exact Vercel URL, no wildcard in production).
2. **Client env** — `API_URL` and `WS_URL` must point to the live Railway/Render URL, not `localhost`.
3. **Cookies (refresh token)** — if frontend and API are on different domains (e.g. `*.vercel.app` + `*.railway.app`), set cookie `SameSite=None; Secure` and enable credentials on both sides. Prefer custom domains later (`app.yourdomain.com` + `api.yourdomain.com`) for cleaner auth.
4. **WebSockets** — use `wss://` on the server host; do not proxy WebSockets through Vercel.
5. **Prisma migrations** — run `npx prisma migrate deploy` in the server build or as a Railway/Render release step (server folder only).

#### Local dev (monorepo)

```bash
# Terminal 1 — client (default http://localhost:4200)
cd client && npm start

# Terminal 2 — server (default http://localhost:3000)
cd server && npm run start:dev
```

Client local env points to local server:

```
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000
```

Production envs override these per platform — no code changes needed between local and deploy.

Environment variables summary:

- **Client (Vercel):** `API_URL`, `WS_URL`
- **Server (Railway/Render):** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `NODE_ENV`, `PORT`

---

# 2. Scope Rules

Keep the first release small to medium.

Do NOT build these in the first version:

- Billing
- Payments
- Microservices
- Kubernetes
- Complex AI features
- Full chat application
- Video calling
- Advanced time tracking
- Complex reporting system
- Large admin panel
- Multi-region architecture
- Redis / token blocklists
- Email-based invite system (use simple in-app member add instead)
- Password reset flow
- Dark/light theme (light theme only for v1)

The project should look like a real product but remain realistic for a portfolio/CV project.

---

# 3. Data Model (Prisma)

Define the full schema draft in Phase 1. Extend with migrations per phase — do not redesign tables mid-project.

## Core entities

```
User
  └── OrganizationMember ── Organization
                              └── Project ── ProjectMember
                                              └── Task ── Subtask
                                                       ├── Comment
                                                       ├── ActivityLog
                                                       └── (assignee/reporter → User)

Notification ── User
```

## Tables (initial)

### users

- id, email (unique), passwordHash, name (display name), avatarUrl?, platformRole (SUPERADMIN | USER), themePreference (LIGHT | DARK | SYSTEM), createdAt, updatedAt

### organizations

- id, name, slug, createdAt, updatedAt

### organization_members

- id, organizationId, userId, role (OWNER | ADMIN | MEMBER | VIEWER), createdAt
- unique(organizationId, userId)

### projects

- id, organizationId, name, description, status, priority, ownerId, startDate?, dueDate?, archivedAt?, createdAt, updatedAt

### project_members

- id, projectId, userId, role (same enum as org level for v1), createdAt
- unique(projectId, userId)

### tasks

- id, projectId, title, description, status, priority, assigneeId?, reporterId, dueDate?, position (for Kanban ordering), createdAt, updatedAt

### subtasks

- id, taskId, title, completed, position, createdAt, updatedAt

### comments

- id, taskId, authorId, body, createdAt, updatedAt

### activity_logs

- id, taskId, actorId, action, metadata (JSON), createdAt

### notifications

- id, userId, type, title, body, readAt?, metadata (JSON), createdAt

### refresh_tokens

- id, userId, tokenHash, expiresAt, createdAt
- Used for secure refresh flow without Redis

## Conventions

- Use UUIDs for public IDs
- Always include createdAt / updatedAt
- Soft delete only where needed (projects: archivedAt; tasks: hard delete is fine for v1)
- Index foreign keys and common filters (projectId + status, assigneeId, dueDate)

---

# 4. API Conventions

Apply from Phase 1 so all modules stay consistent.

## Base URL

- `/api/v1/...`

## Success response

```json
{
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

`meta` only when paginated.

## Error response

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to update this project.",
    "details": []
  }
}
```

## Pagination

- Query: `?page=1&limit=20`
- Server-side only — never load full datasets to filter in the browser

## Auth header

- `Authorization: Bearer <accessToken>`
- Refresh token sent via httpOnly cookie on `/auth/refresh`

---

# 5. Authentication Strategy

## Tokens

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access token | 15 minutes | Memory or short-lived app state | API requests |
| Refresh token | 7 days | httpOnly secure cookie | Silent re-auth |

## User provisioning (B2B — decided)

No public self-registration. Hierarchy:

| Actor | Creates | How |
|-------|---------|-----|
| **Platform superadmin** | First superadmin account | `npm run db:seed` (`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` in `server/.env`) |
| **Superadmin** | Company admin + organization | `POST /api/v1/auth/company-admins` (superadmin guard) |
| **Company admin** (org OWNER/ADMIN) | Team users in their org | Phase 3 — `POST /organizations/:id/members` |

- `platformRole: SUPERADMIN` — platform operator only (not tied to a company org for admin duties).
- `platformRole: USER` — all company users including company admins; org role (`OWNER`, `ADMIN`, etc.) lives on `organization_members`.
- `SUPERADMIN_BOOTSTRAP_KEY` — optional dev header (`x-superadmin-key`) until JWT superadmin auth is wired on all guards; prefer Bearer token after login.

## Endpoints

```
POST /api/v1/auth/company-admins   # superadmin only — create company admin + org
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## Logout behavior

- Clear refresh token cookie
- Delete refresh token record in database
- Access token expires naturally (no Redis blocklist in v1)

## Out of scope for v1

- Password reset
- OAuth / social login
- Email verification

---

# 6. Permission Model

Define roles in Phase 3 and enforce them in the backend from the first protected endpoint.

## Organization roles

- Owner — full org control
- Admin — manage members and projects
- Member — create/update tasks, comment
- Viewer — read only

## Enforcement rules

1. Every mutating endpoint checks role in a NestJS guard or policy service
2. Angular hides/disables UI by role, but backend is the source of truth
3. Phase 12 is a permission **audit** — not the first time permissions exist

---

# 7. Development Phases

Each phase includes: feature, API, DB migration, loading/error/empty states, and tests for critical paths.

## How we build (workflow)

Use two companion docs — keep them in sync:

| Doc | Purpose |
|-----|---------|
| [STEPS.md](./STEPS.md) | Master step-by-step plan with **manual test** checklist per step |
| [IMPLEMENTED.md](./IMPLEMENTED.md) | What is actually done — same step IDs for comparison |

### Rules per step

1. **Backend first** within each phase: migration → API → Swagger → then frontend for that step.
2. **Manual test after every step** — you approve in `IMPLEMENTED.md` before the next step starts.
3. **No frontend feature** without its API endpoint(s) documented in Swagger (dashboard shell/layout may use placeholders until stats APIs exist).
4. Automated tests run in the same phase as the feature — manual test is still required.
5. **Postman cloud sync after every API change** — see [Postman cloud sync](#postman-cloud-sync) below. Do this in the same session as the API work; do not wait for the user to ask.

### Order inside each feature phase

```
Prisma migration (if needed)
  → Nest module + DTOs + guards
  → Swagger
  → Postman: update docs/postman/ + sync to cloud (Postman MCP, browser auth)
  → Manual API test (Postman / Swagger / curl)
  → Angular service + UI
  → Manual UI test
  → Mark step done in IMPLEMENTED.md
```

### Postman cloud sync

Keep **repo files** and **Postman cloud** in sync whenever backend API endpoints change (new route, changed body, auth, or test scripts).

| What | Where |
|------|--------|
| Source of truth (git) | `docs/postman/Flowdesk.postman_collection.json`, `docs/postman/Flowdesk.local.postman_environment.json` |
| Cloud (live testing) | **My Workspace** → collection **Flowdesk API**, environment **Flowdesk — Local** |
| Auth for agent sync | Postman MCP **browser authentication only** — never a Postman API key |

**After every API update, Cursor must (same session — do not wait for the user to ask):**

1. Update `docs/postman/Flowdesk.postman_collection.json` (and environment file if variables change).
2. **Push the same changes to Postman cloud** via Postman MCP (`createCollectionRequest`, `updateCollectionRequest`, `patchEnvironment`, or `putCollection`). Repo-only updates are incomplete.
3. Add or update test scripts (e.g. save `accessToken` on login, cookie-based refresh flow).
4. Note the sync in `IMPLEMENTED.md` session log when marking the step done.

**Cloud IDs (My Workspace):**

| Resource | ID |
|----------|-----|
| Collection **Flowdesk API** | `31395184-59846ddc-bdb0-4dab-8a40-04cb14a49045` |
| Environment **Flowdesk — Local** | `31395184-e7f0d94c-d52c-431f-9907-e2dee200ca1d` |
| Workspace **My Workspace** | `813764e7-b440-4bf7-8a36-74be9c4026ab` |

See [docs/postman/README.md](./postman/README.md) for import, variables, and typical request order.

---

## Phase 1: Project Setup

### Deliverables

- Monorepo with `client` and `server`
- Angular 22 (latest stable) + Tailwind + routing + environment config
- NestJS 12 (latest stable) + Prisma + Config module + global exception filter
- Node.js 22.12+ verified locally
- `client/vercel.json` stub for SPA rewrites (deploy config only — no deploy yet)
- Server deploy config stub (`railway.toml` or `render.yaml` in `server`)
- Neon database connected locally
- Prisma schema draft (Section 3) migrated
- Swagger stub at `/api/docs`
- Shared API conventions (Section 4)
- `.env.example` files (never commit secrets)
- README skeleton with setup steps

### Frontend structure

```
client/src/app/
  core/
  shared/
  features/
    auth/
    dashboard/
    projects/
    tasks/
    team/
  layouts/
  guards/
  interceptors/
```

### Backend structure

```
server/src/
  auth/
  users/
  organizations/
  projects/
  tasks/
  comments/
  notifications/
  activity/
  common/        # guards, filters, decorators
```

Add modules incrementally — scaffold folders only, implement per phase.

---

## Phase 2: Authentication

### Features

- Login, logout, refresh, get current user
- Superadmin provisions company admins (no public signup)
- Password hashing (bcrypt)
- Protected routes + auth interceptor
- Basic profile page

### Backend

- Auth module, Users module, Organizations module (company admin provisioning), JWT strategy, refresh token rotation
- Company-admin + login DTOs with class-validator
- Superadmin guard; seed script for platform superadmin
- Swagger docs for all auth endpoints

### Frontend

- Login page (all users including superadmin and company admins)
- Superadmin UI to create company admins (replaces public register page — step 2.9)
- Auth service with Signals for current user
- Auth guard + interceptor

### Tests (required in this phase)

- Backend: company-admin create, login, invalid credentials, protected route
- Frontend: auth service + login form validation

---

## Phase 3: Organization and Team

### Relationship

```
User → Organization → Projects
```

### Features

- Create / view / update organization
- Organization switcher in app shell (required for multi-org UX)
- Add existing user by email (no email invite system in v1)
- Remove team members
- View team members
- Assign organization roles
- **Enforce role guards on all org endpoints**

### Database

- organizations, organization_members

### Frontend pages

- Team page
- Organization settings (basic)

---

## Phase 4: Dashboard Shell

Build the post-login landing experience early.

### v1 dashboard (can start simple)

- Summary cards: total projects, active projects, total tasks, completed tasks, overdue tasks
- Placeholder or basic charts (expand in Phase 11)
- Recent activity feed (optional stub until activity exists)

### Why early

Gives the app a product feel immediately after auth instead of jumping straight to CRUD pages.

---

## Phase 5: Project Management

### Project fields

- Name, description, status, priority, start date, due date, owner, created/updated dates

### Statuses

Planning | Active | On Hold | Completed | Archived

### Priorities

Low | Medium | High | Critical

### Features

- CRUD projects, archive, delete
- Add/remove project members
- Role checks on project mutations

### Frontend

- Projects list, create, details, edit
- Reusable: project card, status badge, priority badge, empty/loading states, confirm dialog

### Tests

- Backend: create project, list by org, permission denied for viewer

---

## Phase 6: Task Management

Main feature — list view before Kanban.

### Task fields

- Title, description, status, priority, assignee, reporter, due date, project, position, created/updated

### Statuses

Backlog | Todo | In Progress | Review | Done

### Features

- CRUD tasks, assign, change status/priority/due date
- **Basic filters** on task list: status, priority, assignee
- Server-side pagination from day one

### Tests

- Backend: create task, filter by status, assign task

---

## Phase 7: Kanban Board

Columns: Backlog | Todo | In Progress | Review | Done

### Requirements

- Angular CDK drag and drop
- Update status + position on drop
- Optimistic UI with rollback on API failure
- Persist order within column

Primary CV showcase screen.

---

## Phase 8: Task Details, Comments, Activity

Merge former Phases 7 and 8 — one cohesive task detail experience.

### Task detail shows

All task fields + subtasks + comments + activity timeline

### Subtasks

- Create, complete, delete
- Progress: `3 / 5 subtasks completed`

### Comments

- Add, edit own, delete own
- Simple @mention parsing in comment body (match `@username` against project members for notifications)

### Activity log

Record: task created, assigned, status/priority changed, comment added, subtask completed

Example: `Alex moved "Login API" from Todo to In Progress.`

---

## Phase 9: Notifications

### Triggers

- Task assigned
- @mention in comment
- Task status changed (optional: only when assigned to user)
- Task due within 24 hours (simple cron or on-read check for v1)

### Frontend

- Notification bell, unread count, dropdown
- Mark read / mark all read

---

## Phase 10: Real-Time Updates

Socket.IO on the Railway/Render backend.

### Scope (limited, high value)

- Task status/position updates on Kanban
- New comments on open task
- New notifications

### Example

User A drags a task → User B on same project board sees it without refresh.

### Fallback

If WebSocket setup blocks progress, ship v1 with polling and add real-time as fast-follow — but prefer completing it for CV.

---

## Phase 11: Dashboard Charts and Stats

Enhance Phase 4 dashboard with Chart.js:

- Tasks by status (bar or doughnut)
- Tasks by priority
- Project progress (completed vs total tasks per project)

Keep charts simple — not a BI tool.

---

## Phase 12: Search, Filtering, and Permission Audit

### Global search

- Task title, project name, user name
- Server-side, paginated

### Advanced filters

- Status, priority, assignee, due date range

### Permission audit

- Review every endpoint has correct guards
- Add missing tests for forbidden actions
- Document role matrix in README

---

## Phase 13: UI Polish

Per-phase UI quality is required, but this phase is the final pass.

### Add / verify

- Responsive layout (mobile-friendly nav)
- Skeleton loaders, empty states, error states
- Toast notifications
- Form validation messages
- 404 and unauthorized pages
- Consistent spacing and typography
- Light theme only

---

## Phase 14: Testing Pass

Do not defer all testing here — this phase fills gaps.

### Backend targets

- Auth, projects, tasks, permissions, Kanban order updates

### Frontend targets

- Auth service, key components, reactive forms

Aim for meaningful coverage on business logic, not 100%.

---

## Phase 15: Demo Seed Data

Create before production deploy so live demo works on first visit.

### Seed content

Organization: **Acme Technologies**

Projects: CRM Development, Website Redesign, Mobile Application

Team: PM, Frontend Dev, Backend Dev, QA, Designer

Tasks with realistic titles, statuses, priorities, assignees, due dates, comments

### Demo account

Document in README:

```
Email: demo@acme.dev
Password: (document in README, not in repo code)
```

---

## Phase 16: Production Preparation

### Client (`client`)

- Production env: `API_URL`, `WS_URL` pointing to live server URL
- Production build verified from `client`
- Error handling for failed API calls
- Angular `environment.prod.ts` (or env injection) reads deploy env vars

### Server (`server`)

- Production env vars on Railway/Render
- CORS locked to Vercel `FRONTEND_URL`
- Cookie settings verified for cross-origin (`SameSite=None; Secure` if needed)
- Validation and security headers
- `npx prisma migrate deploy` works from server root

### Never commit

- `.env`, JWT secrets, DATABASE_URL, API keys

---

## Phase 17: Deployment

Same monorepo, **two deploy projects** — one per app folder.

| App folder | Platform | Project name |
|------------|----------|----------------|
| `client` | Vercel | project-management-client |
| `server` | Railway or Render | project-management-server |
| Neon | Database | production branch |

### Vercel checklist (`client`)

- [ ] Root Directory = `client`
- [ ] `API_URL` and `WS_URL` set to server URL
- [ ] SPA rewrite via `vercel.json`
- [ ] Production build succeeds

### Railway/Render checklist (`server`)

- [ ] Root Directory = `server`
- [ ] `DATABASE_URL`, JWT secrets, `FRONTEND_URL` set
- [ ] Build runs Prisma generate + Nest build
- [ ] Start command runs Nest in production mode
- [ ] `/api/docs` and health endpoint reachable

### Post-deploy checks

1. Register or use demo login
2. Switch organization
3. Open Kanban, drag task
4. Add comment, see notification
5. Open Swagger at `/api/docs`
6. Confirm WebSocket update between two browser tabs

---

## Phase 18: CV Showcase Version — STOP HERE

Do not add features after this phase.

### Technical skills demonstrated

- Angular, TypeScript, Signals, RxJS, Reactive Forms, Router, Guards, Interceptors, Tailwind, CDK drag-drop
- NestJS, REST, JWT + refresh tokens, RBAC, Prisma, PostgreSQL, Neon
- WebSockets, server-side search/filter/pagination
- Swagger, testing, production deployment

---

# 8. CV Packaging Checklist

Required before calling the project "done":

- [ ] README with architecture diagram, stack, local setup, env vars
- [ ] Live frontend URL on Vercel
- [ ] Live API URL on Railway/Render
- [ ] Swagger URL linked in README
- [ ] Demo login credentials documented
- [ ] 3–5 screenshots (dashboard, Kanban, task detail, team, Swagger)
- [ ] Optional: 30–60 second screen recording for LinkedIn/CV
- [ ] Optional: GitHub Actions — lint + test on push

---

# 9. Suggested Main Screens

1. Login
2. Register
3. Dashboard
4. Projects list
5. Project details
6. Kanban board
7. Task details
8. Team
9. Organization switcher (in app shell)
10. Notifications
11. Profile
12. Settings (basic)
13. 404 / Unauthorized

---

# 10. Suggested User Flow (Demo Script)

1. Login with demo account
2. Land on dashboard — see stats
3. Switch organization (if multiple)
4. Open projects list
5. Open a project → Kanban board
6. Drag a task to new column
7. Open task details
8. Add comment with @mention
9. Change priority and assignee
10. See activity history update
11. See notification appear
12. Open Swagger in another tab to show API docs

Use this script in interviews.

---

# 11. Cursor Development Rules

When implementing each phase:

1. Follow the current step in [STEPS.md](./STEPS.md) only — do not skip ahead.
2. After implementation, run the step's **manual test** checklist; user marks [IMPLEMENTED.md](./IMPLEMENTED.md).
3. Read the existing project structure first.
4. Do not rewrite working code unnecessarily.
5. Implement only the current phase/step.
6. **Backend first** within the step: API before UI unless the step explicitly allows placeholders.
7. Keep frontend and backend responsibilities separate.
8. Use TypeScript properly — no `any` without reason.
9. Use DTO validation in NestJS on every input.
10. Keep business logic in backend services, not controllers or Angular components.
11. Enforce permissions in backend guards — UI checks are secondary.
12. Create reusable Angular components for repeated UI patterns.
13. Every list/detail page needs loading, error, and empty states.
14. Do not hardcode API URLs — use environment variables.
15. Keep database access inside the backend only.
16. Add Swagger decorators when adding endpoints.
17. **Sync Postman** — update `docs/postman/` and push to cloud via Postman MCP (browser auth) after every API change; see [Postman cloud sync](#postman-cloud-sync).
18. Add tests for auth and permission-sensitive logic in the same phase.
19. Run build/test checks before marking a step complete in IMPLEMENTED.md.
20. Fix broken features before moving on.
21. Keep the implementation maintainable — YAGNI.

---

# 12. Definition of Done

A phase is complete only when:

- Feature works end to end
- UI is usable (loading/error/empty handled)
- API returns correct data with validation
- Database migration applied
- Backend permissions enforced where applicable
- Swagger updated for new endpoints
- Critical tests written (not deferred)
- Existing features still work
- Production build still passes

Do not move to the next phase just because the happy path works.

---

# 13. Future Expansion

After the CV showcase version:

- File attachments
- Calendar view
- Advanced reports
- Email notifications and invite links
- Password reset
- Redis caching
- Advanced audit logs
- Time tracking
- Milestones
- Gantt chart
- Custom roles
- AI summaries
- GitHub / Slack integration
- Billing
- Dark mode
- Multi-organization billing

---

# Final Target

Build a polished, realistic Project Management Platform.

The first version should be:

- Medium scope
- Production deployed with working demo login
- Easy to demo in under 2 minutes
- Good looking (light theme, clean layout)
- Technically solid (RBAC, real-time, tests, Swagger)
- Strong enough for an Angular/NestJS CV

Prioritize finishing and polishing the core product over adding more features.
