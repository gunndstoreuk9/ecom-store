# Coding Rules And Definition Of Done

## Core Engineering Rules

- Build two separate apps: `frontend/` and `backend/`.
- Keep docs in `docs/`.
- Keep Google Sheets Apps Script in `apps-script/`.
- Keep CSV templates in `templates/`.
- Use TypeScript in frontend.
- Use typed Pydantic schemas in backend.
- Validate all money totals server-side.
- Validate phone both frontend and backend.
- Do not trust frontend prices.
- Do not expose backend tokens to frontend.
- Do not commit `.env`.
- Do not fake certificates or reviews.

## Frontend Rules

- App Router only.
- Arabic-first and RTL by default.
- Use reusable components.
- Keep product/copy config in typed config files.
- No `/cart` route.
- Cart drawer is global.
- Checkout popup has only name and phone.
- Timed upsell appears only after base order is created.
- Pixel scripts must be deferred.
- Missing pixel IDs must not crash app.
- Use accessible modal/drawer components.

## Backend Rules

- FastAPI under `backend/`.
- Base API path `/v1`.
- SQLAlchemy models and Alembic migrations.
- Run migrations on startup.
- Do not lose orders if sheet or CAPI fails.
- Store webhook/CAPI failures for retry.
- Normalize phone consistently.
- Hash phone server-side.
- CORS restricted in production.
- Health endpoint must check DB.

## Pricing Rules

Backend must enforce:

```txt
hero qty 1 -> 199 MAD
hero qty 2 -> 299 MAD
hero qty 3 -> 349 MAD
timed upsell -> 99 MAD
drawer cross-sells -> full configured price, usually 199 MAD
```

Reject any payload with client-modified prices.

## Compliance Rules

Allowed:

- supports healthy blood sugar already within normal range
- supports energy
- supports cravings control
- daily supplement
- imported from USA if true
- GMP/Non-GMO/Halal/COA only if documentation exists

Not allowed:

- cures diabetes
- treats diabetes
- reverses diabetes
- replaces medication
- guaranteed results
- fake doctor
- fake certificate
- fake review screenshots

## Tracking Rules

- Generate event IDs before conversion.
- Browser and server use same event IDs.
- Meta phone hash input: country-code digits without plus.
- TikTok phone hash input: E.164 with plus.
- Do not send health condition labels in event custom data.
- No access tokens in frontend.

## UX Rules

- First CTA visible early on mobile.
- Offer selector easy to tap.
- Button tap targets at least 48px.
- Phone input opens numeric keyboard.
- Show COD reassurance near every CTA.
- Thank-you page explains next call.
- Do not surprise customer with hidden total.

## Testing Requirements

Minimum frontend checks:

- route renders for every page
- cart drawer opens from every CTA
- offer selector changes totals
- checkout validates phone
- upsell accept/skip/timeout works
- thank-you shows order summary

Minimum backend tests:

- phone normalization
- price calculation
- invalid price rejection
- create order
- accept upsell
- skip upsell
- sheet payload shape
- hash helpers

## Definition Of Done

The project is done when:

- `frontend/` builds and runs in Docker.
- `backend/` builds and runs in Docker.
- backend connects to Postgres.
- Alembic migration runs on startup.
- order flow works end-to-end.
- Google Sheet receives or updates order row.
- env examples exist for frontend/backend.
- tracking services are implemented and safe when env vars are missing.
- all required pages exist.
- mobile layout is polished.
- no fake proof is shipped as real proof.
- README explains local dev and deployment.

## Launch Blockers

Do not launch paid traffic if:

- phone validation is broken
- order totals can be manipulated
- sheet webhook is not receiving orders
- backend CORS blocks frontend
- thank-you page fails
- checkout asks for card payment
- product page contains cure/treatment claims
- mobile CTA/cart drawer is broken
