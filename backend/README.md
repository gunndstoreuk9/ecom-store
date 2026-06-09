# Tawazon Backend

FastAPI backend for the Tawazon Health Morocco COD store.

## Features

- `POST /v1/orders` creates COD orders from the frontend form.
- `GET /v1/orders/{order_id}` returns the thank-you page summary.
- `GET /v1/health` checks API and database connectivity.
- Server-side validation for Morocco mobile numbers and locked offer prices.
- Postgres persistence via SQLAlchemy.
- Alembic migration runs on Docker startup.
- Google Sheets webhook sync with safe failure handling.
- Placeholder conversion event records for Meta/TikTok/Google integrations.
- Protected admin endpoints for orders, revenue, status tracking, and Sheets sync health.

## Local Setup

```bash
cp .env.example .env
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Easypanel

Use `backend/Dockerfile` and set:

```txt
DATABASE_URL=postgres://tawazonhealth:tawazonhealth@tawazon_database:5432/tawazonhealth?sslmode=disable
FRONTEND_URL=https://tawazonhealth.store
CORS_ORIGINS=https://tawazonhealth.store,https://www.tawazonhealth.store
SHEETS_WEBHOOK_URL=<apps-script-webhook-url>
ADMIN_API_KEY=<long-random-admin-key>
```

Open `https://tawazonhealth.store/admin` and enter the same `ADMIN_API_KEY` to access the dashboard.

The container command runs:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
```
