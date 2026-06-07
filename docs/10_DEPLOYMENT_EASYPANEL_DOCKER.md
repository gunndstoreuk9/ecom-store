# Deployment, Docker, And Easypanel

## Target Domains

Frontend:

`https://tawazonhealth.store`

Optional www:

`https://www.tawazonhealth.store`

Backend:

`https://api.tawazonhealth.store`

Database:

Postgres service already installed in Easypanel.

Internal DB URL:

```txt
postgres://tawazonhealth:tawazonhealth@tawazon_database:5432/tawazonhealth?sslmode=disable
```

## Repository Structure

Final repo:

```txt
frontend/
backend/
docs/
apps-script/
templates/
docker-compose.example.yml
README.md
```

## Frontend Docker

`frontend/Dockerfile` requirements:

- install deps
- build Next.js
- use standalone output
- expose 3000
- run on `0.0.0.0`

Expected command:

```bash
PORT=3000 HOSTNAME=0.0.0.0 node server.js
```

Frontend env in Easypanel:

- `NEXT_PUBLIC_SITE_URL=https://tawazonhealth.store`
- `NEXT_PUBLIC_API_BASE_URL=https://api.tawazonhealth.store`
- pixel IDs
- WhatsApp number

Important:

Next.js public env vars are inlined at build time. In Easypanel, ensure public env vars are available during build, not only runtime.

## Backend Docker

`backend/Dockerfile` requirements:

- Python slim
- install requirements
- expose 8000
- run Alembic migrations before startup
- run Uvicorn with proxy headers

Suggested startup command:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
```

Backend env in Easypanel:

- `DATABASE_URL=postgres://tawazonhealth:tawazonhealth@tawazon_database:5432/tawazonhealth?sslmode=disable`
- `FRONTEND_URL=https://tawazonhealth.store`
- `CORS_ORIGINS=https://tawazonhealth.store,https://www.tawazonhealth.store`
- sheets webhook variables
- CAPI variables

## Database Migrations

Use Alembic.

Migration command must run automatically on backend startup.

If migrations fail:

- backend must not start
- logs must show error clearly

First migration should create:

- `orders`
- `order_items`
- `conversion_events`

Optional:

- `webhook_deliveries`
- `admin_notes`

## Example docker-compose

Create `docker-compose.example.yml` for local dev and GitHub reference.

Services:

- `frontend`
- `backend`
- `postgres`

Expose:

- frontend `3000`
- backend `8000`
- postgres `5432` local only

Local database URL:

```txt
postgresql+psycopg://tawazonhealth:tawazonhealth@postgres:5432/tawazonhealth
```

## Easypanel Deployment Steps

1. Push repo to GitHub.
2. Create backend app from `backend/`.
3. Set backend domain `api.tawazonhealth.store`.
4. Add backend env vars.
5. Connect backend to existing Postgres internal service.
6. Deploy backend and confirm `/v1/health`.
7. Create frontend app from `frontend/`.
8. Set frontend domain `tawazonhealth.store`.
9. Add frontend env vars.
10. Deploy frontend.
11. Test order creation end-to-end.
12. Verify Google Sheets row.
13. Verify tracking events in platform test tools.

## DNS

Use Cloudflare if possible.

Records:

- `tawazonhealth.store` -> frontend app target
- `www` -> frontend app target or redirect
- `api` -> backend app target

Enable SSL for both frontend and backend.

## CORS

Production CORS must allow only:

- `https://tawazonhealth.store`
- `https://www.tawazonhealth.store`

Local dev:

- `http://localhost:3000`

## Health Checks

Backend:

`GET https://api.tawazonhealth.store/v1/health`

Frontend:

`GET https://tawazonhealth.store`

## Launch QA

Before ads:

- mobile home loads fast
- product page CTA opens cart drawer
- cart drawer offer changes update total
- checkout rejects invalid phone
- valid order creates DB row
- upsell accept adds 99 MAD
- skip/timeout does not add 99 MAD
- thank-you page shows correct total
- Google Sheet receives row
- Meta test events receive browser/server events
- TikTok test events receive browser/server events
- Google conversion fires
- privacy/terms/return pages exist

## Rollback

If backend deploy fails:

- keep previous backend running if Easypanel supports rollback
- do not run destructive DB commands
- inspect migration logs
- create forward migration fix

Never manually delete production order rows.

## Secrets

Do not commit:

- `.env`
- API tokens
- database passwords beyond examples
- real webhook URLs
- pixel access tokens

Commit only:

- `.env.example`
- docs
- source code
