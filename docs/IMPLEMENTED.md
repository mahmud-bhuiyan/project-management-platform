# Flowdesk — Implementation Tracker

Track what you have **built and manually tested**. Compare against the master plan: [STEPS.md](./STEPS.md).

**How to update:** After you pass a step's manual test, change `[ ]` → `[x]` and optionally add date + notes.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

**Last updated:** 2026-09-13  
**Current step:** 10.1 (not started)

### Decisions (Phase 2)

- **No public signup** — users are provisioned by admins.
- **Superadmin** — seeded via `npm run db:seed`; creates company admins.
- **Company admin** — `OWNER` of a new organization; adds team in Phase 3.
- **`name`** = display name; optional `avatarUrl`, `themePreference`.
- **Demo login** — persona picker + `GET/POST /auth/demo-*` for local/CV demos; gated by `DEMO_LOGIN_ENABLED` / `NG_APP_DEMO_LOGIN_ENABLED`.
- **Postman** — repo `docs/postman/` **and** cloud **My Workspace** (`Flowdesk API` + `Flowdesk — Local`). After every API change, agent must update **both** in the same session (never repo-only). Sync via Postman MCP **browser auth only** — no Postman API key. See `.cursor/rules/postman-cloud-sync.mdc` and PLAN § Postman cloud sync.
- **UI design** — modern, eye-catching product UI from Phase 2 onward (mesh hero, glass panels, icon inputs, app shell). No plain form-only pages. See PLAN §2 UI design standards.
- **Shared UI** — reuse `app-page-hero`, `app-modal`, `app-data-table`, and `app-password-input` before adding new markup; extract at two uses. See PLAN §2 Reusable components.
- **Form layout** — `app-modal` for forms with **≤2 fields** only; **3+ fields** use a dedicated app-shell page (hero + glass panel). See PLAN §2 Reusable components.
- **Responsiveness** — fully usable on phone, tablet, desktop; mobile nav drawer in app shell; test at 375px / 768px / 1280px before marking UI steps done. See PLAN §2 Responsiveness.
- **Client state** — **NgRx Signal Store** (`@ngrx/signals`) for all server-backed UI state; thin HTTP services called by stores only; app shell bootstraps once; no fetch on route enter; instant navigation between pages; button-only form loading; inline empty/error (no full-page spinners). See PLAN §2 Client state management. Migration in step **5.3**.

---

## Summary

| Phase | Name | Steps done | Status |
|-------|------|------------|--------|
| 1 | Project setup | 12 / 12 | Complete |
| 2 | Authentication | 12 / 12 | Complete |
| 3 | Organization & team | 8 / 8 | Complete |
| 4 | Dashboard shell | 3 / 3 | Complete |
| 5 | Project management | 8 / 8 | Complete |
| 6 | Task management | 3 / 3 | Complete |
| 7 | Kanban board | 3 / 3 | Complete |
| 8 | Task details, comments, activity | 4 / 4 | Complete |
| 9 | Notifications | 3 / 3 | Complete |
| 10 | Real-time updates | 0 / 3 | Not started |
| 11 | Dashboard charts | 0 / 1 | Not started |
| 12 | Search & permission audit | 0 / 3 | Not started |
| 13 | UI polish | 0 / 2 | Not started |
| 14 | Testing pass | 0 / 1 | Not started |
| 15 | Demo seed data | 0 / 1 | Not started |
| 16 | Production preparation | 0 / 1 | Not started |
| 17 | Deployment | 0 / 3 | Not started |
| 18 | CV showcase | 0 / 1 | Not started |

---

