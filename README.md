# Flowdesk

**Team tasks, clear flow.**

A project management platform built as a CV showcase — Angular 22 client + NestJS 12 server + PostgreSQL (Neon).

## Project layout

```
flowdesk/
  client/   # Angular frontend → deploy to Vercel
  server/   # NestJS API → deploy to Railway or Render
  docs/
    PLAN.md         # Full spec (stack, data model, API conventions, phases)
    STEPS.md        # Step-by-step build plan + manual test per step
    IMPLEMENTED.md  # What is done (same step IDs — compare with STEPS.md)
    postman/        # Postman collection + local environment (import into Postman)
```

- [docs/PLAN.md](docs/PLAN.md) — architecture, data model, phase overview
- [docs/STEPS.md](docs/STEPS.md) — **what to build next** (master checklist)
- [docs/IMPLEMENTED.md](docs/IMPLEMENTED.md) — **what you have tested and approved**
- [docs/postman/README.md](docs/postman/README.md) — **Postman** collection for API testing

## Prerequisites

- Node.js **20.19+** or **22.12+** (NestJS 12 requirement)
- npm 10+

## Local development

Run each app from its own folder:

```bash
# Terminal 1 — client (http://localhost:4200)
cd client && npm start

# Terminal 2 — server (http://localhost:3000)
cd server && npm run start:dev
```

### Environment

Copy examples and adjust if needed:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Default local URLs:

| Variable        | Client                  | Server                  |
| --------------- | ----------------------- | ----------------------- |
| API             | `http://localhost:3000` | —                       |
| WebSocket       | `ws://localhost:3000`   | —                       |
| Frontend (CORS) | —                       | `http://localhost:4200` |

## API

- Base URL: `http://localhost:3001/api/v1` (or `PORT` in `server/.env`)
- Swagger: `http://localhost:3001/api/docs`
- Health: `GET /api/v1/health`
- Postman: import [docs/postman/](docs/postman/)

### Auth model (B2B)

No public signup. **Superadmin** (seed) → creates **company admin** + org → company admin adds team (Phase 3).

## Permissions

Backend is the source of truth. UI hides or disables actions by role, but every mutating API enforces access in guards or services.

### Organization roles

| Capability | OWNER | ADMIN | MEMBER | VIEWER |
| --- | --- | --- | --- | --- |
| View org, team, dashboard, search | Yes | Yes | Yes | Yes |
| Update org settings | Yes | Yes | No | No |
| Manage org members (add/remove/roles) | Yes | Yes | No | No |
| Create/update/archive/delete projects | Yes | Yes | No | No |
| Manage project members | Yes | Yes | No | No |
| View project list | Yes | Yes | Yes | Yes |
| View project detail, tasks, board, activity | Yes | Yes | If project member | If project member |
| Create/update/delete tasks, subtasks, comments | Yes | Yes | If project member | No |
| Reorder Kanban tasks | Yes | Yes | If project member | No |

**Notes**

- **OWNER / ADMIN** bypass project membership checks for project-scoped reads and task mutations.
- **MEMBER / VIEWER** need a `project_members` row for project detail, tasks, subtasks, comments, activity, and realtime rooms.
- **Global search** scopes tasks/projects to member projects for non-managers; org member search always covers the whole org.
- Non-org members get `404 ORGANIZATION_NOT_FOUND` on org-scoped routes (not `403`).
- Notifications are always scoped to the authenticated user.

### Guard checklist (API)

| Area | Auth | Extra enforcement |
| --- | --- | --- |
| Health, demo personas | Public | — |
| Login, refresh, logout, demo login | Public | Demo login gated by env |
| Create company admin | JWT optional + superadmin | `SuperAdminGuard` |
| `GET /auth/me` | JWT | — |
| Organizations (read/create) | JWT | Org membership on `:id` reads |
| Org update, member mutations | JWT + org manager guard | Service role checks |
| Project mutations, project member mutations | JWT + org manager guard | Service role checks |
| Project/task reads & task mutations | JWT | Project access + viewer blocks mutations |
| Subtasks, comments, activity | JWT | Task read/mutation helpers |
| Dashboard, search, notifications | JWT | Org membership or user scope |

Automated forbidden-path coverage lives in `server/src/**/*.spec.ts` (organization role guard, viewer blocks, project access, superadmin guard).

## Deploy (split — same repo, two projects)

| App    | Folder   | Platform          |
| ------ | -------- | ----------------- |
| Client | `client` | Vercel            |
| Server | `server` | Railway or Render |

Set each platform's **Root Directory** to the app folder above. See `client/vercel.json` and `server/railway.toml`.

## Stack

- **Client:** Angular 22, TypeScript, Tailwind (Phase 1+), Signals
- **Server:** NestJS 12, Prisma, PostgreSQL, JWT, Socket.IO
- **Database:** Neon

## License

MIT (portfolio project)
