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
```

- [docs/PLAN.md](docs/PLAN.md) — architecture, data model, phase overview
- [docs/STEPS.md](docs/STEPS.md) — **what to build next** (master checklist)
- [docs/IMPLEMENTED.md](docs/IMPLEMENTED.md) — **what you have tested and approved**

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

- Base URL: `http://localhost:3000/api/v1`
- Health: `GET /api/v1/health`

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
