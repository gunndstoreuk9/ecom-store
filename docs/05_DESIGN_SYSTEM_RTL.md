# Design System And RTL Rules

## Design Goal

The site must feel like a premium Moroccan health brand with American import authority. It should not look like a generic Shopify dropshipping store.

Visual keywords:

- medical trust
- premium
- clean
- Arabic-first
- warm Moroccan support
- proof-heavy
- mobile-first
- fast

## Brand Colors

Use CSS variables.

```css
:root {
  --brand-blue: #1E4A8C;
  --brand-blue-700: #173B70;
  --brand-blue-50: #EEF5FF;
  --brand-red: #DC2626;
  --brand-gold: #D4A017;
  --brand-green: #16A34A;
  --ink: #102033;
  --muted: #667085;
  --paper: #FFFFFF;
  --sand: #F8F5EF;
  --border: #E5E7EB;
}
```

Usage:

- blue: header, science blocks, logo circle, trust sections
- red: CTA, scarcity, key price emphasis
- gold: certificate seals and "best value"
- green: COD/guarantee/success states
- sand: warm background sections

## Typography

Recommended font stack:

```css
font-family: "IBM Plex Sans Arabic", "Tajawal", "Cairo", system-ui, sans-serif;
```

Use:

- bold Arabic headings
- high line-height for Arabic body copy
- no tiny text under 13px except legal footer

Scale:

- hero H1 mobile: 32-38px
- hero H1 desktop: 48-64px
- section H2 mobile: 26-32px
- section H2 desktop: 36-44px
- body: 16-18px
- CTA: 17-20px bold

## RTL Rules

Set at document level:

```html
<html lang="ar" dir="rtl">
```

Rules:

- text aligns right by default
- drawer opens from right on desktop
- icons mirror where needed
- chevrons point correctly in RTL
- phone input can remain LTR for number entry
- price text remains readable: `349 درهم`
- avoid mixing too much English in body copy

## Logo Component

Desktop:

```txt
[N circle]  تَوازُن للصحة
            Nama Beauty
```

Mobile:

```txt
[N] تَوازُن
    Nama Beauty
```

Monogram:

- letter `N`
- white or gold letter
- blue circle
- subtle border or shadow

## Layout System

Container:

- max width: 1180-1280px
- horizontal padding: 16px mobile, 24px tablet, 32px desktop

Sections:

- 64-88px vertical padding desktop
- 40-56px mobile

Cards:

- rounded 20-28px
- white background
- subtle border
- soft shadow

Buttons:

- min height 48px mobile
- rounded 999px or 16px
- strong red CTA
- green for WhatsApp secondary

## Responsive Rules

Mobile is primary because paid social traffic will be mobile-heavy.

Mobile:

- single column
- sticky bottom CTA on product page
- cart drawer full height
- offer cards stacked
- reviews horizontally swipeable
- trust badges horizontal scroll
- keep first CTA visible early

Desktop:

- hero split layout: text right, image left
- alternate text/image direction by section
- offer card row
- product content max line length for readability
- sticky summary card allowed on product page

## Page Section Visual Patterns

### Hero

Right:

- badge row
- H1
- subheading
- bullets
- CTA
- micro trust text

Left:

- sample product bottle image
- Moroccan customer placeholder
- USA/Morocco flag badge
- floating rating card

### Problem Section

Use warm sand background and pain cards.

Cards:

- icon
- Darija phrase
- short explanation

### Mechanism Section

Use deep blue background with white cards.

Visual:

- 3-step matrix
- arrows
- ingredient chips

### Ingredient Section

White cards with ingredient name, Arabic label, benefit, and sample image/illustration.

### Authority Section

Use document/certificate cards:

- GMP
- Non-GMO
- Halal
- COA
- pharmacist review

If real docs are missing, the design should show a development placeholder only, not a fake final certificate.

### Social Proof Section

Use mixed proof:

- star rating header
- review cards
- WhatsApp screenshot placeholders
- city labels: Casablanca, Rabat, Fes, Tangier, Marrakech, Agadir

## Placeholder Image Specs

Create sample images or CSS placeholders in `/public/images/placeholders/`.

Required placeholders:

- `hero-product.png`
- `hero-customer.png`
- `product-bottle-front.png`
- `product-bottle-stack-3.png`
- `ingredient-cinnamon.png`
- `ingredient-chromium.png`
- `ingredient-mulberry.png`
- `certificate-placeholder.png`
- `whatsapp-review-placeholder.png`
- `pharmacist-placeholder.png`
- `collection-card-placeholder.png`

The placeholder style should be polished enough for development previews but easy to replace later.

## Cart Drawer UI

Desktop:

- width 420-480px
- right side
- fixed top/bottom
- white background
- shadow

Mobile:

- full viewport height
- safe-area padding bottom
- sticky checkout CTA at drawer bottom

Content hierarchy:

1. cart title
2. selected product
3. offer selector
4. cross-sells
5. summary
6. checkout CTA

## Checkout Popup UI

Popup must look safer than a typical checkout:

- large order summary
- COD badges
- no card logos
- phone field with Morocco hint
- reassurance under CTA
- close button available

Use focus states and keyboard accessibility.

## Timed Upsell UI

The 99 MAD upsell must feel like a quick special offer, not a spam popup.

Design:

- modal or full-screen mobile sheet
- countdown ring/bar
- product image
- clear price `99 درهم`
- accept and skip buttons

Do not trap user after timer. On timeout, continue to thank-you page.

## Performance Design Rules

- Avoid heavy carousels above the fold.
- Use Next.js image optimization.
- Lazy load below-fold images.
- Use `next/script` for deferred pixels.
- Avoid large animation libraries for MVP.
- Prefer CSS transitions.
- Keep LCP image optimized and preloaded.

Target:

- mobile LCP under 2.5s on good 4G
- JS minimal before first interaction
- no blocking tracking scripts in head
