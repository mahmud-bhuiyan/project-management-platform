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
| Full client state management (NgRx Signal Store) | Per-page `ngOnInit` fetches cause loading flashes on every route change. Centralized feature stores preload and cache org-scoped data so navigation is instant; only the first session bootstrap may show shell-level loading. |

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
- **NgRx Signal Store** (`@ngrx/signals`) — centralized feature stores for all server-backed UI state
- RxJS (HTTP calls and side effects inside stores; components do not subscribe directly)
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

## UI design standards (mandatory from Phase 2 onward)

Flowdesk is a **CV showcase** — every screen must feel like a polished product, not a plain admin form. Apply these rules on **every** frontend step (not deferred to Phase 13).

### Visual identity

| Element | Standard |
|---------|----------|
| **Fonts** | Syne (`font-display`) for headings; DM Sans for body — already in `styles.css` |
| **Palette** | Flow purple (`flow-*`) + cyan accent (`accent`, `accent-strong`) on light backgrounds |
| **Surfaces** | `mesh-bg` hero bands, `glass-panel` cards, soft gradients — never flat white-only pages |
| **Motion** | Subtle entrance animations and glow accents; no distracting loops |
| **Tailwind** | Use theme tokens (`max-w-116`, `p-4`) — not arbitrary brackets (`max-w-[29rem]`) when an equivalent exists; see `.cursor/rules/tailwind-theme-tokens.mdc` |

### Page structure (authenticated app)

Every page inside `AppShellComponent` must include:

1. **Page hero** — full-width `app-page-hero` (`mesh-bg` header with eyebrow, title, subtitle, optional badge). Do not duplicate inline hero markup on app-shell pages.
2. **Page body** — content below the hero (grids, cards, forms) — never a lone centered form floating in empty space.
3. **App shell** — fixed sidebar + sticky top bar (shared layout); page content renders in `<main>` via router outlet only.

Forms belong **inside** a page layout (hero + side panel + main panel), not as the entire page.

### Form & input patterns

- Icon inside every text/password input (`input-flow-wrap` + `input-flow-icon`).
- Password fields use `app-password-input` with show/hide eye toggle.
- Section headings with icon chips — not bare `<fieldset>` legends.
- Primary actions use `btn-primary` gradient; errors/success use tinted alert panels.

### Responsiveness (mandatory — all devices)

Flowdesk must be fully usable on **phone, tablet, and desktop**. Test at minimum: **375px** (mobile), **768px** (tablet), **1280px** (desktop).

| Area | Standard |
|------|----------|
| **Viewport** | `width=device-width, initial-scale=1` in `index.html` (already set) |
| **Breakpoints** | Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px |
| **App shell** | Desktop: fixed sidebar. Mobile/tablet (`< lg`): slide-over nav drawer + hamburger + backdrop; all routes reachable |
| **Layout** | No horizontal scroll on page body; grids collapse to single column on small screens |
| **Typography** | Use `clamp()` or responsive text classes — headings must not overflow on narrow screens |
| **Touch targets** | Buttons and nav links ≥ 44px tap area on mobile |
| **Forms** | Full-width inputs on mobile; multi-column form grids only from `sm`/`md` up |
| **Tables/Kanban** | Horizontal scroll inside container if needed — never break page layout (Phase 6+) |

Manual responsive check is required before marking any UI step done (see STEPS.md).

### Client state management (mandatory from Phase 2 onward)

Use **NgRx Signal Store** (`@ngrx/signals`) for all server-backed application state. Route components are **views only** — they read from stores; they do not fetch on `ngOnInit`. No full-page reloads, no per-route loading overlays.

#### Architecture

```
AppShell bootstrap (once per session)
  → AuthStore          session user, tokens
  → OrganizationStore  org list, active org, members
  → DashboardStore     stats for active org
  → ProjectsStore      projects for active org (Phase 5+)
  → TasksStore         tasks per project (Phase 6+)
  → …                  one store per feature domain
```

| Layer | Where | Examples |
|-------|--------|----------|
| **Server-backed state** | `core/state/*.store.ts` (Signal Store) | `organizations`, `members`, `stats`, `projects`, `tasks` |
| **HTTP facades** | `core/services/*.service.ts` | Thin API clients called **by stores only** — not by components |
| **Shell / local UI state** | `AppShellComponent` or component signals | `mobileNavOpen`, `isSigningOut`, modal open |
| **Form state** | Feature component signals | `isSubmitting`, `errorMessage`, field values |

