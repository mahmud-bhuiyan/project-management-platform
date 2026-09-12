# Flowdesk — Postman

Import these files into Postman to test the API alongside Swagger/curl.

**Agent rule (mandatory):** After every backend API change:

1. Update the JSON files in this folder.
2. **Push the same changes to Postman cloud** in the same session — repo-only updates are incomplete.
3. Use Postman MCP with **browser authentication only** — **never** a Postman API key.

Do not wait for the user to ask for cloud sync. See [PLAN.md § Postman cloud sync](../PLAN.md#postman-cloud-sync).

## Cloud (Postman app) — primary for daily testing

Synced to **My Workspace** in Postman. Cursor agents sync via **Postman MCP browser auth** (not API key):

| Resource | Name | Cloud ID |
|----------|------|----------|
| Collection | **Flowdesk API** | `31395184-59846ddc-bdb0-4dab-8a40-04cb14a49045` |
| Environment | **Flowdesk — Local** | `31395184-e7f0d94c-d52c-431f-9907-e2dee200ca1d` |
| Workspace | **My Workspace** | `813764e7-b440-4bf7-8a36-74be9c4026ab` |

Open the Postman app → **My Workspace** → select **Flowdesk — Local** environment (top-right).

Changes made in Cursor should appear in cloud without re-import. Repo JSON files are the git backup / offline import.

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
| `accessToken` | auto-set | Filled by **Login** / **Demo login** / **Refresh** test scripts |

## Typical flow

### Quick demo (persona login)

1. Seed: `cd server && npm run db:seed` (requires `SUPERADMIN_*` and `DEMO_PASSWORD` in `server/.env`)
2. **Auth → Get demo personas**
3. **Auth → Demo login** (saves `accessToken`; sets `refresh_token` cookie)
4. **Auth → Get current user (me)**

### Full B2B flow

1. Seed superadmin: `cd server && npm run db:seed`
2. **Auth → Create company admin** (uses `x-superadmin-key` or Bearer superadmin token)
3. **Auth → Login** (saves `accessToken`; sets `refresh_token` httpOnly cookie in Postman)
4. **Auth → Refresh access token** (uses cookie from step 3; updates `accessToken`)
5. **Auth → Get current user (me)** (Bearer `{{accessToken}}`)
6. **Auth → Logout** (clears cookie; refresh should fail after)

### Cookie-based refresh (step 2.4+)

- Login does **not** return the refresh token in JSON — only `Set-Cookie: refresh_token`.
- Postman stores cookies per domain; run **Login** then **Refresh** in the same session.
- Ensure Postman **Settings → General → Cookies** is enabled.

## B2B auth model

- **No public register** — users are provisioned by admins
- **Superadmin** → creates company admin + organization
- **Company admin** → adds team members (Phase 3 API)

## Keeping cloud in sync (for Cursor)

When implementing API steps — **both** steps required every time:

1. Edit `Flowdesk.postman_collection.json` (and environment JSON if needed).
2. **Push to Postman cloud** with Postman MCP (`createCollectionRequest`, `updateCollectionRequest`, `patchEnvironment`, etc.).
3. Authenticate with **browser auth only** — do not use a Postman API key.
4. Preserve existing request/folder IDs from cloud when updating (`getCollection` with `model=full`).
