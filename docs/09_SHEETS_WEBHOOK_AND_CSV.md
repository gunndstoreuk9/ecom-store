# Google Sheets Webhook And CSV Templates

## Goal

Every COD order must be saved in Postgres and synced to Google Sheets for operations.

The sheet is the working dashboard for:

- calling customers
- confirming address
- tracking delivery status
- seeing upsell take rate
- exporting orders to carrier

## Files

Use:

- `docs/apps-script/Code.gs`
- `docs/templates/orders_sheet_template.csv`
- `docs/templates/products_sheet_template.csv`
- `docs/templates/env.backend.example`
- `docs/templates/env.frontend.example`

When implementation starts, the coder should also copy:

- `docs/apps-script/Code.gs` to root `apps-script/Code.gs`
- `docs/templates/*.csv` to root `templates/*.csv`

## Sheet Tabs

Create a Google Sheet with these tabs:

1. `Orders`
2. `Products`
3. `Events` optional later

Import the CSV templates into the first two tabs.

## Orders Columns

Required columns are in `orders_sheet_template.csv`.

Important operational columns:

- `status`
- `customer_name`
- `phone_local`
- `phone_e164`
- `city`
- `address`
- `confirmation_notes`
- `carrier`
- `tracking_number`

The website only collects name and phone. City/address are filled after confirmation call.

## Webhook Security

Apps Script should require a shared secret.

Backend sends:

```json
{
  "secret": "<SHEETS_WEBHOOK_SECRET>",
  "action": "upsert_order",
  "order": {}
}
```

This is simple and enough for MVP. If upgrading later, use HMAC signatures.

## Backend Webhook Behavior

On base order creation:

- create DB order as `upsell_pending`
- send sheet webhook if desired, or wait until upsell decision

Recommended:

1. Send base order immediately with `upsell_status=awaiting`.
2. When upsell accept/skip/timeout occurs, call webhook again with same `order_id`.
3. Apps Script upserts the same row.

This protects lead capture and keeps the sheet final.

## Apps Script Deployment

Steps:

1. Open the Google Sheet.
2. Extensions -> Apps Script.
3. Paste `docs/apps-script/Code.gs`.
4. Set script property:
   - key: `WEBHOOK_SECRET`
   - value: same as backend `SHEETS_WEBHOOK_SECRET`
5. Deploy -> New deployment.
6. Type: Web app.
7. Execute as: Me.
8. Who has access: Anyone with the link.
9. Copy deployment URL.
10. Add URL to backend env:
    - `SHEETS_WEBHOOK_URL`

## Apps Script Actions

Supported:

- `upsert_order`
- `ping`

`upsert_order`:

- finds row by `order_id`
- updates it if found
- appends it if not found

`ping`:

- returns `{ ok: true }`

## Order JSON Shape

Backend should send:

```json
{
  "secret": "secret",
  "action": "upsert_order",
  "order": {
    "order_id": "uuid",
    "public_order_number": "TWZ-10001",
    "created_at": "2026-06-06T20:00:00Z",
    "updated_at": "2026-06-06T20:01:00Z",
    "status": "new",
    "customer_name": "Fatima",
    "phone_raw": "0612345678",
    "phone_local": "0612345678",
    "phone_e164": "+212612345678",
    "hero_sku": "american-sugar-balance-complex",
    "hero_qty": 3,
    "hero_price_mad": 349,
    "upsell_status": "accepted",
    "upsell_sku": "cravings-support",
    "upsell_price_mad": 99,
    "total_mad": 448,
    "currency": "MAD",
    "items_summary": "المركّب الأمريكي لضبط السكر x3 = 349; علكات دعم الرغبة في الحلويات x1 = 99",
    "utm_source": "facebook",
    "utm_campaign": "campaign",
    "landing_page": "https://tawazonhealth.store/products/american-sugar-balance-complex",
    "meta_event_id": "twz_meta",
    "tiktok_event_id": "twz_tt",
    "google_transaction_id": "twz_google"
  }
}
```

## Sheet Sync Status In Backend

Store:

- `sheet_sync_status`: `pending`, `synced`, `failed`
- `sheet_last_error`
- `sheet_synced_at`

If webhook fails:

- keep order in DB
- mark failed
- retry later

## Manual Sheet Use

After order arrives:

1. Agent calls customer.
2. Agent fills city/address.
3. Agent changes status to `confirmed`, `no_answer`, or `cancelled`.
4. Agent adds notes.
5. Carrier/tracking filled when shipped.

Later, an admin dashboard can replace manual sheet editing.

## CSV Import Notes

CSV templates are UTF-8 and include Arabic headers/content where needed.

If Arabic appears broken:

- import through Google Sheets File -> Import
- choose UTF-8
- do not open/save through old Excel defaults
