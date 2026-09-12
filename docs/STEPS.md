# Flowdesk — Step-by-Step Build Plan

**Master checklist.** Compare progress in [IMPLEMENTED.md](./IMPLEMENTED.md) (same step IDs).

**Spec reference:** [PLAN.md](./PLAN.md)

---

## How to use

1. Work **one step at a time** — do not skip.
2. Within each step: **backend/API first**, then frontend (unless the step says UI-only or placeholder).
3. After any **API** change: update `docs/postman/` and **sync Postman cloud** (Postman MCP, browser auth) — see [PLAN.md § Postman cloud sync](./PLAN.md#postman-cloud-sync).
4. Run the **Manual test** for that step yourself.
5. Mark the step in [IMPLEMENTED.md](./IMPLEMENTED.md) only after manual test passes.
6. Tell Cursor: *"Implement step X.Y"* or *"Continue from next incomplete step"*.

**Legend:** `API` = server only · `UI` = client only · `Full` = both · `Test` = verification step

---

## Phase 1 — Project setup

### Step 1.1 — Verify Node.js
**Layer:** Setup

**Build:**
- Confirm Node **20.19+** or **22.12+** locally.

**Manual test:**
- [ ] Run `node -v` — version meets NestJS 12 requirement.
- [ ] Run `npm -v` — npm 10+.

**Done when:** Node version documented in your notes (optional).

---

### Step 1.2 — Neon database + server env
**Layer:** API

**Build:**
- Create Neon PostgreSQL project (dev branch).
- Copy `server/.env.example` → `server/.env`.
- Set `DATABASE_URL` in `server/.env`.

**Manual test:**
- [ ] `DATABASE_URL` is set (no secrets committed).
- [ ] Neon dashboard shows database is reachable.

**Done when:** Server env file exists with valid `DATABASE_URL`.

---

### Step 1.3 — Prisma init + full schema draft
**Layer:** API

**Build:**
- Install Prisma in `server/`.
- Add `schema.prisma` with all tables from PLAN §3 (users, organizations, organization_members, projects, project_members, tasks, subtasks, comments, activity_logs, notifications, refresh_tokens).
- Use UUIDs, timestamps, indexes on FKs and common filters.

**Manual test:**
- [ ] `npx prisma validate` succeeds in `server/`.
- [ ] Schema includes every entity from PLAN §3.

**Done when:** Valid Prisma schema, no migration yet.

---

### Step 1.4 — First migration
**Layer:** API

**Build:**
- Run `npx prisma migrate dev` (initial migration name e.g. `init`).
- Add `prisma generate` to server workflow.

**Manual test:**
- [ ] Migration applies without errors.
- [ ] `npx prisma studio` opens and shows empty tables.
- [ ] Neon dashboard reflects tables.

**Done when:** Database schema exists in Neon.

---

### Step 1.5 — NestJS config + global conventions
**Layer:** API

**Build:**
- `@nestjs/config`, load `.env`.
- Global prefix `/api/v1`.
- Global exception filter → PLAN §4 error shape `{ error: { code, message, details } }`.
- CORS for `http://localhost:4200` (dev).

**Manual test:**
- [ ] Server starts: `cd server && npm run start:dev`.
- [ ] Invalid route returns JSON error (not HTML stack trace).

**Done when:** Server boots with config and consistent errors.

---

### Step 1.6 — Health endpoint
**Layer:** API

**Build:**
- `GET /api/v1/health` → `{ data: { status: "ok" } }`.

**Manual test:**
- [ ] Browser or curl: `http://localhost:3000/api/v1/health` returns 200 + JSON.

**Done when:** Health endpoint works.

---

### Step 1.7 — Swagger stub
**Layer:** API

**Build:**
- Swagger at `/api/docs`.
- Document health endpoint; tag structure for future modules.

**Manual test:**
- [ ] Open `http://localhost:3000/api/docs` — UI loads.
- [ ] Try health endpoint from Swagger UI.

**Done when:** Swagger is reachable.

---

### Step 1.8 — Tailwind CSS on client
**Layer:** UI

**Build:**
- Install and configure Tailwind in `client/`.
- Base styles in `styles.css`.

**Manual test:**
- [ ] `cd client && npm start` — app loads.
- [ ] Add a temporary Tailwind class (e.g. `text-blue-600`) — style applies.

**Done when:** Tailwind works in Angular.

---

### Step 1.9 — Angular folder structure
**Layer:** UI

**Build:**
- Scaffold empty folders per PLAN: `core/`, `shared/`, `features/` (auth, dashboard, projects, tasks, team), `layouts/`, `guards/`, `interceptors/`.
- Empty module/route placeholders OK.

**Manual test:**
- [ ] App still builds and serves.
- [ ] Folder structure matches PLAN § Phase 1.

**Done when:** Structure exists, app runs.

---

### Step 1.10 — Client environment config
**Layer:** UI

**Build:**
- Copy `client/.env.example` → `client/.env`.
- Wire `environment.ts` / `environment.prod.ts` for `API_URL`, `WS_URL` (local defaults).

**Manual test:**
- [ ] Client reads API URL from environment (log or display in dev if helpful).
- [ ] No hardcoded `localhost:3000` in feature code.

**Done when:** Env-based API URL configured.

---

### Step 1.11 — Deploy config stubs
**Layer:** Setup

**Build:**
- Verify `client/vercel.json`, `server/railway.toml` or `render.yaml`, root `.gitignore` excludes `.env`.

**Manual test:**
- [ ] Files exist and paths point to `client` / `server` roots.
- [ ] `git status` does not show `.env` files.

**Done when:** Deploy stubs and gitignore verified.

---

### Step 1.12 — Phase 1 integration check
**Layer:** Test

**Manual test:**
- [ ] Terminal 1: `cd client && npm start` → `http://localhost:4200`
- [ ] Terminal 2: `cd server && npm run start:dev` → `http://localhost:3000`
- [ ] Health + Swagger work.
- [ ] Prisma Studio shows schema.
- [ ] README setup steps still accurate.

**Done when:** Phase 1 complete — proceed to Phase 2.

---

## Phase 2 — Authentication

### Step 2.1 — Users module (backend)
**Layer:** API

**Build:**
- `users` module, service, Prisma user access.
- Password hashing utility (bcrypt).

**Manual test:**
- [ ] Server starts; users module loads without error.

**Done when:** User service ready for auth.

---

### Step 2.2 — POST /auth/company-admins (superadmin only)
**Layer:** API

**Build:**
- `CreateCompanyAdminDto` + validation (user fields + `organizationName`, `organizationSlug`).
- Create user, organization, and `organization_members` row with role `OWNER`.
- Superadmin guard (`x-superadmin-key` bootstrap and/or JWT superadmin).
- Seed script: `npm run db:seed` creates platform superadmin from env.
- Swagger docs.

**Manual test:**
- [ ] Seed superadmin: `cd server && npm run db:seed`.
- [ ] Swagger/Postman: `POST /auth/company-admins` with superadmin key → 201 + user + organization (no password).
- [ ] Duplicate email or slug → conflict error.
- [ ] Rows in Prisma Studio: `users`, `organizations`, `organization_members`.

**Done when:** Superadmin can provision a company admin + org. No public register endpoint.

---

### Step 2.3 — POST /auth/login
**Layer:** API

**Build:**
- Login DTO, verify password.
- Issue JWT access token (15 min).
- Response `{ data: { accessToken, user } }`.

**Manual test:**
- [ ] Valid login → access token returned.
- [ ] Wrong password → 401 with error shape.
- [ ] Unknown email → 401.

**Done when:** Login returns access token.

---

### Step 2.4 — Refresh token (cookie)
**Layer:** API

**Build:**
- `refresh_tokens` table usage.
- On login: set httpOnly cookie, store hashed refresh token.
- `POST /auth/refresh` → new access token.

**Manual test:**
- [ ] Login sets `Set-Cookie` for refresh token.
- [ ] Call `/auth/refresh` with cookie → new access token.
- [ ] Expired/invalid refresh → 401.

**Done when:** Refresh flow works in Swagger/curl (with credentials).

---

### Step 2.5 — POST /auth/logout + GET /auth/me
**Layer:** API

**Build:**
- Logout: clear cookie, delete refresh record.
- Me: JWT guard, return current user.

**Manual test:**
- [ ] `GET /auth/me` with Bearer token → user profile.
- [ ] Without token → 401.
- [ ] Logout clears refresh; refresh endpoint fails after logout.

**Done when:** Logout and me endpoints work.

---

### Step 2.6 — Auth backend tests
**Layer:** API

**Build:**
- Vitest: company-admin create, login, invalid credentials, protected route.

**Manual test:**
- [ ] `cd server && npm test` — auth tests pass.

**Done when:** Automated auth tests green.

---

### Step 2.7 — Angular auth service
**Layer:** UI

**Build:**
- Auth service with Signals for current user.
- Methods: login, logout, refresh, loadMe (no public register).
- Store access token in memory.

**Manual test:**
- [ ] DevTools/network: login calls API correctly (after step 2.10 UI, or test via temporary button).

**Done when:** Service compiles and calls API (test with login page or console).

---

### Step 2.8 — Login page
**Layer:** UI

**Build:**
- Reactive form, validation messages.
- Submit → login → redirect to dashboard route.

**Manual test:**
- [ ] Invalid form shows errors.
- [ ] Valid credentials → redirect.
- [ ] Invalid credentials → error message shown.

**Done when:** Login page works in browser.

---

### Step 2.9 — Superadmin: create company admin (UI)
**Layer:** UI

**Build:**
- Superadmin-only form: company admin email, name, password, organization name/slug.
- Submit → `POST /auth/company-admins` → success message.
- Regular users have **no** public signup page.

**Manual test:**
- [ ] Superadmin logged in can create a company admin + org.
- [ ] Non-superadmin cannot access the page.
- [ ] Duplicate email/slug shows API error in UI.

**Done when:** Company admin provisioning works in browser (replaces public register page).

---

### Step 2.10 — Auth interceptor + guard
**Layer:** UI

**Build:**
- Interceptor: attach Bearer token, refresh on 401 once.
- Auth guard: block unauthenticated routes.
- Guest guard: redirect logged-in users away from login.

**Manual test:**
- [ ] Protected route without login → redirect to login.
- [ ] After login, protected route loads.
- [ ] Access token refresh works without full re-login (wait or shorten token in dev).

**Done when:** Auth wiring complete.

---

### Step 2.11 — Basic profile page
**Layer:** UI

**Build:**
- Show name, email from `/auth/me`.
- Logout button.

**Manual test:**
- [ ] Profile displays current user.
- [ ] Logout → redirected to login; protected routes blocked.

**Done when:** Profile + logout work in UI.

---

### Step 2.12 — Phase 2 integration check
**Layer:** Test

**Manual test:**
- [ ] Full flow: seed superadmin → create company admin → login → profile → logout.
- [ ] Postman collection in `docs/postman/` matches live endpoints.
- [ ] Swagger documents all auth endpoints.
- [ ] Server tests pass.
- [ ] No secrets in git.

**Done when:** Phase 2 complete.

---

## Phase 3 — Organization & team

### Step 3.1 — Organizations API (CRUD)
**Layer:** API

**Build:**
- Organizations module, create/read/update org.
- Slug generation.

**Manual test (Swagger, authenticated):**
- [ ] Create organization → returns org.
- [ ] List/get user's organizations.
- [ ] Update name.

**Done when:** Org CRUD works.

---

### Step 3.2 — Organization members API
**Layer:** API

**Build:**
- Add member by email, remove member, list members, update role.
- Roles: OWNER, ADMIN, MEMBER, VIEWER.

**Manual test:**
- [ ] Add existing user by email.
- [ ] Change role.
- [ ] Remove member.
- [ ] Non-admin cannot add members (403).

**Done when:** Member management works with role checks.

---

### Step 3.3 — Organization role guards
**Layer:** API

**Build:**
- Guards on all org mutating endpoints.
- Backend tests for forbidden actions.

**Manual test:**
- [ ] Viewer cannot update org or add members.
- [ ] `npm test` — org permission tests pass.

**Done when:** Guards enforced and tested.

---

### Step 3.4 — App shell layout
**Layer:** UI

**Build:**
- Authenticated layout: sidebar, header, outlet.
- Navigation placeholders.

**Manual test:**
- [ ] Logged-in user sees shell on dashboard route.
- [ ] Logout still works.

**Done when:** Shell renders.

---

### Step 3.5 — Organization switcher
**Layer:** UI

**Build:**
- List orgs, switch active org (signal/service).
- Persist selection (localStorage OK for v1).

**Manual test:**
- [ ] Create two orgs (API or UI).
- [ ] Switcher changes active org.
- [ ] Reload page — selection restored.

**Done when:** Multi-org UX works.

---

### Step 3.6 — Team page
**Layer:** UI

**Build:**
- List members, add by email, remove, role dropdown.

**Manual test:**
- [ ] Team list matches API.
- [ ] Add/remove/role change reflected after refresh.
- [ ] Viewer sees read-only UI (buttons hidden/disabled).

**Done when:** Team page works.

---

### Step 3.7 — Organization settings (basic)
**Layer:** UI

**Build:**
- Edit org name.

**Manual test:**
- [ ] Update name → persists.
- [ ] Viewer cannot edit.

**Done when:** Org settings work.

---

### Step 3.8 — Phase 3 integration check
**Layer:** Test

**Manual test:**
- [ ] Create org → add member → switch org → role enforcement in UI + API.

**Done when:** Phase 3 complete.

---

## Phase 4 — Dashboard shell

### Step 4.1 — Dashboard stats API
**Layer:** API

**Build:**
- `GET /dashboard/stats?organizationId=` — counts: projects, active projects, tasks, completed, overdue.
- Return zeros/empty if no data yet.

**Manual test:**
- [ ] Swagger: stats for org returns JSON with expected fields.
- [ ] Unauthorized org → 403.

**Done when:** Stats API works.

---

### Step 4.2 — Dashboard page
**Layer:** UI

**Build:**
- Summary cards wired to stats API.
- Loading, error, empty states.

**Manual test:**
- [ ] After login, dashboard is default landing.
- [ ] Cards show numbers (0 OK if no projects).
- [ ] Loading spinner then content.

**Done when:** Dashboard shell live.

---

### Step 4.3 — Activity feed stub (optional)
**Layer:** UI

**Build:**
- Placeholder “Recent activity” until Phase 8.

**Manual test:**
- [ ] Section shows empty state message.

**Done when:** Phase 4 complete.

---

## Phase 5 — Project management

### Step 5.1 — Projects API (CRUD + archive)
**Layer:** API

**Build:**
- CRUD, archive, delete.
- Status/priority enums per PLAN.
- Scoped to organization.

**Manual test:**
- [ ] Create, list, get, update, archive, delete via Swagger.
- [ ] Viewer cannot create (403).

**Done when:** Project API complete.

---

### Step 5.2 — Project members API
**Layer:** API

**Build:**
- Add/remove project members, role checks.

**Manual test:**
- [ ] Add member to project.
- [ ] Non-member cannot access project details.

**Done when:** Project members work.

---

### Step 5.3 — Project backend tests
**Layer:** API

**Manual test:**
- [ ] Tests: create, list by org, viewer denied.

**Done when:** Tests pass.

---

### Step 5.4 — Shared UI components
**Layer:** UI

**Build:**
- Project card, status badge, priority badge, confirm dialog, empty/loading states.

**Manual test:**
- [ ] Storybook optional; at least used on projects list.

**Done when:** Components reusable.

---

### Step 5.5 — Projects list page
**Layer:** UI

**Manual test:**
- [ ] Lists projects for active org.
- [ ] Empty state when none.

**Done when:** List works.

---

### Step 5.6 — Create + edit project
**Layer:** UI

**Manual test:**
- [ ] Create project → appears in list.
- [ ] Edit fields persist.

**Done when:** Create/edit work.

---

### Step 5.7 — Project detail page
**Layer:** UI

**Manual test:**
- [ ] Detail shows all fields + members section.

**Done when:** Phase 5 complete.

---

## Phase 6 — Task management (list view)

### Step 6.1 — Tasks API (CRUD + pagination + filters)
**Layer:** API

**Build:**
- Server-side pagination `?page=&limit=`.
- Filters: status, priority, assignee.
- Assign, status, priority, due date updates.

**Manual test:**
- [ ] Create task in project.
- [ ] List paginated.
- [ ] Filter by status works.

**Done when:** Task API complete.

---

### Step 6.2 — Task backend tests
**Layer:** API

**Manual test:**
- [ ] `npm test` — create, filter, assign pass.

**Done when:** Tests pass.

---

### Step 6.3 — Task list UI
**Layer:** UI

**Manual test:**
- [ ] Task list per project with filters and pagination.
- [ ] Create/edit task forms.

**Done when:** Phase 6 complete.

---

## Phase 7 — Kanban board

### Step 7.1 — Kanban order API
**Layer:** API

**Build:**
- Update task status + position (single or batch endpoint).
- Persist order within column.

**Manual test:**
- [ ] Move task via API → order saved in DB.

**Done when:** API supports board moves.

---

### Step 7.2 — Kanban board UI (CDK drag-drop)
**Layer:** UI

**Build:**
- Columns: Backlog, Todo, In Progress, Review, Done.
- CDK drag-drop.

**Manual test:**
- [ ] Drag task between columns → status updates.
- [ ] Reorder within column persists after refresh.

**Done when:** Board works.

---

### Step 7.3 — Optimistic UI + rollback
**Layer:** UI

**Manual test:**
- [ ] Simulate API failure (stop server mid-drag) — UI rolls back.

**Done when:** Phase 7 complete.

---

## Phase 8 — Task details, comments, activity

### Step 8.1 — Subtasks API
**Layer:** API

**Manual test:**
- [ ] CRUD subtasks; completion toggles.

**Done when:** Subtasks API works.

---

### Step 8.2 — Comments API
**Layer:** API

**Manual test:**
- [ ] Add, edit own, delete own comment.

**Done when:** Comments API works.

---

### Step 8.3 — Activity log
**Layer:** API

**Build:**
- Log: created, assigned, status/priority changed, comment, subtask completed.

**Manual test:**
- [ ] Actions create activity rows.
- [ ] List activity for task.

**Done when:** Activity API works.

---

### Step 8.4 — Task detail page (full)
**Layer:** UI

**Manual test:**
- [ ] Detail shows fields, subtasks progress, comments, activity timeline.
- [ ] @mention in comment body stored (parsing for notifications in Phase 9).

**Done when:** Phase 8 complete.

---

## Phase 9 — Notifications

### Step 9.1 — Notifications API
**Layer:** API

**Build:**
- List, unread count, mark read, mark all read.

**Manual test:**
- [ ] Swagger CRUD read state.

**Done when:** API works.

---

### Step 9.2 — Notification triggers
**Layer:** API

**Build:**
- On: task assigned, @mention, optional status change, due within 24h.

**Manual test:**
- [ ] Assign task → assignee gets notification.
- [ ] @mention in comment → notification.

**Done when:** Triggers fire.

---

### Step 9.3 — Notification bell UI
**Layer:** UI

**Manual test:**
- [ ] Bell shows unread count.
- [ ] Dropdown lists notifications; mark read works.

**Done when:** Phase 9 complete.

---

## Phase 10 — Real-time updates

### Step 10.1 — Socket.IO gateway (server)
**Layer:** API

**Build:**
- Auth on connect (JWT).
- Rooms per project.

**Manual test:**
- [ ] Client connects with token (test client or browser console).

**Done when:** Gateway accepts connections.

---

### Step 10.2 — Real-time events
**Layer:** Full

**Build:**
- Emit: Kanban move, new comment, new notification.

**Manual test:**
- [ ] Two browser tabs, same project board — drag in tab A appears in tab B.
- [ ] New comment appears in open task in tab B.

**Done when:** Real-time works (or document polling fallback).

---

### Step 10.3 — Phase 10 integration check
**Layer:** Test

**Manual test:**
- [ ] `WS_URL` in client env points to server.
- [ ] Two-tab demo works on localhost.

**Done when:** Phase 10 complete.

---

## Phase 11 — Dashboard charts

### Step 11.1 — Chart.js + stats endpoints
**Layer:** Full

**Build:**
- Tasks by status, by priority, project progress.

**Manual test:**
- [ ] Dashboard charts render with seed or live data.

**Done when:** Phase 11 complete.

---

## Phase 12 — Search, filters, permission audit

### Step 12.1 — Global search API
**Layer:** API

**Manual test:**
- [ ] Search task title, project name, user name — paginated.

**Done when:** Search works.

---

### Step 12.2 — Advanced filters
**Layer:** Full

**Manual test:**
- [ ] Due date range, combined filters server-side.

**Done when:** Filters work.

---

### Step 12.3 — Permission audit
**Layer:** API

**Build:**
- Review every endpoint; add missing tests; role matrix in README.

**Manual test:**
- [ ] Checklist of endpoints all have guards.
- [ ] Forbidden tests pass.

**Done when:** Phase 12 complete.

---

## Phase 13 — UI polish

### Step 13.1 — Responsive + skeletons + toasts
**Layer:** UI

**Manual test:**
- [ ] Mobile nav usable.
- [ ] Skeleton loaders on lists.
- [ ] Toast on success/error.

**Done when:** Polish pass done.

---

### Step 13.2 — 404 + unauthorized pages
**Layer:** UI

**Manual test:**
- [ ] Unknown route → 404.
- [ ] Forbidden action → unauthorized page or message.

**Done when:** Phase 13 complete.

---

## Phase 14 — Testing pass

### Step 14.1 — Fill test gaps
**Layer:** Test

**Manual test:**
- [ ] `cd server && npm test` — auth, projects, tasks, permissions, Kanban order.
- [ ] `cd client && npm test` — auth service, key forms.

**Done when:** Meaningful coverage, all green.

---

## Phase 15 — Demo seed data

### Step 15.1 — Seed script
**Layer:** API

**Build:**
- Organization **Acme Technologies**, 3 projects, team roles, tasks, comments.

**Manual test:**
- [ ] `npx prisma db seed` (or documented command) populates data.
- [ ] Demo login documented in README (password not in repo).

**Done when:** Local demo works in one command.

---

## Phase 16 — Production preparation

### Step 16.1 — Production env + builds
**Layer:** Full

**Manual test:**
- [ ] `cd client && npm run build` succeeds.
- [ ] `cd server && npm run build` succeeds.
- [ ] CORS, cookies, `migrate deploy` documented.

**Done when:** Ready to deploy.

---

## Phase 17 — Deployment

### Step 17.1 — Deploy server (Railway/Render)
**Layer:** Test

**Manual test:**
- [ ] Health + Swagger on live URL.
- [ ] Migrations applied.

**Done when:** API live.

---

### Step 17.2 — Deploy client (Vercel)
**Layer:** Test

**Manual test:**
- [ ] SPA loads; API_URL/WS_URL correct.
- [ ] Login works against production API.

**Done when:** Frontend live.

---

### Step 17.3 — Post-deploy demo script
**Layer:** Test

**Manual test (PLAN §10):**
- [ ] Demo login → dashboard → org → project → Kanban drag → comment → notification → Swagger.

**Done when:** Phase 17 complete.

---

## Phase 18 — CV showcase — STOP

### Step 18.1 — CV packaging checklist
**Layer:** Test

**Manual test (PLAN §8):**
- [ ] README: architecture, setup, env vars, live URLs, demo login, screenshots.
- [ ] No new features after this step.

**Done when:** Project ready for portfolio. **Do not add features.**

---

## Quick reference — current starting point

| Step | Title | Status |
|------|-------|--------|
| **1.1** | Verify Node.js | ← **Start here** |
| 1.2 | Neon + server env | |
| … | See [IMPLEMENTED.md](./IMPLEMENTED.md) | |
