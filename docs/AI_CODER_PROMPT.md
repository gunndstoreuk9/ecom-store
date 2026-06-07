# Prompt For AI Coder

Use this prompt in a new coding chat.

```txt
You are building the Tawazon Health / تَوازُن للصحة DTC COD ecommerce store for Morocco.

Read every doc in the `docs/` folder before coding. The docs are the source of truth:

1. docs/00_README_BUILD_INDEX.md
2. docs/01_BRAND_POSITIONING.md
3. docs/02_ICP_LANGUAGE_COPY.md
4. docs/03_INFORMATION_ARCHITECTURE_PAGES.md
5. docs/04_CRO_OFFER_CART_CHECKOUT.md
6. docs/05_DESIGN_SYSTEM_RTL.md
7. docs/06_FRONTEND_ARCHITECTURE_NEXTJS.md
8. docs/07_BACKEND_ARCHITECTURE_FASTAPI.md
9. docs/08_TRACKING_PIXELS_CAPI.md
10. docs/09_SHEETS_WEBHOOK_AND_CSV.md
11. docs/10_DEPLOYMENT_EASYPANEL_DOCKER.md
12. docs/11_COD_OPERATIONS_AND_CONFIRMATION.md
13. docs/12_CODING_RULES_DEFINITION_OF_DONE.md

Build the final repository with:

- `frontend/`: Next.js App Router, React, TypeScript, Tailwind, shadcn/ui, RTL Arabic storefront.
- `backend/`: Python FastAPI, SQLAlchemy, Alembic, Postgres, order API, Sheets webhook sync, CAPI tracking.
- `apps-script/Code.gs`: copy/adapt from `docs/apps-script/Code.gs`.
- `templates/`: copy CSV/env/docker templates from `docs/templates/`.
- `docker-compose.example.yml`: local development reference.
- root README explaining setup, env vars, local dev, Docker, Easypanel deployment, and Google Sheets setup.

Business/funnel requirements:

- Brand: `تَوازُن للصحة` with English logo subline `Nama Beauty`.
- Header: on the right, an `N` inside a circle in the brand color, beside the Arabic wordmark, with `Nama Beauty` underneath; menu then cart.
- Domain: `tawazonhealth.store`.
- Backend domain: `api.tawazonhealth.store`.
- Product: `المركّب الأمريكي لضبط السكر — الأصلي`.
- Offers:
  - 1 piece = 199 MAD
  - 2 pieces = 299 MAD
  - 3 pieces = 349 MAD
  - default selected = 3 pieces
- Store is COD only.
- No cart page. Use a global cart drawer.
- Every product CTA chooses the selected offer, adds it to cart, and opens the cart drawer.
- Cart drawer can show full-price cross-sells.
- Cart CTA opens checkout popup.
- Checkout popup has only 2 fields: name and Morocco phone.
- Phone must validate Morocco mobile numbers only and normalize to E.164.
- On valid checkout submit, create the base order immediately in backend.
- Then show a 10-15 second one-time upsell modal for a relevant product at 99 MAD. This is the only discounted upsell place.
- Accept/skip/timeout must update the backend order.
- Then redirect to thank-you page.
- Send/sync order to Google Sheet via webhook and keep Postgres as source of truth.
- Backend must run Alembic database migrations on startup.
- Include Meta Pixel + Meta CAPI, TikTok Pixel + Events API, and Google/YouTube conversion tracking.
- Web pixels must be deferred for speed.
- Browser/server events must use matching event IDs for deduplication.
- Hashing is server-side:
  - Meta phone hash input: country-code digits without plus, e.g. `212612345678`.
  - TikTok phone hash input: E.164 with plus, e.g. `+212612345678`.
- Do not expose server tokens in frontend.

Pages required:

- `/`
- `/products/american-sugar-balance-complex`
- `/collections`
- `/about`
- `/contact`
- `/thank-you`
- `/privacy-policy`
- `/terms`
- `/return-policy`

Design requirements:

- Arabic-first and RTL.
- Mobile-first.
- Premium medical trust style.
- Brand colors from `docs/05_DESIGN_SYSTEM_RTL.md`.
- Desktop sections should alternate text/image sides where appropriate.
- Use polished sample image placeholders in `/public/images/placeholders/`; images will be replaced later.
- Use trust, authority, proof, ingredient science, emotional copy, reviews, certification slots, FAQ, guarantee, and COD reassurance as specified in docs.

Backend requirements:

- Use the Easypanel Postgres URL from docs/env:
  `postgres://tawazonhealth:tawazonhealth@tawazon_database:5432/tawazonhealth?sslmode=disable`
- Implement `/v1/health`, `/v1/orders`, `/v1/orders/{order_id}`, `/v1/orders/{order_id}/upsell`.
- Validate totals server-side. Do not trust frontend prices.
- Store orders, order_items, and conversion_events.
- If Sheets or CAPI fails, keep the order and mark sync/event status failed for retry.

Compliance:

- This is a dietary supplement, not a medicine.
- Do not write cure/treat/reverse/prevent disease claims.
- Do not fake certificates, reviews, doctors, lab tests, or guarantees.
- Use placeholders only where assets are missing and make them easy to replace.

Definition of done:

- Frontend builds and runs in Docker.
- Backend builds and runs in Docker.
- Alembic migrations run on backend startup.
- Local docker-compose works.
- End-to-end order flow works: product page -> cart drawer -> checkout -> 99 MAD timed upsell -> thank-you -> DB -> Sheet.
- Valid/invalid Morocco phone tests pass.
- Tracking no-ops safely when env vars are missing and sends events when configured.
- All env examples are included.
- README explains deployment to Easypanel.

Start by creating the repo structure and implementing the MVP end-to-end before polishing extra sections.
```