Store files live under `client/src/app/core/state/`. Each store uses `signalStore`, `withState`, `withComputed`, and `withMethods`. Register stores with `providedIn: 'root'` or provide at shell level when scoped.

#### Navigation must feel instant

1. **Bootstrap once** — after login, `AppShellComponent` (or an `APP_INITIALIZER` tied to auth) loads session + active-org data into stores. This is the **only** time the app may show a shell-level loading state.
2. **No fetch on route enter** — route components bind to store selectors/computed signals. Navigating Dashboard → Team → Projects must **not** trigger new HTTP calls if that slice is already loaded for the active org.
3. **Cached-first render** — when revisiting a page, show the last known store data immediately. If a silent refresh is in flight, update in place when the response arrives — never replace the whole page with skeletons.
4. **Org switch invalidates scoped slices** — changing active org clears org-scoped store slices and reloads them in the background. Pages still render instantly (empty state or stale-until-refresh is OK; full-page spinner is not).
5. **Mutations patch the store** — create/update/delete/update-role flows update the relevant store slice on success (optimistic where safe, e.g. Kanban drag). Lists and detail views stay in sync without refetching the whole page.
6. **Stale refresh rules** — background refresh only when: org switched, user explicitly clicks refresh, mutation failed rollback, or optional TTL elapsed (e.g. 5 min). Never refresh just because the router navigated.

#### UX rules (unchanged intent, stricter enforcement)

1. **No browser reload** — never `window.location.reload()` or full document navigation for in-app actions.
2. **No page-level loading on navigation** — no full-page spinners, no skeleton screens that replace the entire route outlet, no blank flashes when switching sidebar links.
3. **Button-only submit loading** — `isSubmitting` disables the submit button and shows inline spinner text; form fields stay visible until success.
4. **Partial view updates** — success/error swaps only the affected block; hero, sidebar, and app shell stay mounted.
5. **Persistent app shell** — authenticated routes are children of `AppShellComponent`; only `<router-outlet>` content swaps. Bundle shell + pages in one lazy chunk (`authenticated.routes.ts`) to avoid per-route chunk flash.
6. **OnPush + signals** — feature components use `ChangeDetectionStrategy.OnPush`; templates read store/computed signals with `()`.
7. **Inline empty/error only** — empty and error states are **inline panels** inside the page layout, not full-page gates. Show empty when store slice has no data; show inline error banner when bootstrap or silent refresh fails.
8. **RxJS inside stores** — HTTP subscriptions live in store methods; use `finalize()` for in-flight flags. Components do not call `subscribe()` on API observables.

Phase 2.10 (auth interceptor) must follow the same rules — silent token refresh, no redirect loop flash.

#### Migration note (Phase 5 step 5.3)

Existing singleton services (`AuthService`, `OrganizationService`, `DashboardService`, etc.) are refactored into Signal Stores **before** new feature UI (projects list onward). Services may remain as thin HTTP wrappers that stores inject. Completed Phase 3–4 pages are updated to read from stores so navigation between them is instant.

### Per-page quality bar

Before marking a UI step done:

- [ ] Uses app shell (if authenticated).
- [ ] Has `app-page-hero` or equivalent visual anchor (login page uses split hero).
- [ ] Loading, error, empty, and success states styled (not raw text).
- [ ] **Responsive:** usable at 375px, 768px, and 1280px — navigation, forms, and actions all reachable.
- [ ] **State:** data comes from Signal Stores; no HTTP fetch on route enter; no full-page loading on navigation or submit; button-only submit loading; only affected UI block updates.
- [ ] Matches existing Flowdesk screens — recruiter-demo ready.

Phase 13 is a **final polish pass**, not the first time UI quality or responsiveness is applied.

### Reusable components (mandatory from Phase 2 onward)

Before adding new UI markup, check `client/src/app/shared/components/` and **reuse existing components first**.

