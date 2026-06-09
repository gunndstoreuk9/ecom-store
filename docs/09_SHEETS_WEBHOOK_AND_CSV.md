# Google Sheets Webhook And CSV Templates

## Goal

Every COD order must be saved in Postgres and synced to Google Sheets for operations.

The sheet is the working dashboard for:

- calling customers
- confirming address
- tracking delivery status
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

Create a Google Sheet with this tab:

1. `Sheet1`

Import `orders_sheet_template.csv` into `Sheet1`.

## Orders Columns

Required columns are in `orders_sheet_template.csv`.

Required columns:

- `DATE`
- `SKU`
- `FULL NAME`
- `PHONE NUMBER`
- `CITY`
- `QUANTITY`
- `TOTAL PRICE MAD`
- `STATUS`

The website collects name, phone, and city. `STATUS` is intentionally empty for operations.

## Webhook Security

Apps Script does not require a shared secret for this MVP. Protect the URL and do not publish it publicly.

Backend sends:

```json
{
  "action": "upsert_order",
  "order": {}
}
```

If upgrading later, use HMAC signatures or a shared secret again.

## Backend Webhook Behavior

On order creation, send the order immediately to Google Sheets. Apps Script appends a new row for each order.

## Apps Script Deployment

Steps:

1. Open the Google Sheet.
2. Extensions -> Apps Script.
3. Paste `docs/apps-script/Code.gs`.
4. Deploy -> New deployment.
5. Type: Web app.
6. Execute as: Me.
7. Who has access: Anyone with the link.
8. Copy deployment URL.
9. Add URL to backend env:
    - `SHEETS_WEBHOOK_URL`

## Apps Script Actions

Supported:

- `upsert_order`
- `ping`

`upsert_order`:

- appends a new row to the sheet

`ping`:

- returns `{ ok: true }`

## Order JSON Shape

Backend should send:

```json
{
  "action": "upsert_order",
  "order": {
    "DATE": "01/05/2026",
    "SKU": "TOPLUX-BSC-940-60",
    "FULL NAME": "Fatima",
    "PHONE NUMBER": "212604752334",
    "CITY": "Marrakech",
    "QUANTITY": "3",
    "TOTAL PRICE MAD": 349,
    "STATUS": ""
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
