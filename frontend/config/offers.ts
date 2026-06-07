export const HERO_OFFERS = [
  {
    id: "one",
    qty: 1,
    priceMad: 199,
    label: "تجربة 30 يوم",
    sublabel: "1 عبوة",
    savings: null,
    badge: null,
    default: false,
  },
  {
    id: "two",
    qty: 2,
    priceMad: 299,
    label: "عرض العائلة",
    sublabel: "2 عبوات",
    savings: "وفر 99 درهم",
    badge: null,
    default: false,
  },
  {
    id: "three",
    qty: 3,
    priceMad: 349,
    label: "عرض 3 عبوات",
    sublabel: "3 عبوات",
    savings: "وفر 248 درهم",
    badge: "الأكثر طلباً · أفضل قيمة",
    default: true,
  },
] as const;

export type OfferId = (typeof HERO_OFFERS)[number]["id"];
