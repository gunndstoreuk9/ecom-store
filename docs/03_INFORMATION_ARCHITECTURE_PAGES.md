# Information Architecture And Page Specs

## Routes

Frontend routes:

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Brand positioning, hero offer, trust, product intro, social proof |
| `/products/american-sugar-balance-complex` | Product landing page | Main paid-traffic conversion page |
| `/collections` | Collection page | Branded catalog shell, currently focused on one hero product |
| `/about` | About us | Founder story, authority, mission, trust |
| `/contact` | Contact us | WhatsApp, phone, email, policies |
| `/thank-you` | Thank you | Final order summary and next steps |
| `/privacy-policy` | Privacy policy | Tracking/data compliance |
| `/terms` | Terms | Basic store terms |
| `/return-policy` | Return policy | 30-day guarantee rules |

No `/cart` page. Cart is a global drawer.

## Global Layout

### Top Trust Strip

Arabic RTL strip above header:

**🇲🇦 الدفع عند الاستلام · 🇺🇸 مستورد من أمريكا · ضمان 30 يوم**

On mobile, keep it one horizontal scrolling row.

### Header

Desktop RTL order:

1. Right: logo lockup with `N` circle, Arabic logo, English subline.
2. Center/right: menu links.
3. Left: cart button with badge.

Menu:

- الرئيسية
- المنتج
- العروض
- من نحن
- تواصل معنا

Mobile:

- logo on right
- cart on left
- hamburger near cart or right after logo
- sticky bottom CTA on product pages

### Footer

Footer columns:

- Brand: short mission + logo.
- Shop: product, offers, collection.
- Support: contact, WhatsApp, return policy, privacy, terms.
- Trust: COD, guarantee, supplement disclaimer, domain.

Footer disclaimer:

**مكمّل غذائي، ليس دواءً ولا يقصد به تشخيص أو علاج أو شفاء أو منع أي مرض.**

## Home Page Structure

Goal: make Tawazon feel like a real brand before pushing the offer.

Sections:

1. Hero brand section  
   Text on right, sample product/hero image on left. Show product bottle placeholder, Moroccan customer image placeholder, flags, CTA.

2. Trust badges  
   USA, GMP, Non-GMO, COD, 30-day guarantee, support.

3. Problem mirror  
   Darija pain bullets and emotional reassurance.

4. Brand mechanism intro  
   Tawazon Balance Matrix with 3 cards.

5. Product feature block  
   Text on left, image on right. Introduce the hero product and default 3-pack offer.

6. Ingredients/science preview  
   6 ingredient cards.

7. Social proof preview  
   Stars, review cards, WhatsApp screenshot placeholders.

8. Authority section  
   Pharmacist/doctor placeholder, COA/Halal placeholder slots.

9. Offer block  
   1/2/3 pack selector, 3-pack default.

10. FAQ preview  
   Top 4 questions.

11. Final CTA  
   Strong COD reassurance and button opens cart drawer.

## Product Landing Page Structure

This is the main conversion page for Facebook/TikTok/YouTube traffic.

Section order:

1. Sticky trust strip.
2. Product hero: headline, subheading, star row, badges, offer CTA, sample image.
3. Offer selector above fold on desktop; slightly below fold on mobile.
4. Problem agitation: "ماشي ضعف إرادة".
5. Education: how sugar becomes energy using the insulin key story.
6. Tawazon Balance Matrix: 3 levers.
7. Ingredient science: cards and visual matrix.
8. Authority: manufacturing/certificates and real expert review.
9. Social proof: reviews, UGC placeholders, WhatsApp screenshots.
10. Comparison table: Tawazon vs random marketplace vs doing nothing.
11. How to use: simple routine.
12. Offer block repeated: 1/2/3 pack, default 3-pack.
13. Guarantee and COD reassurance.
14. FAQ: all objections.
15. Final CTA with sticky mobile buy bar.

Desktop layout rhythm:

- Alternate image/text sides section by section.
- Section 1: text right, image left.
- Section 2: image right, text left.
- Section 3: text right, visual left.
- Keep this alternation where it improves scan flow.

Mobile:

- Single column.
- CTA within first 600px.
- Sticky bottom buy bar after user scrolls past hero.

## Collection Page

Even though there is one hero product now, the collection page must make the brand feel bigger.

Content:

- Header: **منتجات تَوازُن للصحة**
- Subheading: **منتجات مختارة بعناية لدعم التوازن، الطاقة، وروتين صحي يومي**
- Product card for hero product.
- "قريباً" cards for cross-sells but not clickable unless products exist.

Hero product card:

- Image placeholder.
- Name: **المركّب الأمريكي لضبط السكر — الأصلي**
- Stars row.
- Subheading: **20 مكوّن نشط لدعم توازن السكر والطاقة**
- Price anchor: **ابتداءً من 199 درهم**
- Badge: **الأكثر طلباً**
- CTA: **شاهد العرض**

## About Page

Goal: trust and premium brand story.

Sections:

1. Founder mission:
   **بدأت تَوازُن من فكرة بسيطة: المغاربة يستحقون منتجات دعم صحي مفهومة، موثوقة، وواضحة.**

2. Why sugar balance:
   Family-oriented story without disease claims.

3. Our standards:
   Ingredient transparency, supplier documentation, COD, real support.

4. Promise:
   No fake miracle, no hidden fees, no payment before delivery.

5. Authority placeholders:
   Expert reviewer, certificates, lab docs.

6. CTA:
   Go to product offer.

## Contact Page

Must include:

- WhatsApp button.
- Phone number placeholder from env/content config.
- Email: `contact@tawazonhealth.store`.
- Hours: Moroccan local time.
- COD explanation.
- Simple contact form optional, but not required for MVP.

Copy:

**عندك سؤال قبل الطلب؟ تواصل معنا عبر واتساب. فريقنا يشرح لك طريقة الاستعمال، العرض المناسب، وخطوات التوصيل.**

## Thank You Page

Goal: reduce cancellation and prepare customer for confirmation call.

Sections:

1. Success headline:
   **تم تسجيل طلبك بنجاح**

2. Order summary:
   Hero offer, upsell if accepted, total MAD.

3. Next steps:
   - سنتصل بك لتأكيد الطلب.
   - جهز الهاتف للرد.
   - الدفع فقط عند الاستلام.

4. Trust reminder:
   COD, support, guarantee.

5. WhatsApp CTA:
   **راسلنا على واتساب**

6. Optional cross-sell at full price after thank-you only if backend supports order patching. The 99 MAD discount must not appear here unless it is still the same timed post-submit offer state.

## Image Placeholders

Create reusable placeholder components for:

- product bottle on blue background
- Moroccan woman/man customer
- certificate document
- WhatsApp testimonial screenshot
- ingredient macro photo
- package/unboxing
- pharmacist/doctor portrait

All placeholders must be easy to replace later from `/public/images`.