## Phase 1 — Project setup

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 1.1 | Verify Node.js | [x] | 2026-09-12 | Node v24.21.0, npm 11.19.0 |
| 1.2 | Neon database + server env | [x] | 2026-09-12 | `server/.env` with `DATABASE_URL` (not committed) |
| 1.3 | Prisma init + full schema draft | [x] | 2026-09-12 | `prisma validate` OK — all PLAN §3 entities |
| 1.4 | First migration | [x] | 2026-09-12 | `20260911180229_init` — schema up to date on Neon |
| 1.5 | NestJS config + global conventions | [x] | 2026-09-12 | `/api/v1` prefix, error filter, CORS for :4200 |
| 1.6 | Health endpoint | [x] | 2026-09-12 | `GET /api/v1/health` → 200 `{ data: { status: "ok" } }` |
| 1.7 | Swagger stub | [x] | 2026-09-12 | `/api/docs` + `/api/docs-json` return 200 |
| 1.8 | Tailwind CSS on client | [x] | 2026-09-12 | Tailwind 4 in `styles.css`; classes in `app.html` |
| 1.9 | Angular folder structure | [x] | 2026-09-12 | `core/`, `shared/`, `features/`, `layouts/`, etc. |
| 1.10 | Client environment config | [x] | 2026-09-12 | `NG_APP_API_URL` / `NG_APP_WS_URL` via `.env` |
| 1.11 | Deploy config stubs | [x] | 2026-09-12 | `vercel.json`, `railway.toml`, `render.yaml`; `.env` gitignored |
| 1.12 | Phase 1 integration check | [x] | 2026-09-12 | Server :3001, client build OK, health + Swagger + 404 JSON |

---

## Phase 2 — Authentication

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 2.1 | Users module (backend) | [x] | 2026-09-12 | bcrypt, UsersService, optional avatar/theme — manually verified |
| 2.2 | POST /auth/company-admins | [x] | 2026-09-12 | B2B: superadmin creates company admin + org; seed script — Postman OK |
| 2.3 | POST /auth/login | [x] | 2026-09-12 | JWT 15m; `{ accessToken, user }`; 401 invalid creds — Postman OK |
| 2.4 | Refresh token (cookie) | [x] | 2026-09-12 | httpOnly `refresh_token` cookie, rotation on refresh — Postman OK (login + refresh verified) |
| 2.5 | POST /auth/logout + GET /auth/me | [x] | 2026-09-12 | JwtAuthGuard; logout clears cookie + DB; me returns profile — Postman OK |
| 2.6 | Auth backend tests | [x] | 2026-09-12 | 51 tests pass — company-admin, login, guards, logout, me |
| 2.7 | Angular auth service | [x] | 2026-09-12 | Signals, login/logout/refresh/loadMe, in-memory token — unit tests pass |
| 2.8 | Login page | [x] | 2026-09-13 | Reactive form, validation, API errors, redirect to dashboard; demo persona picker + `GET /auth/demo-personas` + `POST /auth/demo-login` — UI verified |
| 2.9 | Superadmin: create company admin (UI) | [x] | 2026-09-13 | `/admin/company-admins`, superadminGuard, form + success/errors — UI verified |
| 2.10 | Auth interceptor + guard | [x] | 2026-09-13 | Bearer interceptor, 401 refresh retry, authGuard + guestGuard + session restore — UI verified |
| 2.11 | Basic profile page | [x] | 2026-09-13 | `/profile` — name, email, sign out; sidebar nav + user card link — UI verified |
| 2.12 | Phase 2 integration check | [x] | 2026-09-13 | Superadmin + demo flows; 54 server + 30 client tests; builds OK; Postman/Swagger aligned; no secrets in git — user verified |

---

