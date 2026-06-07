# Frontend Architecture - Next.js

## Stack

Use a dedicated `frontend/` folder.

Recommended stack:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui for accessible UI primitives
- Radix UI primitives where needed
- Zustand for cart state
- Zod for validation
- React Hook Form for checkout form
- next-intl only if adding French later; MVP can be Arabic-only
- lucide-react for icons

Use current stable package versions when implementing.

## App Requirements

The frontend must be:

- Arabic-first
- RTL
- mobile-first
- responsive
- fast
- SEO-ready
- tracking-ready
- Docker deployable

## Environment Variables

Create `frontend/.env.example` from `docs/templates/env.frontend.example`.

Client-exposed variables must use `NEXT_PUBLIC_`.

Required:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_META_PIXEL_ID`
- `NEXT_PUBLIC_TIKTOK_PIXEL_ID`
- `NEXT_PUBLIC_GOOGLE_TAG_ID`
- `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID`
- `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

## Folder Structure

```txt
frontend/
  app/
    layout.tsx
    page.tsx
    globals.css
    products/
      american-sugar-balance-complex/
        page.tsx
    collections/
      page.tsx
    about/
      page.tsx
    contact/
      page.tsx
    thank-you/
      page.tsx
    privacy-policy/
      page.tsx
    terms/
      page.tsx
    return-policy/
      page.tsx
  components/
    layout/
      Header.tsx
      Footer.tsx
      TrustStrip.tsx
      MobileStickyCta.tsx
    brand/
      Logo.tsx
      TrustBadges.tsx
      CertificateCard.tsx
    product/
      ProductHero.tsx
      OfferSelector.tsx
      IngredientGrid.tsx
      MechanismMatrix.tsx
      ReviewsSection.tsx
      FAQ.tsx
    cart/
      CartDrawer.tsx
      CartProvider.tsx
      CartSummary.tsx
      CrossSellCard.tsx
      CheckoutPopup.tsx
      TimedUpsellModal.tsx
    tracking/
      PixelScripts.tsx
  config/
    brand.ts
    products.ts
    offers.ts
    site.ts
  lib/
    api.ts
    phone.ts
    tracking.ts
    event-id.ts
    currency.ts
    storage.ts
  public/
    images/
      placeholders/
  Dockerfile
  next.config.ts
  package.json
  .env.example
```

## Routing

Use App Router.

Root layout:

- `<html lang="ar" dir="rtl">`
- metadata title/description
- global fonts
- global tracking scripts component
- cart provider
- header/footer
- cart drawer mounted globally

Do not create `/cart`.

## Content Config

Hardcode MVP content in typed config files so it can be replaced later.

`config/products.ts` must include:

- SKU
- Arabic name
- English/internal name
- description
- image paths
- ingredients
- badges
- offers
- compliance disclaimer

`config/offers.ts`:

```ts
export const HERO_OFFERS = [
  { id: "one", qty: 1, priceMad: 199, label: "تجربة 30 يوم" },
  { id: "two", qty: 2, priceMad: 299, label: "عرض العائلة" },
  { id: "three", qty: 3, priceMad: 349, label: "كور 90 يوم", default: true },
]

export const TIMED_UPSELL = {
  sku: "cravings-support",
  priceMad: 99,
  durationSeconds: 15,
}
```

## Cart State

Use Zustand or React context with localStorage.

State:

- `selectedOfferId`
- `heroQty`
- `heroPriceMad`
- `drawerOpen`
- `checkoutOpen`
- `crossSells`
- `lastOrderId`
- `utm`

Persist:

- selected offer
- cross-sells
- UTM data

Expire persisted cart after 24 hours.

## Checkout Form

Use React Hook Form + Zod.

Fields:

- `name`
- `phone`

Validation:

- name: min 2 characters
- phone: valid Moroccan mobile

Use `lib/phone.ts`:

- `normalizeMoroccoPhone(input)`
- `isValidMoroccoMobile(input)`
- `toLocalMoroccoPhone(input)`
- `toE164MoroccoPhone(input)`

Frontend sends raw and normalized phone to backend. Backend must validate again.

## API Client

Use `NEXT_PUBLIC_API_BASE_URL`.

Endpoints:

- `POST /v1/orders`
- `PATCH /v1/orders/{order_id}/upsell`
- `GET /v1/orders/{order_id}`

Handle:

- loading
- duplicate submit prevention
- backend validation errors
- retry once for network failure

## Order Flow Implementation

On checkout submit:

1. Validate form.
2. Generate event IDs for Meta/TikTok/Google.
3. POST order to backend with cart, customer, UTM, cookies, and event IDs.
4. Fire browser conversion events with the same event IDs.
5. Show timed upsell modal.
6. Accept/skip/timeout patches backend.
7. Navigate to `/thank-you?order_id=...`.

Do not wait for tracking scripts to finish before navigating.

## Tracking Integration

Create a tracking wrapper:

`lib/tracking.ts`

Functions:

- `trackPageView`
- `trackViewContent`
- `trackAddToCart`
- `trackInitiateCheckout`
- `trackLead`
- `trackPurchase`
- `trackUpsellAccepted`

Each function must:

- no-op if pixel ID missing
- queue safely until scripts are ready
- include `eventID`/`event_id` where required
- avoid sending sensitive health terms in custom parameters

Do not expose access tokens in frontend.

## Deferred Scripts

Use Next.js `next/script`:

- Meta Pixel: `strategy="afterInteractive"` or `lazyOnload`
- TikTok Pixel: `strategy="afterInteractive"` or `lazyOnload`
- Google tag: `strategy="afterInteractive"` or `lazyOnload`

Do not block rendering with pixel scripts.

## SEO Metadata

Use Arabic metadata.

Home title:

**تَوازُن للصحة | دعم توازن السكر والطاقة في المغرب**

Product title:

**المركّب الأمريكي لضبط السكر — الأصلي | تَوازُن للصحة**

Description:

**مكمّل غذائي أمريكي بـ20 مكوّن نشط لدعم توازن السكر في النطاق الصحي، الطاقة، والتحكم في الرغبة بالحلويات. الدفع عند الاستلام في المغرب.**

Open Graph:

- title
- description
- image placeholder
- site URL
- locale `ar_MA`

## Accessibility

Required:

- semantic HTML sections
- buttons for actions, not clickable divs
- modal focus trap
- ESC closes cart/checkout
- visible focus states
- alt text for images
- labels for inputs
- error text near fields
- color contrast on CTA

## Performance

Required:

- optimize hero image
- lazy-load below fold images
- dynamic import non-critical sections if needed
- no huge animation libraries
- only load pixels after interactive/lazy
- avoid rendering all reviews/FAQ as heavy client components

## Docker

Create `frontend/Dockerfile`.

Requirements:

- multi-stage build
- install dependencies
- build Next.js
- run standalone server if configured
- expose port `3000`
- support `HOSTNAME=0.0.0.0`

Use Next.js standalone output:

```ts
// next.config.ts
const nextConfig = {
  output: "standalone",
}

export default nextConfig
```

## Definition Of Done

Frontend is done when:

- every route renders
- mobile and desktop layouts work
- cart drawer works globally
- checkout creates backend order
- timed upsell updates order
- thank-you fetches and displays order
- phone validation rejects invalid Morocco numbers
- tracking events fire without blocking page speed
- missing env vars do not crash the app
- Docker build succeeds
