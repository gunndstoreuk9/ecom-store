# COD Operations And Confirmation Playbook

## Why This Matters

For Morocco COD, profit is decided after the customer submits the order.

The website must create desire and trust. The operations process must turn leads into delivered orders.

Main risks:

- fake numbers
- no-answer leads
- buyer remorse
- unclear total
- address mistakes
- refusal at door

## Checkout Strategy

Public checkout asks only:

- name
- phone

Reason:

- reduce friction
- maximize lead capture
- let a human collect address after trust is built

The thank-you page and confirmation script must clearly say:

**سنتصل بك لتأكيد العنوان قبل الشحن.**

## Immediate WhatsApp Message

If WhatsApp automation is configured, send this within 1-5 minutes:

```txt
السلام عليكم {name}، شكراً لطلبك من تَوازُن للصحة.

طلبك: {items}
المجموع: {total} درهم
الدفع: عند الاستلام

غادي نتاصلو بك باش نأكدو العنوان قبل الإرسال.
إلى كان عندك أي سؤال، جاوبنا هنا فواتساب.
```

## Confirmation Call Timing

Target:

- call within 30 minutes during working hours
- if outside working hours, WhatsApp immediately and call next morning

Call attempts:

1. call
2. WhatsApp message
3. second call after 2-4 hours
4. final next-day call

Statuses:

- `confirmation_pending`
- `confirmed`
- `no_answer`
- `cancelled`

## Confirmation Call Script

Arabic/Darija:

```txt
السلام عليكم، معك فريق تَوازُن للصحة.
بغينا نأكدو الطلب ديالك: {offer_name} بـ {total} درهم، والدفع غير عند الاستلام.

واش الطلب مؤكد؟
شنو المدينة والعنوان بالتفصيل؟
واش رقم الهاتف هذا هو اللي غادي يبقى مفتوح مع الموصّل؟
```

If confirmed:

```txt
مزيان. الطلب غادي يتجهز، وغادي نرسل لك رسالة فيها التفاصيل.
من فضلك خلي الهاتف مفتوح ومبلغ {total} درهم واجد عند الاستلام.
```

## Upsell During Confirmation

Only offer if customer is warm and not confused.

Script:

```txt
حيت اخترت كور التوازن، نقدر نضيف لك منتج دعم الرغبة في الحلويات مع نفس الطلب. يساعد الناس اللي كيعانيو مع الحلوة. الثمن ديالو {price} درهم، واش نضيفو؟
```

Do not pressure elderly buyers. Keep trust higher than AOV.

## Address Capture

Collect:

- city
- neighborhood
- street/address
- nearby landmark
- preferred delivery time if needed

Store internally if admin endpoint exists. For MVP, include in sheet manually after confirmation.

## Pre-Delivery Reminder

Send morning of delivery:

```txt
السلام عليكم {name}.
طلب تَوازُن غادي يكون فالتوصيل اليوم أو قريباً حسب المدينة.
المرجو إبقاء الهاتف مفتوح وتجهيز مبلغ {total} درهم للدفع عند الاستلام.
```

## Refusal Reduction

The site and confirmation process must repeat:

- exact total
- COD
- product name
- offer quantity
- expected call
- no card payment

Avoid:

- hidden delivery fees
- confusing upsell totals
- overpromising results
- shipping before phone confirmation

## Sheet Status Workflow

Google Sheet status values:

- `new`
- `upsell_pending`
- `confirmation_pending`
- `confirmed`
- `no_answer`
- `cancelled`
- `shipped`
- `delivered`
- `returned`

Use color formatting in the sheet later if desired.

## Daily Metrics

Track:

- orders submitted
- valid phone rate
- confirmation rate
- no-answer rate
- cancellation rate
- shipped orders
- delivered orders
- returned/refused orders
- AOV
- upsell take rate
- CPA by channel

Healthy targets:

- valid phone rate: 85%+
- confirmation rate: 70%+
- delivery rate: 70%+
- return/refusal rate: under 20-25%
- upsell take rate: 15-30%

## Customer Trust Rules

- Never lie about medical results.
- Never claim guaranteed cure.
- Never pressure someone who says they are taking medication.
- Encourage doctor consultation for people on sugar medication.
- Be clear this is a supplement.
- Keep support human and respectful.
