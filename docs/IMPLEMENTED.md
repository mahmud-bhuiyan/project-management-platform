# Flowdesk — Implementation Tracker

Track what you have **built and manually tested**. Compare against the master plan: [STEPS.md](./STEPS.md).

**How to update:** After you pass a step's manual test, change `[ ]` → `[x]` and optionally add date + notes.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

**Last updated:** —  
**Current step:** 1.1

---

## Summary

| Phase | Name | Steps done | Status |
|-------|------|------------|--------|
| 1 | Project setup | 0 / 12 | Not started |
| 2 | Authentication | 0 / 12 | Not started |
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
| 1.1 | Verify Node.js | [ ] | | |
| 1.2 | Neon database + server env | [ ] | | |
| 1.3 | Prisma init + full schema draft | [ ] | | |
| 1.4 | First migration | [ ] | | |
| 1.5 | NestJS config + global conventions | [ ] | | |
| 1.6 | Health endpoint | [ ] | | |
| 1.7 | Swagger stub | [ ] | | |
| 1.8 | Tailwind CSS on client | [ ] | | |
| 1.9 | Angular folder structure | [ ] | | |
| 1.10 | Client environment config | [ ] | | |
| 1.11 | Deploy config stubs | [ ] | | |
| 1.12 | Phase 1 integration check | [ ] | | |

---

## Phase 2 — Authentication

| Step | Title | Done | Date | Notes |
|------|-------|------|------|-------|
| 2.1 | Users module (backend) | [ ] | | |
| 2.2 | POST /auth/register | [ ] | | |
| 2.3 | POST /auth/login | [ ] | | |
| 2.4 | Refresh token (cookie) | [ ] | | |
| 2.5 | POST /auth/logout + GET /auth/me | [ ] | | |
| 2.6 | Auth backend tests | [ ] | | |
| 2.7 | Angular auth service | [ ] | | |
| 2.8 | Login page | [ ] | | |
| 2.9 | Register page | [ ] | | |
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
| | | | |
