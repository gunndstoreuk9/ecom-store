# Backend Architecture - FastAPI

## Stack

Use a dedicated `backend/` folder.

Recommended stack:

- Python 3.12+
- FastAPI
- Uvicorn
- Pydantic v2
- pydantic-settings
- SQLAlchemy 2.0
- Alembic
- psycopg / asyncpg
- httpx for outbound webhooks and CAPI
- tenacity for retries
- python-dotenv for local dev only
- pytest for tests

Use current stable package versions when implementing.

## Database

Database name:

`tawazonhealth`

Easypanel internal URL:

```txt
postgres://tawazonhealth:tawazonhealth@tawazon_database:5432/tawazonhealth?sslmode=disable
```

SQLAlchemy may need:

```txt
postgresql+psycopg://tawazonhealth:tawazonhealth@tawazon_database:5432/tawazonhealth
```

Create env var:

`DATABASE_URL`

The backend must support the supplied URL and normalize `postgres://` to `postgresql+psycopg://` if needed.

## App Requirements

Backend must:

- validate orders server-side
- store all order data in Postgres
- run Alembic migrations on startup
- send orders to Google Sheets webhook
- send server-side conversion events
- deduplicate tracking via event IDs
- expose healthcheck route
- use CORS for frontend domain
- be Docker deployable

## Environment Variables

Create `backend/.env.example` from `docs/templates/env.backend.example`.

Required:

- `APP_ENV`
- `API_BASE_URL`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `SHEETS_WEBHOOK_URL`

Tracking:

- `META_PIXEL_ID`
- `META_CAPI_ACCESS_TOKEN`
- `META_TEST_EVENT_CODE`
- `TIKTOK_PIXEL_ID`
- `TIKTOK_ACCESS_TOKEN`
- `GOOGLE_ADS_CONVERSION_ID`
- `GOOGLE_ADS_CONVERSION_LABEL`
- `GOOGLE_API_SECRET` if using GA4 Measurement Protocol

Security:

- `ADMIN_API_KEY` if admin endpoints are added

## Folder Structure

```txt
backend/
  app/
    main.py
    core/
      config.py
      database.py
      migrations.py
      security.py
      logging.py
    models/
      order.py
    schemas/
      order.py
      tracking.py
    api/
      routes/
        health.py
        orders.py
    services/
      orders.py
      sheets.py
      meta_capi.py
      tiktok_events.py
      google_conversions.py
      phone.py
      hashing.py
      money.py
    workers/
      retry_jobs.py
  alembic/
    versions/
  alembic.ini
  Dockerfile
  requirements.txt
  .env.example
  tests/
```

## API Routes

Base path:

`/v1`

Routes:

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | service health |
| POST | `/orders` | create base COD order |
| GET | `/orders/{order_id}` | fetch order for thank-you page |
| PATCH | `/orders/{order_id}/upsell` | accept/skip/timeout timed upsell |
| PATCH | `/orders/{order_id}/confirmation` | optional internal confirmation update |

## Order Creation Payload

Frontend sends:

```json
{
  "customer": {
    "name": "Fatima",
    "phone_raw": "0612345678",
    "phone_e164": "+212612345678"
  },
  "cart": {
    "hero_sku": "american-sugar-balance-complex",
    "hero_qty": 3,
    "hero_price_mad": 349,
    "drawer_cross_sells": []
  },
  "tracking": {
    "event_id": "ordevt_...",
    "meta_event_id": "meta_...",
    "tiktok_event_id": "tt_...",
    "google_transaction_id": "ord_...",
    "fbp": "...",
    "fbc": "...",
    "ttp": "...",
    "ttclid": "..."
  },
  "attribution": {
    "utm_source": "facebook",
    "utm_medium": "paid",
    "utm_campaign": "...",
    "landing_page": "...",
    "referrer": "..."
  }
}
```

Backend must also capture:

- request IP
- user agent
- created timestamp

## Order Statuses

Use clear COD statuses:

- `upsell_pending`
- `new`
- `confirmation_pending`
- `confirmed`
- `no_answer`
- `cancelled`
- `shipped`
- `delivered`
- `returned`

Order creation status:

`upsell_pending`

After upsell accept/skip/timeout:

`new`

## Data Model

### orders

