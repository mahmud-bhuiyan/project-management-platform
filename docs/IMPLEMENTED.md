# Flowdesk — Implementation Tracker

Track what you have **built and manually tested**. Compare against the master plan: [STEPS.md](./STEPS.md).

**How to update:** After you pass a step's manual test, change `[ ]` → `[x]` and optionally add date + notes.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

**Last updated:** 2026-09-13  
**Current step:** 2.10

### Decisions (Phase 2)

- **No public signup** — users are provisioned by admins.
- **Superadmin** — seeded via `npm run db:seed`; creates company admins.
- **Company admin** — `OWNER` of a new organization; adds team in Phase 3.
- **`name`** = display name; optional `avatarUrl`, `themePreference`.
- **Demo login** — persona picker + `GET/POST /auth/demo-*` for local/CV demos; gated by `DEMO_LOGIN_ENABLED` / `NG_APP_DEMO_LOGIN_ENABLED`.
- **Postman** — repo `docs/postman/` **and** cloud **My Workspace** (`Flowdesk API` + `Flowdesk — Local`). After every API change, agent must update **both** in the same session (never repo-only). Sync via Postman MCP **browser auth only** — no Postman API key. See `.cursor/rules/postman-cloud-sync.mdc` and PLAN § Postman cloud sync.
- **UI design** — modern, eye-catching product UI from Phase 2 onward (mesh hero, glass panels, icon inputs, app shell). No plain form-only pages. See PLAN §2 UI design standards.
- **Responsiveness** — fully usable on phone, tablet, desktop; mobile nav drawer in app shell; test at 375px / 768px / 1280px before marking UI steps done. See PLAN §2 Responsiveness.
- **Client state** — Signals + services; app shell persists across routes; button-only form loading; partial view updates; no full-page spinners. See PLAN §2 Client state management.

---

## Summary

| Phase | Name | Steps done | Status |
|-------|------|------------|--------|
| 1 | Project setup | 12 / 12 | Complete |
| 2 | Authentication | 9 / 12 | In progress |
| 3 | Organization & team | 0 / 8 | Not started |
| 4 | Dashboard shell | 0 / 3 | Not started |
| 5 | Project management | 0 / 7 | Not started |
| 6 | Task management | 0 / 3 | Not started |
| 7 | Kanban board | 0 / 3 | Not started |
| 8 | Task details, comments, activity | 0 / 4 | Not started |
| 9 | Notifications | 0 / 3 | Not started |
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
| 2.10 | Auth interceptor + guard | [ ] | | |
| 2.11 | Basic profile page | [ ] | | |
| 2.12 | Phase 2 integration check | [ ] | | |

---

## Phase 3 — Organization & team

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 3.1 | Organizations API (CRUD) | [ ] | | |
| 3.2 | Organization members API | [ ] | | |
| 3.3 | Organization role guards | [ ] | | |
| 3.4 | App shell layout | [ ] | | |
| 3.5 | Organization switcher | [ ] | | |
| 3.6 | Team page | [ ] | | |
| 3.7 | Organization settings (basic) | [ ] | | |
| 3.8 | Phase 3 integration check | [ ] | | |

---

## Phase 4 — Dashboard shell

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 4.1 | Dashboard stats API | [ ] | | |
| 4.2 | Dashboard page | [ ] | | |
| 4.3 | Activity feed stub (optional) | [ ] | | |

---

## Phase 5 — Project management

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 5.1 | Projects API (CRUD + archive) | [ ] | | |
| 5.2 | Project members API | [ ] | | |
| 5.3 | Project backend tests | [ ] | | |
| 5.4 | Shared UI components | [ ] | | |
| 5.5 | Projects list page | [ ] | | |
| 5.6 | Create + edit project | [ ] | | |
| 5.7 | Project detail page | [ ] | | |

---

## Phase 6 — Task management

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 6.1 | Tasks API (CRUD + pagination + filters) | [ ] | | |
| 6.2 | Task backend tests | [ ] | | |
| 6.3 | Task list UI | [ ] | | |

---

## Phase 7 — Kanban board

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 7.1 | Kanban order API | [ ] | | |
| 7.2 | Kanban board UI (CDK drag-drop) | [ ] | | |
| 7.3 | Optimistic UI + rollback | [ ] | | |

---

## Phase 8 — Task details, comments, activity

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 8.1 | Subtasks API | [ ] | | |
| 8.2 | Comments API | [ ] | | |
| 8.3 | Activity log | [ ] | | |
| 8.4 | Task detail page (full) | [ ] | | |

---

## Phase 9 — Notifications

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 9.1 | Notifications API | [ ] | | |
| 9.2 | Notification triggers | [ ] | | |
| 9.3 | Notification bell UI | [ ] | | |

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
