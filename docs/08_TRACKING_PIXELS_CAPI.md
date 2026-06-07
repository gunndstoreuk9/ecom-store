# Tracking, Web Pixels, CAPI, And Deduplication

## Goal

Install browser and server-side tracking for:

- Meta Pixel + Meta Conversions API
- TikTok Pixel + TikTok Events API
- Google tag for Google Ads/YouTube traffic
- optional GA4 Measurement Protocol

Tracking must be fast, deferred, deduplicated, and privacy-conscious.

## General Rules

- Web pixels are loaded after the page is interactive or on lazy load.
- Server tokens are never exposed to frontend.
- Browser event IDs must match server event IDs for deduplication.
- Do not send sensitive health-condition labels in event names or custom data.
- Use neutral events and product/category names.
- Hash phone server-side for CAPI/events APIs.
- Store raw order data in backend DB before sending any conversion API call.

## Event Names

Use standard events where possible.

| Step | Meta | TikTok | Google |
|---|---|---|---|
| page view | PageView | PageView | page_view |
| product viewed | ViewContent | ViewContent | view_item |
| offer/cart | AddToCart | AddToCart | add_to_cart |
| checkout opened | InitiateCheckout | InitiateCheckout | begin_checkout |
| order form submitted | Lead | SubmitForm or CompletePayment | conversion |
| COD order created | Purchase or Lead | CompletePayment | conversion |
| upsell accepted | Purchase update/custom | CompletePayment/custom | conversion/update |

For COD launch, it is acceptable to optimize ads for `Lead` first and still send `Purchase/CompletePayment` for order value measurement.

## Event ID Strategy

Generate IDs in frontend before order submission:

```txt
order_public_id = backend-created readable order number
base_event_id = "twz_" + uuid
meta_event_id = base_event_id + "_meta_purchase"
tiktok_event_id = base_event_id + "_tt_completepayment"
google_transaction_id = base_event_id
```

When backend creates the order, store the event IDs. Browser and server must use the same matching IDs.

Meta dedup requires:

- browser `eventID`
- server `event_id`
- same event name

TikTok dedup requires:

- same pixel/event source
- same event name/type
- same `event_id`

Google dedup/conversion attribution should use:

- `transaction_id` or order ID where applicable

## Meta Pixel - Browser

Load using `next/script` after interactive or lazy.

Pseudo implementation:

```tsx
<Script id="meta-pixel" strategy="afterInteractive">
  {`
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
    fbq('track', 'PageView');
  `}
</Script>
```

Send deduped event:

```ts
window.fbq?.(
  "track",
  "Lead",
  { value: totalMad, currency: "MAD" },
  { eventID: metaEventId }
)
```

## Meta CAPI - Server

Endpoint:

```txt
https://graph.facebook.com/vXX.X/{META_PIXEL_ID}/events
```

Use current Graph API version when implementing.

Required/recommended fields for web events:

- `event_name`
- `event_time`
- `event_id`
- `action_source: "website"`
- `event_source_url`
- `user_data`
- `custom_data`

Customer data:

- `ph`: SHA-256 hash required
- `client_ip_address`: do not hash
- `client_user_agent`: do not hash
- `fbp`: do not hash
- `fbc`: do not hash
- `external_id`: hash recommended

Phone hashing for Meta:

1. Normalize Moroccan number to country-code digits with no symbols.
2. Example: `+212612345678` -> `212612345678`.
3. SHA-256 hash lowercase hex.

Example payload:

```json
{
  "data": [
    {
      "event_name": "Lead",
      "event_time": 1780770000,
      "event_id": "twz_abc_meta_lead",
      "action_source": "website",
      "event_source_url": "https://tawazonhealth.store/products/american-sugar-balance-complex",
      "user_data": {
        "ph": ["<sha256_phone_digits>"],
        "client_ip_address": "197.230.0.1",
        "client_user_agent": "Mozilla/5.0...",
        "fbp": "fb.1....",
        "fbc": "fb.1...."
      },
      "custom_data": {
        "currency": "MAD",
        "value": 349,
        "order_id": "TWZ-10001",
        "contents": [
          {
            "id": "american-sugar-balance-complex",
            "quantity": 3,
            "item_price": 349
          }
        ],
        "content_type": "product"
      }
    }
  ],
  "test_event_code": "<optional>"
}
```

Do not include disease terms like diabetes in custom fields.

## TikTok Pixel - Browser

