# Tawazon Store Build Docs Index

This folder is the build source of truth for the DTC Morocco COD store at `tawazonhealth.store` with backend API at `api.tawazonhealth.store`.

## Business Target

Build a premium Arabic-first branded store for Morocco that sells the hero product:

**المركّب الأمريكي لضبط السكر — الأصلي**

The store must feel like a real specialist brand that owns the product experience, not a dropshipping catalog. The brand must communicate authority, Moroccan trust, American import credibility, science, social proof, scarcity, and COD safety.

## Required Output Folders

The AI coder must create this final repository structure:

```txt
frontend/
  Next.js App Router storefront
  Dockerfile
  .env.example

backend/
  FastAPI API
  SQLAlchemy + Alembic migrations
  Dockerfile
  .env.example

docs/
  all planning/spec docs

apps-script/
  Google Sheets webhook code

templates/
  Google Sheets CSV templates

docker-compose.example.yml
README.md
```

## Docs Reading Order

1. `01_BRAND_POSITIONING.md`
2. `02_ICP_LANGUAGE_COPY.md`
3. `03_INFORMATION_ARCHITECTURE_PAGES.md`
4. `04_CRO_OFFER_CART_CHECKOUT.md`
5. `05_DESIGN_SYSTEM_RTL.md`
6. `06_FRONTEND_ARCHITECTURE_NEXTJS.md`
7. `07_BACKEND_ARCHITECTURE_FASTAPI.md`
8. `08_TRACKING_PIXELS_CAPI.md`
9. `09_SHEETS_WEBHOOK_AND_CSV.md`
10. `10_DEPLOYMENT_EASYPANEL_DOCKER.md`
11. `11_COD_OPERATIONS_AND_CONFIRMATION.md`
12. `12_CODING_RULES_DEFINITION_OF_DONE.md`
13. `AI_CODER_PROMPT.md`

## Locked Product Offers

| Offer | Price | Label |
|---|---:|---|
| 1 piece | 199 MAD | تجربة 30 يوم |
| 2 pieces | 299 MAD | عرض العائلة |
| 3 pieces | 349 MAD | كور 90 يوم - الأكثر طلباً |
| One-click timed upsell | 99 MAD | only after checkout form submit |

Default selected offer: **3 pieces at 349 MAD**.

## Checkout Rule

The public checkout popup has only:

- `name`
- `phone`

The phone field must accept only valid Morocco mobile numbers and normalize them to E.164 (`+2126...` or `+2127...`) before sending to backend. Address and city are collected later during WhatsApp/call confirmation.

## Compliance Rule

This is a dietary supplement. Do not claim it cures, treats, reverses, or prevents diabetes or any disease. Use structure/function language:

- يدعم توازن السكر في النطاق الصحي
- يساعد على طاقة ثابتة
- يساعد على تقليل الرغبة في الحلويات
- مكمّل غذائي، ليس دواءً ولا يغني عن استشارة الطبيب

Use real certificates and real testimonials only. If assets are not ready, render polished placeholders clearly marked for replacement in code comments/content config, not fake final claims.