| Component | Selector | Use for |
|-----------|----------|---------|
| Page hero | `app-page-hero` | App-shell page headers (eyebrow, title, description, badge slots) |
| Modal | `app-modal` | Confirmations and **short forms (≤2 fields)** only |
| Data table | `app-data-table` | Searchable, paginated list tables with projected row templates |
| Password input | `app-password-input` | Password fields with show/hide toggle |

**Rules:**

1. **Reuse before rebuild** — new pages and features must compose shared components; do not copy-paste repeated hero/card/input markup.
2. **Extract at two uses** — when the same UI pattern appears on two or more pages, move it to `shared/components/` in the same phase (do not defer to Phase 13).
3. **Page heroes** — authenticated routes inside `AppShellComponent` use `app-page-hero` with inputs and projection slots (`pageHeroDescription`, `pageHeroBadge`, `pageHeroLeading`); login and other auth-only layouts may keep bespoke split heroes until a shared auth variant exists.
4. **Document new shared components** — add each new shared component to this table when introduced.
5. **Form layout rule** — use **`app-modal` only when the form has two fields or fewer** (e.g. add team member: email + role). Forms with **three or more fields** use a **dedicated app-shell page** with `app-page-hero` + glass panel (e.g. create/edit project, organization settings, company admin provisioning).

**`app-data-table` defaults** (override per page via `[config]` and column defs):

| Setting | Default |
|---------|---------|
| Header / cell alignment | center |
| Column borders | off (card-style rows with rounded ends) |
| Striped rows | off |
| Header background | `flow-100` |
| Page size | 20 (options: 5, 10, 20, 50, 100) |

Styling uses Tailwind utilities on headers/cells (projected `<td>` content); table row gap uses component CSS where Tailwind `border-spacing` in TS is unreliable.

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

## Demo login (local dev + CV showcase)

One-click login for recruiters and local testing — **not** public self-registration.

| Control | Where | Default |
|---------|-------|---------|
| `DEMO_LOGIN_ENABLED` | `server/.env` | `true` — set `false` to disable API |
| `DEMO_PASSWORD` | `server/.env` | Shared password for seeded `@acme.dev` users |
| `NG_APP_DEMO_LOGIN_ENABLED` | `client/.env` | `true` — set `false` to hide persona picker |

- `GET /auth/demo-personas` — returns `{ label, email }` only (never passwords).
- `POST /auth/demo-login` — body `{ email }`; server resolves password from env (`SUPERADMIN_PASSWORD` for superadmin, `DEMO_PASSWORD` for org personas).
- Persona list in `server/src/auth/demo-personas.config.ts` must match users created by `npm run db:seed`.
- Login page shows a persona picker when client flag is enabled; selecting a persona calls demo-login (password field masked in UI).

## Endpoints