Load deferred after interactive/lazy.

Use TikTok's base pixel snippet configured by `NEXT_PUBLIC_TIKTOK_PIXEL_ID`.

Deduped event:

```ts
window.ttq?.track("CompletePayment", {
  value: totalMad,
  currency: "MAD",
  content_type: "product",
  contents: [
    { content_id: "american-sugar-balance-complex", quantity: heroQty, price: totalMad }
  ],
  event_id: tiktokEventId
})
```

If TikTok pixel API requires event ID as a separate option in the implementation package, follow the official current SDK docs. The important rule is that browser and server use the same `event_id`.

## TikTok Events API - Server

Endpoint:

```txt
https://business-api.tiktok.com/open_api/v1.3/event/track/
```

Use current TikTok Events API version if updated.

Required/recommended:

- `event_source`: `web`
- `event_source_id`: TikTok pixel code
- `event`: `CompletePayment` or configured standard event
- `event_id`: same as browser
- `timestamp`
- `context`
- `properties`

Phone hashing for TikTok:

1. Normalize to E.164 with plus.
2. Example: `+212612345678`.
3. Remove spaces/dashes, keep plus before country code.
4. SHA-256 hash lowercase hex.

TikTok specifically recommends phone numbers include country code with `+` before hashing, except China-specific cases.

Example payload:

```json
{
  "event_source": "web",
  "event_source_id": "<TIKTOK_PIXEL_ID>",
  "data": [
    {
      "event": "CompletePayment",
      "event_id": "twz_abc_tt_completepayment",
      "timestamp": "2026-06-06T20:00:00Z",
      "context": {
        "ip": "197.230.0.1",
        "user_agent": "Mozilla/5.0...",
        "ad": {
          "callback": "ttclid-value"
        },
        "user": {
          "phone_number": "<sha256_+212_phone>",
          "external_id": "<sha256_order_or_customer_id>"
        }
      },
      "properties": {
        "currency": "MAD",
        "value": 349,
        "order_id": "TWZ-10001",
        "contents": [
          {
            "content_id": "american-sugar-balance-complex",
            "content_type": "product",
            "quantity": 3,
            "price": 349
          }
        ]
      }
    }
  ]
}
```

## Google Tag / YouTube Ads

YouTube paid traffic uses Google Ads conversion tracking through the Google tag.

Browser:

- load `gtag.js` deferred
- configure `NEXT_PUBLIC_GOOGLE_TAG_ID`
- fire conversion when order is created

Example:

```ts
window.gtag?.("event", "conversion", {
  send_to: `${conversionId}/${purchaseLabel}`,
  value: totalMad,
  currency: "MAD",
  transaction_id: googleTransactionId,
})
```

Enhanced conversions:

- Do not hash in frontend if avoidable.
- Backend can hash normalized phone and send enhanced conversion data if using a server-side Google integration.
- If frontend enhanced conversions are implemented later, follow Google’s current consent and formatting requirements.

## Attribution Capture

Frontend must capture and persist:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `fbclid`
- `ttclid`
- `gclid`
- landing page
- referrer

Persist in localStorage/cookie for at least 7 days, unless user privacy requirements say otherwise.

Backend must store these with the order.

## Cookies To Capture

Meta:

- `_fbp`
- `_fbc`

TikTok:

- `_ttp`
- `ttclid` from URL

Google:

- `gclid` from URL if present

Do not crash if cookies are missing.

## Upsell Tracking

When upsell accepted:

- frontend tracks event with separate event ID
- backend sends server event with same ID
- order total updates from 349 to 448 etc.

Use a separate event ID:

```txt
twz_<uuid>_upsell_accepted
```

## Privacy And Policy

Privacy page must mention:

- cookies
- analytics
- ads pixels
- order data
- phone used for order confirmation
- data shared with advertising platforms for measurement where applicable

Do not collect medical history.

Do not ask "Do you have diabetes?" in checkout.

## QA Checklist

Before launch:

- Meta Pixel Helper shows events.
- Meta Events Manager shows browser/server dedup.
- TikTok Pixel Helper shows events.
- TikTok Events Manager receives Events API.
- Google Tag Assistant sees conversion.
- Browser order event ID equals server event ID.
- Phone hash inputs differ correctly:
  - Meta: `2126...` hashed
  - TikTok: `+2126...` hashed
- Page is usable if ad blockers block pixels.
- Missing pixel env vars no-op safely.
