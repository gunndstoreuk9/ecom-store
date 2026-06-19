# Shopify Sheets To Call Center

Use this flow when Shopify stores send leads into Google Sheets and you want those leads to appear in the Tawazon Call Center dashboard automatically.

## Backend Env

Add this variable to the backend service in Easypanel:

```env
SHOPIFY_SHEET_WEBHOOK_TOKEN=use-a-long-random-secret
```

The import endpoint is:

```text
https://api.tawazonhealth.store/v1/orders/sheet-import?token=SHOPIFY_SHEET_WEBHOOK_TOKEN
```

## Required Sheet Columns

Each Shopify lead sheet must have these headers:

```text
SKU
FULL NAME
PHONE NUMBER
```

The Apps Script also accepts common Shopify aliases:

```text
SKU: SKU, Product SKU, Lineitem sku, Variant SKU
FULL NAME: Full Name, Name, Customer Name, Shipping Name
PHONE NUMBER: Phone Number, Phone, Mobile, Shipping Phone
CITY: City, Shipping City
ADDRESS: Address, Shipping Address, Address1
QUANTITY: Quantity, Qty, Lineitem quantity
TOTAL PRICE MAD: Total Price MAD, Total, Price, Amount
```

Recommended extra headers:

```text
CITY
ADDRESS
QUANTITY
TOTAL PRICE MAD
PRODUCT NAME
SHOPIFY ORDER ID
```

The Apps Script will add these tracking columns automatically:

```text
CALL CENTER IMPORT STATUS
CALL CENTER ORDER ID
CALL CENTER IMPORT ERROR
```

Rows marked `IMPORTED` will not be sent again.

## Product SKU Mapping

The backend maps sheet SKUs to Call Center products:

```text
TOPLUX-BSC-940-60      -> المركّب الأمريكي لضبط السكر
MIRACLE-MEN-OIL-30ML   -> الدهان الأمريكي المعجزة للرجال
```

Only rows with an explicit supported SKU are imported. Rows without one are marked `SKIPPED_NO_SKU` and are not sent to the call center.

For the RADC Shopify export, the script also fixes the common shifted layout automatically when column A contains a supported SKU:

```text
A = customer name
B = phone
C = city
E = quantity
F = total price
G = product name
```

Supported SKUs:

```text
MIRACLE-MEN-OIL-30ML
TOPLUX-BSC-940-60
```

If a Shopify sheet has a different SKU, update the sheet SKU to one of the values above before importing.

## Google Apps Script Setup

1. Open the Shopify lead Google Sheet.
2. Go to `Extensions` -> `Apps Script`.
3. Paste the code from:

```text
apps-script/ShopifyLeadsToCallCenter.gs
```

4. Replace:

```js
const CALL_CENTER_IMPORT_TOKEN = 'CHANGE_THIS_TO_SHOPIFY_SHEET_WEBHOOK_TOKEN';
```

with the same value you added to `SHOPIFY_SHEET_WEBHOOK_TOKEN`.

If the script is not bound directly to the lead sheet, set these constants too:

```js
const SHOPIFY_SPREADSHEET_ID = 'GOOGLE_SHEET_ID_HERE';
const SHOPIFY_SHEET_NAME = 'Sheet1';
```

5. Save the script.
6. Run `sendNewLeadsToCallCenter` once and approve permissions.
7. Run `installEveryMinuteTrigger` once to send new rows automatically every minute.

After this, new sheet rows will appear in `/admin/call-center` under the correct product filter.