## Phase 3 — Organization & team

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 3.1 | Organizations API (CRUD) | [x] | 2026-09-13 | `POST/GET/PATCH /organizations`; slug auto-gen; Postman repo + cloud synced — user verified |
| 3.2 | Organization members API | [x] | 2026-09-13 | `GET/POST/PATCH/DELETE /organizations/:id/members`; OWNER/ADMIN role checks; Postman repo + cloud synced — user verified |
| 3.3 | Organization role guards | [x] | 2026-09-13 | `OrganizationRoleGuard` on org/member mutations; viewer blocked from update + member add; 82 server tests; Postman repo + cloud synced — user verified |
| 3.4 | App shell layout | [x] | 2026-09-13 | Sidebar + header + outlet; workspace/delivery nav placeholders; mobile drawer; page title; shell unit tests — user verified |
| 3.5 | Organization switcher | [x] | 2026-09-13 | `OrganizationService` + sidebar switcher; localStorage persistence; refresh on open — user verified |
| 3.6 | Team page | [x] | 2026-09-13 | `/team` via `app-data-table` (search, pagination, striped rows, Tailwind cell/header styling); add-member modal; remove member; role dropdown with confirmation modal before save; OWNER/ADMIN controls; viewer read-only — user verified |
| 3.7 | Organization settings (basic) | [x] | 2026-09-13 | `/organization` edit name form; OWNER/ADMIN save via PATCH; viewer read-only disabled input; org switcher updates from service signal — user verified |
| 3.8 | Phase 3 integration check | [x] | 2026-09-13 | Org create/add member/switch/role enforcement verified in UI + API; 82 server + 66 client tests; builds OK — user verified |

---

## Phase 4 — Dashboard shell

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 4.1 | Dashboard stats API | [x] | 2026-09-13 | `GET /dashboard/stats?organizationId=` — project/task counts; org membership required; 84 server tests; Postman repo + cloud synced — user verified |
| 4.2 | Dashboard page | [x] | 2026-09-13 | Summary cards wired to stats API; loading skeletons, error + no-org states; reloads on org switch — user verified |
| 4.3 | Activity feed stub (optional) | [x] | 2026-09-13 | “Recent activity” section with empty state on dashboard — user verified |

---

## Phase 5 — Project management

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 5.1 | Projects API (CRUD + archive) | [x] | 2026-09-13 | CRUD + archive + delete under `/organizations/:id/projects`; OWNER/ADMIN mutations; Postman repo + cloud synced — user verified |
| 5.2 | Project members API | [x] | 2026-09-13 | Add/remove/list members; project detail requires membership (OWNER/ADMIN bypass); owner auto-added on create; 102 server tests; Postman repo + cloud synced — user verified |
| 5.3 | Client state stores (NgRx Signal Store) | [x] | 2026-09-13 | `@ngrx/signals` stores (auth, org, dashboard, team, workspace, projects scaffold); shell bootstrap overlay; instant navigation; 61 client tests — user verified |
| 5.4 | Project backend tests | [x] | 2026-09-13 | Projects + project-members service/controller specs; 102 server tests pass |
| 5.5 | Shared UI components | [x] | 2026-09-13 | `app-project-card`, `app-project-status-badge`, `app-project-priority-badge`, `app-empty-state`; project model + utils — user verified |
| 5.6 | Projects list page | [x] | 2026-09-13 | `/projects` reads from `ProjectsStore`; shell bootstrap loads projects; nav link enabled; empty/error states — user verified |
| 5.7 | Create + edit project | [x] | 2026-09-13 | `/projects/new` + `/projects/:id/edit` pages; shared `app-project-form`; store patches without refetch; form spacing tightened — user verified |
| 5.8 | Project detail page | [x] | 2026-09-13 | `/projects/:id` reads from store; overview + members; compact hero; instant list navigation — user verified |

---

## Phase 6 — Task management

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 6.1 | Tasks API (CRUD + pagination + filters) | [x] | 2026-09-13 | CRUD under `/organizations/:id/projects/:id/tasks`; pagination + status/priority/assignee filters; org VIEWER blocked from mutations; Postman repo + cloud synced — user verified |
| 6.2 | Task backend tests | [x] | 2026-09-13 | create, filter, assign, viewer denied — 109 server tests pass |
| 6.3 | Task list UI | [x] | 2026-09-13 | `TasksStore`; project detail opens on task list (no overview); card list shows title, description, status/priority badges, assignee, reporter, due; status/priority/search filters; server search query; edit/delete icon actions + delete confirm modal; loads all tasks (limit 100, no pagination); create/edit task pages; Postman `search` on List tasks synced; 103 client + 109 server tests — user verified |

