# CRO, Offer, Cart Drawer, Checkout, And Upsell

## Funnel Overview

Traffic from Facebook, TikTok, YouTube, UGC, and advertorials lands mostly on:

`/products/american-sugar-balance-complex`

Flow:

```txt
Landing page CTA
  -> cart drawer opens with selected offer
  -> checkout popup opens from cart CTA
  -> customer enters name + Morocco phone
  -> backend creates base order immediately
  -> 10-15s timed upsell appears
  -> accept or skip updates order
  -> thank-you page
  -> sheet/webhook receives final order state
  -> human WhatsApp/call confirmation collects address
```

## Offer Architecture

Hero product offers:

| Quantity | Price | Position |
|---:|---:|---|
| 1 | 199 MAD | trial |
| 2 | 299 MAD | family/value |
| 3 | 349 MAD | default, best value |

Default selected everywhere:

**3 pieces for 349 MAD**

Why:

- raises AOV
- makes 1 piece at 199 look expensive
- creates 90-day course logic
- supports confirmation script

## Offer UI

Each offer card must show:

- quantity
- course duration
- price
- savings vs 1-piece anchor
- badge
- radio/selected state

Card copy:

1 piece:

**تجربة 30 يوم**

**199 درهم**

2 pieces:

**عرض العائلة**

**299 درهم**

**وفر 99 درهم**

3 pieces:

**كور 90 يوم**

**349 درهم**

**الأكثر طلباً · وفر 248 درهم**

Calculation: 3 x 199 = 597, offer = 349.

## CTA Behavior

Every product CTA must:

1. Set selected hero offer in cart.
2. Open cart drawer.
3. Scroll is not required.
4. Track `AddToCart` web event with a generated event ID.

CTA examples:

- **اطلب الآن — 3 عبوات بـ349 درهم**
- **اختر العرض وافتح السلة**
- **أضف كور 90 يوم للسلة**

## Cart Drawer

No cart page.

Drawer behavior:

- RTL.
- Desktop: slides from right.
- Mobile: full-height bottom sheet or right sheet.
- State persists to localStorage for 24 hours.
- Closing drawer preserves selected offer.
- Cart icon badge shows item count.

Drawer content:

1. Header:
   **سلتك**

2. Trust line:
   **الدفع عند الاستلام · لا تحتاج بطاقة بنكية**

3. Hero line item:
   product image, name, selected offer, price.

4. Offer selector:
   allow changing 1/2/3 quantity inside drawer.

5. Cross-sell block:
   full-price add-ons only. Do not show 99 MAD here.

6. Order summary:
   subtotal, delivery text, total COD.

7. Scarcity:
   **عرض كور 90 يوم متوفر اليوم فقط للطلبات المؤكدة.**

8. Checkout CTA:
   **أكمل الطلب**

9. Support:
   WhatsApp link.

## Cross-Sells In Cart Drawer

Cross-sells are optional and full price in the drawer.

Suggested cross-sells:

| SKU | Name | Drawer Price | Why Relevant |
|---|---|---:|---|
| cravings-support | علكات دعم الرغبة في الحلويات | 199 MAD | same craving pain |
| magnesium-sleep | مغنيسيوم + أشواغندا للنوم والاسترخاء | 199 MAD | stress/sleep and cravings |
| omega-heart | أوميغا 3 لدعم صحة القلب | 199 MAD | health-conscious buyer |

Only show cross-sells if product assets and supply exist. Otherwise show one placeholder card disabled in development.

## Checkout Popup

Triggered from cart drawer CTA.

Fields:

- name
- phone

No address, city, email, or card fields in public checkout MVP.

Why:

- reduces friction
- fits Moroccan COD behavior
- confirmation team collects address after trust is established

Popup content:

- order summary
- selected product/offer
- total
- COD reassurance
- scarcity line
- two fields
- CTA

Phone validation:

Accept:

