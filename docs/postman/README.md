# Flowdesk — Postman

Import these files into Postman to test the API alongside Swagger/curl.

## Cloud (Postman app)

Synced to **My Workspace** in Postman (browser auth):

- Collection: **Flowdesk API**
- Environment: **Flowdesk — Local**

Open the Postman app → **My Workspace** → select **Flowdesk — Local** environment (top-right).

## Import (alternative)

1. Open Postman → **Import**
2. Select both files in this folder:
   - `Flowdesk.postman_collection.json`
   - `Flowdesk.local.postman_environment.json`
3. Choose the **Flowdesk — Local** environment (top-right dropdown)

## Environment variables

Set these in the environment before running requests:

| Variable | Example | Notes |
|----------|---------|-------|
| `baseUrl` | `http://localhost:3001/api/v1` | Match `PORT` in `server/.env` |
| `superadminKey` | from `SUPERADMIN_BOOTSTRAP_KEY` | For creating company admins before/alongside JWT |
| `superadminEmail` | `superadmin@flowdesk.local` | From `SUPERADMIN_EMAIL` |
| `superadminPassword` | your seed password | From `SUPERADMIN_PASSWORD` |
| `companyAdminEmail` | `admin@acme-corp.com` | Any company admin you created |
| `companyAdminPassword` | `password123` | Password used at creation |
| `accessToken` | auto-set | Filled by **Login** test script |

## Typical flow

1. Seed superadmin: `cd server && npm run db:seed`
2. **Auth → Create company admin** (uses `x-superadmin-key`)
3. **Auth → Login** (saves `accessToken` automatically)
4. Use Bearer token on protected routes once step 2.5+ exists

## B2B auth model

- **No public register** — users are provisioned by admins
- **Superadmin** → creates company admin + organization
- **Company admin** → adds team members (Phase 3 API)