---

## Phase 7 — Kanban board

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 7.1 | Kanban order API | [x] | 2026-09-13 | `PATCH .../tasks/reorder`; single + batch; position shifting; 114 server tests; Postman repo + cloud synced — user verified |
| 7.2 | Kanban board UI (CDK drag-drop) | [x] | 2026-09-13 | `/projects/:id/board`; CDK drag-drop; List/Board tabs; `@angular/cdk`; 106 client tests — user verified |
| 7.3 | Optimistic UI + rollback | [x] | 2026-09-13 | Optimistic store patch on drop; rollback on API failure; 108 client tests — user verified |

---

## Phase 8 — Task details, comments, activity

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 8.1 | Subtasks API | [x] | 2026-09-13 | CRUD + completion toggle; 124 server tests; Postman repo + cloud synced — user verified |
| 8.2 | Comments API | [x] | 2026-09-13 | Add/edit own/delete own; 135 server tests; Postman repo + cloud synced — user verified |
| 8.3 | Activity log | [x] | 2026-09-13 | Auto-log on task/comment/subtask actions + list API; 139 server tests; Postman repo + cloud synced — user verified |
| 8.4 | Task detail page (full) | [x] | 2026-09-13 | Overview, subtasks, comments, activity; activity refresh on re-entry; Playwright 20/20 — user verified |

---

## Phase 9 — Notifications

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 9.1 | Notifications API | [x] | 2026-09-13 | List, unread count, mark read/all; Postman repo + cloud synced — user verified |
| 9.2 | Notification triggers | [x] | 2026-09-13 | Task assigned, @mention, status change, due-soon on read — user verified |
| 9.3 | Notification bell UI | [x] | 2026-09-13 | Bell badge, dropdown, mark read/all, task navigation; Playwright e2e 18/18 — user verified |

---

## Phase 10 — Real-time updates

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 10.1 | Socket.IO gateway (server) | [ ] | | |
| 10.2 | Real-time events | [ ] | | |
| 10.3 | Phase 10 integration check | [ ] | | |

---

## Phase 11 — Dashboard charts

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 11.1 | Chart.js + stats endpoints | [ ] | | |

---

## Phase 12 — Search, filters, permission audit

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 12.1 | Global search API | [ ] | | |
| 12.2 | Advanced filters | [ ] | | |
| 12.3 | Permission audit | [ ] | | |

---

## Phase 13 — UI polish

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 13.1 | Responsive + skeletons + toasts | [ ] | | |
| 13.2 | 404 + unauthorized pages | [ ] | | |

---

## Phase 14 — Testing pass

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 14.1 | Fill test gaps | [ ] | | |

---

## Phase 15 — Demo seed data

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 15.1 | Seed script | [ ] | | |

---

## Phase 16 — Production preparation

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 16.1 | Production env + builds | [ ] | | |

---

## Phase 17 — Deployment

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 17.1 | Deploy server (Railway/Render) | [ ] | | |
| 17.2 | Deploy client (Vercel) | [ ] | | |
| 17.3 | Post-deploy demo script | [ ] | | |

---

## Phase 18 — CV showcase — STOP

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 18.1 | CV packaging checklist | [ ] | | |

---

## Session log (optional)

Use this for quick notes across sessions.