- `06XXXXXXXX`
- `07XXXXXXXX`
- `+2126XXXXXXXX`
- `+2127XXXXXXXX`
- `2126XXXXXXXX`
- `2127XXXXXXXX`

Reject:

- fewer/more digits
- landline-only numbers for MVP
- non-Morocco country codes
- repeated fake patterns like `0600000000`, `0611111111`, `0666666666`

Normalize and store:

- raw input
- local format: `06XXXXXXXX`
- E.164: `+2126XXXXXXXX`
- hashed versions for pixels, generated server-side only

## Order Creation Timing

When checkout form is valid and customer clicks **أكد طلبي الآن**:

1. Frontend sends base order to backend.
2. Backend stores order as `upsell_pending`.
3. Backend returns `order_id` and tracking event IDs.
4. Frontend fires browser `Lead` and/or `Purchase/CompletePayment` according to tracking spec.
5. Frontend shows timed upsell.

This prevents losing the lead if the customer closes the browser during upsell.

## Timed 99 MAD Upsell

Show after base order creation.

Duration:

10-15 seconds. Recommended: 15 seconds.

Product:

One relevant add-on only, not a carousel.

Default suggested upsell:

**علكات دعم الرغبة في الحلويات**

Price:

**99 MAD**

This is the only place a discounted add-on is allowed.

Rules:

- one-time view per order
- no reopening discount after thank-you
- accept button patches backend order
- skip button marks upsell skipped
- timeout auto-skips and redirects to thank-you
- sheet sync must reflect accepted/skipped state

Accept flow:

```txt
PATCH /orders/{order_id}/upsell
  sku: cravings-support
  price_mad: 99
  status: accepted
redirect /thank-you?order_id=...
```

Skip flow:

```txt
PATCH /orders/{order_id}/upsell
  status: skipped
redirect /thank-you?order_id=...
```

Timeout flow:

```txt
PATCH /orders/{order_id}/upsell
  status: timeout
redirect /thank-you?order_id=...
```

## Conversion Events

Recommended event map:

| Funnel Step | Browser Events | Server Events |
|---|---|---|
| page view | PageView/ViewContent | optional |
| offer selected/add to cart | AddToCart | optional |
| checkout popup opened | InitiateCheckout | optional |
| base order created | Lead + Purchase/CompletePayment | CAPI/Events API |
| upsell accepted | AddToCart + Purchase/CompletePayment update | CAPI/Events API |

For COD stores, optimize initially for `Lead` if ad account purchase quality is weak, then test `Purchase/CompletePayment` once enough confirmed order data exists.

## Scarcity And Urgency

Use ethical scarcity:

- "كمية محدودة لهذا الأسبوع"
- "عرض كور 90 يوم متاح حالياً"
- "الطلبات المؤكدة اليوم لها أولوية التجهيز"

Avoid fake exact stock countdown if it is not connected to real inventory.

## AOV Targets

Target order values:

| Scenario | Total |
|---|---:|
| 1 piece only | 199 MAD |
| 2 pieces only | 299 MAD |
| 3 pieces only | 349 MAD |
| 3 pieces + 99 upsell | 448 MAD |
| 3 pieces + full-price drawer cross-sell | 548 MAD |
| 3 pieces + drawer cross-sell + 99 upsell | 647 MAD |

Blended AOV target:

**400-550 MAD**

## Confirmation Rate CRO

After order:

- thank-you page tells customer a human will call
- WhatsApp auto-message sent if configured
- call within 30 minutes
- confirmation script repeats exact total and COD
- collect address/city during confirmation
- offer one final full-price add-on only if customer is warm

## MVP Priority

Must-have for launch:

- offer selector
- cart drawer
- two-field checkout popup
- valid Morocco phone
- base order save
- 15s upsell
- thank-you page
- sheet webhook
- tracking event IDs

Can ship later:

- admin dashboard
- multiple cross-sells
- city risk scoring
- inventory counter connected to DB