Fields:

- `id` UUID/string primary key
- `public_order_number` readable unique code
- `status`
- `customer_name`
- `phone_raw`
- `phone_local`
- `phone_e164`
- `phone_hash_meta`
- `phone_hash_tiktok`
- `hero_sku`
- `hero_qty`
- `hero_price_mad`
- `subtotal_mad`
- `upsell_status`
- `upsell_sku`
- `upsell_price_mad`
- `total_mad`
- `currency`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `landing_page`
- `referrer`
- `client_ip`
- `user_agent`
- `fbp`
- `fbc`
- `ttp`
- `ttclid`
- `meta_event_id`
- `tiktok_event_id`
- `google_transaction_id`
- `sheet_sync_status`
- `sheet_row_id`
- `sheet_last_error`
- `created_at`
- `updated_at`

### order_items

Fields:

- `id`
- `order_id`
- `sku`
- `name_ar`
- `qty`
- `unit_price_mad`
- `total_price_mad`
- `item_type`: `hero`, `drawer_cross_sell`, `timed_upsell`
- `added_via`: `cart_drawer`, `timed_upsell`, `confirmation_call`
- `created_at`

### conversion_events

Fields:

- `id`
- `order_id`
- `platform`: `meta`, `tiktok`, `google`
- `event_name`
- `event_id`
- `payload_json`
- `status`: `pending`, `sent`, `failed`
- `response_json`
- `attempt_count`
- `last_error`
- `created_at`
- `sent_at`

## Phone Normalization

Server must validate again, even if frontend validates.

Accept Moroccan mobile numbers:

- starts `06` or `07` local
- or `+2126`, `+2127`
- or `2126`, `2127`

Normalize:

- local: `06XXXXXXXX`
- E.164: `+2126XXXXXXXX`
- Meta hash input: digits with country code and no symbols, e.g. `212612345678`
- TikTok hash input: E.164 with plus, e.g. `+212612345678`

Hash:

- SHA-256
- lowercase hex
- trim spaces

## Migrations On Startup

Use Alembic. Backend startup must apply:

```bash
alembic upgrade head
```

Acceptable implementations:

1. Docker command runs migrations then starts API:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
```

2. FastAPI lifespan calls a safe migration function before serving traffic.

Preferred for Easypanel:

- entrypoint script or startup command running `alembic upgrade head`
- fail fast if migration fails

## CORS

Allowed origins:

- `https://tawazonhealth.store`
- `https://www.tawazonhealth.store`
- local dev frontend URL

Do not use wildcard CORS in production.

## Background Work

On order creation:

1. Store order in DB synchronously.
2. Return success quickly.
3. Send sheet webhook and conversion events in background tasks.
4. Store send result in DB.

If background tasks fail:

- do not lose order
- mark sync status failed
- allow retry job or manual retry endpoint later

## Google Sheets Sync

Backend sends signed JSON to Apps Script webhook.

Include:

- full order
- line items
- totals
- tracking
- upsell status
- timestamp
- HMAC/signature or shared secret

Apps Script writes/updates row.

## Server-Side Tracking Services

Backend must implement separate services:

- `meta_capi.py`
- `tiktok_events.py`
- `google_conversions.py`

Each service:

- reads env config
- no-ops if credentials missing
- builds payload
- posts with timeout
- logs response
- stores event status

No CAPI access tokens in frontend.

## Healthcheck

`GET /v1/health`

Response:

```json
{
  "ok": true,
  "service": "tawazon-backend",
  "database": "ok"
}
```

## Docker

Create `backend/Dockerfile`.

Requirements:

- slim Python base
- install dependencies
- copy app
- run Alembic migration before API
- expose `8000`
- use `--proxy-headers` behind Easypanel proxy

## Tests

Required minimum tests:

- Morocco phone validation
- offer total calculation
- order creation schema
- upsell accept adds 99 MAD
- upsell skip does not add price
- hash formatting for Meta/TikTok

## Definition Of Done

Backend is done when:

- migrations run against Postgres
- `/v1/health` works
- order creation persists to DB
- invalid phone is rejected
- upsell accept/skip/timeout works
- sheet webhook receives order data
- Meta/TikTok/Google server events no-op safely when env is missing
- Docker build succeeds