| Date | Step | What you tested | Result |
|------|------|-----------------|--------|
| 2026-09-12 | 1.12 | Health, Swagger, Prisma migrate status, client build, .env gitignore | Pass — Phase 1 complete |
| 2026-09-12 | 2.1–2.3 | Users module, company-admin API, login JWT | Pass — manually tested in Postman |
| 2026-09-12 | 2.4 | Login Set-Cookie, POST /auth/refresh, invalid → 401 | Pass — curl + unit tests |
| 2026-09-12 | 2.4 | Postman: company admin → login (`accessToken` + cookie) → refresh | Pass — user verified |
| 2026-09-12 | Postman | Cloud sync: Get current user (me) + Logout; mandatory cloud sync rule (browser auth only) | Done |
| 2026-09-12 | 2.5 | Login → me → logout → refresh fail | Pass — user verified in Postman |
| 2026-09-12 | 2.8 | Login form validation + redirect; `npm test` + build | Pass — 8 client tests green |
| 2026-09-12 | Docs | PLAN/STEPS/Postman updated for B2B provisioning | Done |
| 2026-09-13 | 2.8 | UI login with demo persona picker → dashboard redirect | Pass — user verified in browser |
| 2026-09-13 | Postman | Cloud sync: Get demo personas + Demo login added to Flowdesk API | Done |
| 2026-09-13 | 2.9 | Superadmin create company admin UI — form, guard, duplicate errors | Pass — user verified in browser |
| 2026-09-13 | 2.10 | Auth interceptor, guards, session restore on refresh | Pass — user verified in browser |
| 2026-09-13 | 2.11 | Profile page display + sign out → login | Pass — user verified in browser |
| 2026-09-13 | 2.12 | Phase 2 integration — Provision company + demo flows, automated checks | Pass — Phase 2 complete |
| 2026-09-13 | 3.6 | Team page — list/add/remove/role confirm modal; data-table UX | Pass — user verified |
| 2026-09-13 | 3.7 | Organization settings — edit name, viewer read-only | Pass — user verified |
| 2026-09-13 | 3.8 | Phase 3 integration check | Pass — Phase 3 complete |
| 2026-09-13 | 4.1 | Dashboard stats API — GET /dashboard/stats | Pass — user verified |
| 2026-09-13 | 4.2 | Dashboard page — stats cards wired to API | Pass — user verified |
| 2026-09-13 | 4.3 | Activity feed stub — Recent activity empty state | Pass — user verified; Phase 4 complete |
| 2026-09-13 | 5.1 | Projects API — CRUD, archive, delete | Pass — user verified |
| 2026-09-13 | Postman | Cloud sync: Projects folder (7 requests) + `projectId` env var | Done |
| 2026-09-13 | 5.2 | Project members API — add/remove/list + access control | Pass — user verified |
| 2026-09-13 | Postman | Cloud sync: project member requests + `projectMemberId` env var | Done |
| 2026-09-13 | 5.3 | NgRx Signal Store migration — bootstrap, org switch, store patches | Built — 61 client tests; pending manual UI test |
| 2026-09-13 | 5.8 | Project detail page — overview, members, compact hero | Pass — user verified; Phase 5 complete |
| 2026-09-13 | 6.1 | Tasks API — CRUD, pagination, filters | Pass — user verified; Postman repo + cloud synced |
| 2026-09-13 | 6.3 | Task list UI — TasksStore, project detail table, create/edit pages | Pass — Playwright e2e + 103 client tests; fixed tasks effect/store loading loop |
| 2026-09-13 | 6.3 | Task list UI polish — list view, search, no pagination, delete icons | Pass — user verified; Phase 6 complete |
| 2026-09-13 | 8.1 | Subtasks API — CRUD + toggle complete under `/tasks/:taskId/subtasks` | Pass — user verified in Postman |
| 2026-09-13 | 8.2 | Comments API — add/edit own/delete own under `/tasks/:taskId/comments` | Pass — user verified in Postman |
| 2026-09-13 | 8.3 | Activity log — auto-record + GET `/tasks/:taskId/activity` | Pass — user verified in Postman |
| 2026-09-13 | 8.4 | Task detail page — fields, subtasks, comments, activity UI | Pass — Playwright e2e 20/20 + user verified; Phase 8 complete |
| 2026-09-13 | 9.1 | Notifications API — list, unread count, mark read/all | Pass — user verified in Postman |
| 2026-09-13 | 9.2 | Notification triggers — assign, mention, status, due-soon | Pass — user verified |
| 2026-09-13 | 9.3 | Notification bell UI — header bell, dropdown, mark read | Pass — Playwright e2e 64/64 branch total; Phase 9 complete |