```
POST /api/v1/auth/company-admins   # superadmin only — create company admin + org
GET  /api/v1/auth/demo-personas    # optional — list demo personas (email + label)
POST /api/v1/auth/demo-login       # optional — login by persona email; server-side password
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
    state/           # NgRx Signal Store feature stores (auth, org, dashboard, projects, …)
    services/        # thin HTTP facades — called by stores, not components
  shared/
    components/
      page-hero/       # app-page-hero — page header band
      modal/           # app-modal
      data-table/      # app-data-table — searchable paginated tables
      password-input/  # app-password-input
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
- **Demo login** — persona picker + server-side credential login for local/CV demos
- Password hashing (bcrypt)
- Protected routes + auth interceptor
- Basic profile page

### Backend

- Auth module, Users module, Organizations module (company admin provisioning), JWT strategy, refresh token rotation
- Company-admin + login DTOs with class-validator
- Demo login: `GET /auth/demo-personas`, `POST /auth/demo-login` (gated by `DEMO_LOGIN_ENABLED`)
- Superadmin guard; seed script for platform superadmin **and** Acme demo org users
- Swagger docs for all auth endpoints

### Frontend

- Login page (email/password + optional demo persona picker)
- Superadmin UI to create company admins (replaces public register page — step 2.9)
- Auth service with Signals for current user (`login`, `demoLogin`, `getDemoPersonas`, `logout`, `refresh`, `loadMe`)
- Auth guard + interceptor

### Tests (required in this phase)

- Backend: company-admin create, login, demo login, invalid credentials, protected route
- Frontend: auth service + login form validation + demo persona flow

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
- Assign organization roles (inline dropdown; **confirm via modal** before PATCH — avoid accidental changes)
- **Enforce role guards on all org endpoints**

### Database

- organizations, organization_members

### Frontend pages

- Team page — `app-data-table` (search, pagination, striped rows); add-member modal; role-change confirmation modal
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

### Client state (step 5.3 — before project UI)

- Install `@ngrx/signals` and scaffold `core/state/`
- Migrate auth, organization, team members, and dashboard data into Signal Stores
- App shell bootstraps stores once; Phase 3–4 pages read from stores (no per-route fetch)
- Add `ProjectsStore` wired to projects API — list/detail UI in steps 5.5+ reads cached projects

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

- Projects list, create, details, edit — all read/write via `ProjectsStore` (instant navigation, no list refetch on route enter)
- Reusable: `app-data-table` for lists, project card, status badge, priority badge, inline empty states, confirm dialog (`app-modal`)

### Tests

- Backend: create project, list by org, permission denied for viewer

---

## Phase 6: Task Management

Main feature — list view before Kanban. Add `TasksStore` (org- and project-scoped); task list and detail pages read from store — same instant-navigation rules as Phase 5.

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

Per-phase UI quality is required from Phase 2 (see **UI design standards** in §2). This phase is the final consistency pass across all screens.

### Add / verify

- Responsive layout audit across all breakpoints (see §2 Responsiveness)
- Inline empty states and error banners (not full-page skeletons on navigation)
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

**Already seeded in Phase 2** (`npm run db:seed`):

- Platform superadmin (`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`)
- Organization **Acme Technologies** (`slug: acme`)
- Demo team: `admin@acme.dev` (OWNER), `manager@acme.dev` (ADMIN), `member@acme.dev` (MEMBER), `viewer@acme.dev` (VIEWER) — shared `DEMO_PASSWORD`

**Phase 15 adds:** projects, tasks, comments, and richer sample data.

- Projects: CRM Development, Website Redesign, Mobile Application
- Tasks with realistic titles, statuses, priorities, assignees, due dates, comments

### Demo personas (login page picker)

| Label | Email | Password source |
|-------|-------|-----------------|
| Superadmin | `superadmin@flowdesk.local` | `SUPERADMIN_PASSWORD` |
| Company Admin | `admin@acme.dev` | `DEMO_PASSWORD` |
| Manager | `manager@acme.dev` | `DEMO_PASSWORD` |
| Member | `member@acme.dev` | `DEMO_PASSWORD` |

Document passwords in README only — never commit values. Disable demo login in production with `DEMO_LOGIN_ENABLED=false` and `NG_APP_DEMO_LOGIN_ENABLED=false` if desired.

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

1. Use demo login (persona picker or email/password)
2. Switch organization
3. Open Kanban, drag task
4. Add comment, see notification
5. Open Swagger at `/api/docs`
6. Confirm WebSocket update between two browser tabs

---

## Phase 18: CV Showcase Version — STOP HERE

Do not add features after this phase.

### Technical skills demonstrated

- Angular, TypeScript, Signals, NgRx Signal Store, RxJS, Reactive Forms, Router, Guards, Interceptors, Tailwind, CDK drag-drop
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
12. **Reuse shared components first** — check `shared/components/` before new markup; use `app-page-hero`, `app-modal`, `app-data-table`, and `app-password-input`; extract repeated patterns at two uses (see §2 Reusable components).
13. Follow **UI design standards** (§2) — modern, distinctive, recruiter-demo ready; no plain form-only pages in the app shell.
14. Every list/detail page needs **inline** empty and error states (from store slice); no full-page loading on navigation — data is preloaded in Signal Stores.
15. Do not hardcode API URLs — use environment variables.
16. Keep database access inside the backend only.
17. Add Swagger decorators when adding endpoints.
18. **Sync Postman** — update `docs/postman/` and push to cloud via Postman MCP (browser auth) after every API change; see [Postman cloud sync](#postman-cloud-sync).
19. Add tests for auth and permission-sensitive logic in the same phase.
20. Run build/test checks before marking a step complete in IMPLEMENTED.md.
21. Fix broken features before moving on.
22. Keep the implementation maintainable — YAGNI.

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
